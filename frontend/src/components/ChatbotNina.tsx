// Caminho: frontend/src/components/ChatbotNina.tsx
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';

const MicrophoneIcon = ({ isRecording }: { isRecording: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isRecording ? 'text-red-500 animate-pulse' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

export default function ChatbotNina() {
    const [isOpen, setIsOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [courseContext, setCourseContext] = useState('');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    useEffect(() => {
        if (isOpen && !courseContext) {
            const fetchCourseContext = async () => {
                const token = localStorage.getItem('token');
                if (token && process.env.NEXT_PUBLIC_BACKEND_URL) {
                    try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/modulos`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (response.ok) {
                            const modules: any[] = await response.json();
                            const contextText = modules.map(m => 
                                `- Módulo "${m.title}": ${m.description}\n` +
                                (m.aulas && m.aulas.length > 0 ? m.aulas.map((a: any) => `  - Aula: "${a.title}"\n`).join('') : '')
                            ).join('');
                            setCourseContext(contextText);
                        }
                    } catch (e) {
                        console.error("Não foi possível buscar o contexto do curso:", e);
                    }
                }
            };
            fetchCourseContext();
        }
    }, [isOpen, courseContext]);

    const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append } = useChat({
        api: '/api/chat',
        body: {
            data: { courseContext }
        },
        onFinish: (message) => {
            playAudioStream(message.content);
        }
    });

    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const playAudioStream = async (text: string) => {
        if (!text) return;
        const audio = new Audio(`/api/tts?text=${encodeURIComponent(text)}`);
        audio.play();
    };
    
    const sendAudioAndGetText = async (audioBlob: Blob) => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        try {
            const sttResponse = await fetch('/api/stt', { method: 'POST', body: formData });
            if (!sttResponse.ok) throw new Error('Falha ao transcrever o áudio.');
            const { text } = await sttResponse.json();
            return text;
        } catch (error) {
            console.error("Erro ao enviar áudio:", error);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Desculpe, tive um problema ao processar o seu áudio." }]);
            return null;
        }
    };

    const handleToggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];
                mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const transcribedText = await sendAudioAndGetText(audioBlob);
                    if (transcribedText) {
                        append({ role: 'user', content: transcribedText });
                    }
                };
                mediaRecorder.start();
                setIsRecording(true);
            } catch (error) {
                console.error("Erro ao aceder ao microfone:", error);
                alert("Não foi possível aceder ao microfone.");
            }
        }
    };
    
    return (
        <>
            <button 
                onClick={() => setIsOpen(prev => !prev)} 
                className="fixed bottom-4 right-4 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-50 text-2xl"
                style={{ backgroundColor: '#a45785' }}
            >
                🌿
            </button>

            {isOpen && (
                <div className="fixed bottom-0 right-0 h-[75vh] w-full bg-gray-800 shadow-2xl flex flex-col z-50 md:bottom-20 md:right-4 md:w-80 md:h-[500px] md:rounded-lg">
                    <div className="bg-gray-900 p-3 flex justify-between items-center rounded-t-lg flex-shrink-0">
                        <h3 className="font-bold text-white">Nina, a sua Herbalista</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white text-2xl leading-none">&times;</button>
                    </div>

                    <div ref={chatContainerRef} className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {messages.length === 0 && (
                             <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                                <p>Olá! Sou a Nina. Como posso ajudar?</p>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                         {isLoading && (
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
                    
                    <form onSubmit={handleSubmit} className="p-4 bg-gray-900 flex items-center rounded-b-lg">
                        <button type="button" onClick={handleToggleRecording} disabled={isLoading} className="mr-2 p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                           <MicrophoneIcon isRecording={isRecording} />
                        </button>
                        <input
                            value={input}
                            onChange={handleInputChange}
                            placeholder={isRecording ? "A gravar..." : "Digite a sua dúvida..."}
                            disabled={isLoading || isRecording}
                            className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button type="submit" disabled={isLoading || isRecording} className="ml-2 p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-500">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}