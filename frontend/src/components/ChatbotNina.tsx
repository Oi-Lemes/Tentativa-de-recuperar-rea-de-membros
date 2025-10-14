// Caminho: frontend/src/components/ChatbotNina.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';

type Message = {
    role: 'user' | 'assistant';
    text: string;
};

const getSupportedMimeType = () => {
    const types = ['audio/webm; codecs=opus', 'audio/ogg; codecs=opus', 'audio/webm'];
    if (typeof MediaRecorder === 'undefined') return null;
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return null;
};

export default function ChatbotNina() {
    const [isOpen, setIsOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    
    const ws = useRef<WebSocket | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const chatContainerRef = useRef<HTMLDivElement | null>(null);
    
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isSpeaking]);

    const disconnect = useCallback(() => {
        if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
            mediaRecorder.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        mediaRecorder.current = null;
        setIsRecording(false);
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
            mediaRecorder.current.stop();
        }
    }, []);
    
    const startRecording = useCallback(async () => {
        if (isRecording || !getSupportedMimeType()) return;

        setMessages([]); 

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
            if (!backendUrl) {
                console.error("URL do backend não está configurada!");
                alert("A configuração do servidor não foi encontrada.");
                return;
            }
            const wsUrl = backendUrl.replace(/^http/, 'ws');
            
            ws.current = new WebSocket(wsUrl);
            
            ws.current.onopen = () => {
                const mimeType = getSupportedMimeType()!;
                const recorder = new MediaRecorder(streamRef.current!, { mimeType });
                mediaRecorder.current = recorder;
                
                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0 && ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(event.data);
                    }
                };

                recorder.onstop = () => {
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send("EOM");
                    }
                    streamRef.current?.getTracks().forEach(track => track.stop());
                    setIsRecording(false);
                };

                recorder.start(250);
                setIsRecording(true);
            };

            ws.current.onmessage = (event) => {
                if (event.data instanceof Blob) {
                    setIsSpeaking(true);
                    const audioUrl = URL.createObjectURL(event.data);
                    if (audioPlayerRef.current) {
                        audioPlayerRef.current.src = audioUrl;
                        audioPlayerRef.current.play();
                    }
                } else {
                    try {
                        const message = JSON.parse(event.data);
                        if (message.type === 'user_transcript') {
                            setMessages(prev => [...prev, { role: 'user', text: message.text }]);
                        } else if (message.type === 'assistant_response') {
                             if (audioPlayerRef.current) {
                                const addAssistantMessageOnEnd = () => {
                                    setMessages(prev => [...prev, { role: 'assistant', text: message.text }]);
                                    setIsSpeaking(false);
                                    audioPlayerRef.current?.removeEventListener('ended', addAssistantMessageOnEnd);
                                };
                                audioPlayerRef.current.addEventListener('ended', addAssistantMessageOnEnd);
                             }
                        }
                    } catch (error) {
                        console.error("Erro ao processar mensagem de texto do backend:", error);
                    }
                }
            };

            ws.current.onclose = () => { setIsRecording(false); };
            ws.current.onerror = (err) => { console.error("CLIENTE: WebSocket Error:", err); setIsRecording(false); };

        } catch (error) {
            alert("Não foi possível aceder ao microfone. Verifique as permissões.");
            setIsRecording(false);
        }
    }, [isRecording]);

    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };
    
    return (
        <>
            <audio ref={audioPlayerRef} className="hidden" onEnded={() => setIsSpeaking(false)} />
            <button 
                onClick={() => setIsOpen(prev => !prev)} 
                className="fixed bottom-4 right-4 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-50 text-2xl"
                style={{ backgroundColor: '#a45785' }}
            >
                🌿
            </button>

            {isOpen && (
                // Container do Chatbot com classes responsivas
                <div className="fixed bottom-0 right-0 h-[75vh] w-full bg-gray-800 shadow-2xl flex flex-col z-50
                                md:bottom-20 md:right-4 md:w-80 md:h-[500px] md:rounded-lg">
                    
                    <div className="bg-gray-900 p-3 flex justify-between items-center rounded-t-lg flex-shrink-0">
                        <h3 className="font-bold text-white">Nina, a sua Herbalista</h3>
                        <button onClick={() => { disconnect(); setIsOpen(false); }} className="text-gray-300 hover:text-white text-2xl leading-none">&times;</button>
                    </div>

                    <div ref={chatContainerRef} className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {messages.length === 0 && !isRecording && (
                             <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                                <svg className="w-16 h-16 mb-4" viewBox="0 0 76 76" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g><path d="M38,51.3c5,0,9-4,9-9V21.5c0-5-4-9-9-9s-9,4-9-9v20.8C29,47.3,33,51.3,38,51.3z M32,21.5c0-3.3,2.7-6,6-6s6,2.7,6,6v20.8   c0,3.3-2.7,6-6,6s-6-2.7-6-6V21.5z M50.4,42.3c0,6.6-5.4,12-12,12s-12-5.4-12-12h-3c0,7.8,6,14.2,13.5,14.9v7.1h3v-7.1   c7.5-0.7,13.5-7,13.5-14.9H50.4z" /></g></svg>
                                <p>Clique no microfone para falar.</p>
                            </div>
                        )}
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isSpeaking && (
                            <div className="flex justify-start">
                                <div className="p-3 rounded-lg bg-gray-700">
                                    <div className="flex items-center space-x-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 bg-gray-900 flex items-center justify-between rounded-b-lg">
                        <button 
                            onClick={handleMicClick}
                            className={`p-3 rounded-full transition-colors duration-200 ${
                                isRecording 
                                ? 'bg-red-500 animate-pulse' 
                                : 'bg-blue-600'
                            }`}
                        >
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 14C13.6569 14 15 12.6569 15 11V5C15 3.34315 13.6569 2 12 2C10.3431 2 9 3.34315 9 5V11C9 12.6569 10.3431 14 12 14Z" />
                                <path d="M18 11C18 14.3137 15.3137 17 12 17C8.68629 17 6 14.3137 6 11H4C4 15.4183 7.58172 19 12 19V22H13V19C17.4183 19 21 15.4183 21 11H18Z" />
                            </svg>
                        </button>

                        <button 
                            onClick={() => alert("Funcionalidade de análise de imagem a ser implementada!")} 
                            className="p-3 text-gray-400 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}