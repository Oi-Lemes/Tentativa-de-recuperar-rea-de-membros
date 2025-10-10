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
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);

    const ws = useRef<WebSocket | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const chatContainerRef = useRef<HTMLDivElement | null>(null);
    const supportedMimeType = useRef<string | null>(null);

    useEffect(() => {
        supportedMimeType.current = getSupportedMimeType();
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isSpeaking]);

    const disconnect = () => {
        console.log("A desligar a ligação...");
        if (mediaRecorder.current?.state === "recording") {
            mediaRecorder.current.stop();
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        ws.current?.close();
        setStatus('idle');
    };

    const connect = async () => {
        if (status === 'connected' || status === 'connecting') return;

        setMessages([]);
        setStatus('connecting');

        try {
            if (!supportedMimeType.current) throw new Error("Gravação não suportada.");
            
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            ws.current = new WebSocket('ws://localhost:3001');

            ws.current.onopen = () => {
                console.log("WebSocket Conectado!");
                setStatus('connected');
                
                mediaRecorder.current = new MediaRecorder(streamRef.current!, { mimeType: supportedMimeType.current! });
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
                    const message = JSON.parse(event.data);
                    if (message.type === 'user_transcript') {
                        setMessages(prev => [...prev, { role: 'user', text: message.text }]);
                    } else if (message.type === 'assistant_response') {
                         if (audioPlayerRef.current) {
                            const addAssistantMessage = () => {
                                setMessages(prev => [...prev, { role: 'assistant', text: message.text }]);
                                setIsSpeaking(false);
                                audioPlayerRef.current?.removeEventListener('ended', addAssistantMessage);
                            };
                            audioPlayerRef.current.addEventListener('ended', addAssistantMessage);
                         }
                    }
                }
            };

            ws.current.onclose = () => {
                console.log("WebSocket Desconectado.");
                // Assegura que o estado seja 'idle' se a conexão for fechada por qualquer motivo
                if (status !== 'idle') {
                    disconnect();
                }
            };
            ws.current.onerror = (err) => {
                console.error("WebSocket Error:", err);
                disconnect();
                setStatus('error');
            };

        } catch (error) {
            console.error("Erro ao iniciar ligação:", error);
            alert("Não foi possível aceder ao microfone.");
            setStatus('error');
        }
    };

    const handleToggleConversation = () => {
        if (status === 'connected' || status === 'connecting') {
            disconnect();
        } else {
            connect();
        }
    };

    const handleCameraClick = () => alert("Funcionalidade de análise de imagem a ser implementada!");
    
    const getButtonState = () => {
        if (status === 'connecting') return { text: "A ligar...", color: "bg-yellow-500", disabled: true };
        if (status === 'connected') return { text: "Terminar Conversa", color: "bg-red-500 hover:bg-red-600", disabled: false };
        if (status === 'error') return { text: "Erro. Tentar novamente?", color: "bg-gray-500 hover:bg-gray-600", disabled: false };
        return { text: "Falar com a Nina", color: "bg-blue-600 hover:bg-blue-700" };
    };
    const buttonState = getButtonState();

    return (
        <>
            <audio ref={audioPlayerRef} className="hidden" />
            <button onClick={() => setIsOpen(prev => !prev)} className="fixed bottom-4 right-4 bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 z-50 text-2xl">
                🌿
            </button>

            {isOpen && (
                <div className="fixed bottom-20 right-4 w-80 h-[500px] bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50">
                    <div className="bg-gray-900 p-3 flex justify-between items-center rounded-t-lg flex-shrink-0">
                        <h3 className="font-bold text-white">Nina, a sua Herbalista</h3>
                        <button onClick={() => { disconnect(); setIsOpen(false); }} className="text-gray-300 hover:text-white text-2xl leading-none">&times;</button>
                    </div>

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
                                    <div className="flex items-center space-x-1">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-2 bg-gray-900 flex items-center justify-between rounded-b-lg">
                        <button onClick={handleCameraClick} className="text-gray-400 hover:text-white p-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        
                        <button 
                            onClick={handleToggleConversation}
                            disabled={buttonState.disabled}
                            className={`px-6 py-3 rounded-md font-bold text-white transition-colors ${buttonState.color}`}
                        >
                            {buttonState.text}
                        </button>

                        <div className="w-12"></div> {/* Espaço para alinhar o botão central */}
                    </div>
                </div>
            )}
        </>
    );
}