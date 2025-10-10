// Caminho: frontend/src/components/ChatbotNina.tsx
"use client";

import { useState, useRef, useEffect } from 'react';

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

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
            mediaRecorder.current.onstop = () => {
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send("EOM"); // End Of Message
                }
                streamRef.current?.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.current.stop();
        }
        setIsRecording(false);
    };
    
    const startRecording = async () => {
        if (isRecording || !getSupportedMimeType()) return;
        setMessages([]); 

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            ws.current = new WebSocket('ws://localhost:3001');
            
            ws.current.onopen = () => {
                console.log("WebSocket Conectado, a iniciar gravação...");
                setIsRecording(true);
                
                mediaRecorder.current = new MediaRecorder(streamRef.current!, { mimeType: getSupportedMimeType()! });
                
                mediaRecorder.current.ondataavailable = (event) => {
                    if (event.data.size > 0 && ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(event.data);
                    }
                };
                mediaRecorder.current.start(250);
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
                        const message: { type: string, text: string } = JSON.parse(event.data);
                        if (message.type === 'user_transcript') {
                            setMessages(prev => [...prev, { role: 'user', text: message.text }]);
                        } else if (message.type === 'assistant_response') {
                             if (audioPlayerRef.current) {
                                const addAssistantMessage = () => {
                                    setMessages(prev => [...prev, { role: 'assistant', text: message.text }]);
                                    setIsSpeaking(false);
                                    // Remove o listener para não ser chamado novamente por outros áudios
                                    audioPlayerRef.current?.removeEventListener('ended', addAssistantMessage);
                                };
                                audioPlayerRef.current.addEventListener('ended', addAssistantMessage);
                             }
                        }
                    } catch (error) {
                        console.error("Erro ao processar mensagem de texto:", error);
                    }
                }
            };

            ws.current.onclose = () => {
                console.log("WebSocket Desconectado.");
                setIsRecording(false);
                streamRef.current?.getTracks().forEach(track => track.stop());
            };
            ws.current.onerror = (err) => console.error("WebSocket Error:", err);

        } catch (error) {
            console.error("Erro ao iniciar gravação:", error);
            alert("Não foi possível aceder ao microfone. Verifique as permissões.");
            setIsRecording(false);
        }
    };

    const handleCameraClick = () => {
        alert("Funcionalidade de análise de imagem a ser implementada!");
    };
    
    const disconnectAndCloseWindow = () => {
        if (ws.current) {
            ws.current.close();
        }
        setIsOpen(false);
        setIsRecording(false);
    };

    return (
        <>
            <audio ref={audioPlayerRef} className="hidden" />
            <button onClick={() => setIsOpen(prev => !prev)} className="fixed bottom-4 right-4 bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 z-50 text-2xl">
                🌿
            </button>

            {isOpen && (
                <div className="fixed bottom-20 right-4 w-80 h-[500px] bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50">
                    {/* Cabeçalho */}
                    <div className="bg-gray-900 p-3 flex justify-between items-center rounded-t-lg flex-shrink-0">
                        <h3 className="font-bold text-white">Nina, a sua Herbalista</h3>
                        <button onClick={disconnectAndCloseWindow} className="text-gray-300 hover:text-white text-2xl leading-none">&times;</button>
                    </div>

                    {/* Corpo do Chat */}
                    <div ref={chatContainerRef} className="flex-1 p-4 space-y-4 overflow-y-auto">
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
                                    {/* Animação de "a digitar" */}
                                    <div className="flex items-center space-x-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rodapé com Ícones */}
                    <div className="p-2 bg-gray-900 flex items-center justify-between rounded-b-lg">
                        <button onClick={handleCameraClick} className="text-gray-400 hover:text-white p-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        
                        <button 
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                            onTouchEnd={stopRecording}
                            className={`p-4 rounded-full transition-transform duration-200 ${isRecording ? 'bg-red-500 scale-110' : 'bg-blue-600'}`}
                        >
                            <svg className={`w-6 h-6 text-white`} fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z"/><path d="M5.5 11.5a5.5 5.5 0 1011 0v-6a5.5 5.5 0 10-11 0v6zM10 20a1 1 0 001-1v-2.065a8.45 8.45 0 005.657-3.238 1 1 0 00-1.58-1.22A6.5 6.5 0 0110 15a6.5 6.5 0 01-4.077-1.523 1 1 0 00-1.58 1.22A8.45 8.45 0 009 16.935V9a1 1 0 001 1z"/></svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}