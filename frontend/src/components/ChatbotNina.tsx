// Caminho: frontend/src/components/ChatbotNina.tsx
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

// --- ÍCONES ---
const MicrophoneIcon = ({ isRecording }: { isRecording: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isRecording ? 'text-red-500 animate-pulse' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
);
const PlayAudioIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
);

// --- TIPOS ---
type Message = {
    role: 'user' | 'assistant';
    text: string;
};

const suggestedQuestions = [
    "Como posso fazer tinturas?",
    "Fale sobre o Módulo 4",
    "Qual a próxima live?",
];

export default function ChatbotNina() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', text: "Olá! Sou a Nina. Como posso ajudar?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const playAudio = (text: string) => {
        const cleanText = text.replace(/[*_~`]/g, ''); // Remove a formatação para o áudio
        const audio = new Audio(`/api/tts?text=${encodeURIComponent(cleanText)}`);
        audio.play();
    };
    
    const handleSuggestedQuestion = (question: string) => {
        handleSubmit(undefined, question);
    };

    const sendAudioToApi = async (audioBlob: Blob) => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        try {
            const response = await fetch('/api/stt', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Falha ao transcrever o áudio.');
            const data = await response.json();
            await handleSubmit(undefined, data.text);
        } catch (error) {
            console.error("Erro ao enviar áudio:", error);
            const errorMessage: Message = { role: 'assistant', text: "Desculpe, tive um problema ao processar o seu áudio." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            // O handleSubmit já vai gerir o isLoading
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
                mediaRecorder.onstop = () => sendAudioToApi(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
                mediaRecorder.start();
                setIsRecording(true);
            } catch (error) {
                console.error("Erro ao aceder ao microfone:", error);
                alert("Não foi possível aceder ao microfone.");
            }
        }
    };

    const handleSubmit = async (e?: FormEvent, messageTextOverride?: string) => {
        if (e) e.preventDefault();
        const messageText = messageTextOverride || input;
        if (!messageText.trim()) return;

        const userMessage: Message = { role: 'user', text: messageText };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ history: messages, message: messageText }),
            });

            if (!response.ok) throw new Error('Falha na resposta da API');
            const data = await response.json();
            const assistantMessage: Message = { role: 'assistant', text: data.text };
            setMessages([...newMessages, assistantMessage]);
        } catch (error) {
            console.error("Erro ao comunicar com a API de chat:", error);
            const errorMessage: Message = { role: 'assistant', text: "Desculpe, não consigo responder agora." };
            setMessages([...newMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <>
            <button onClick={() => setIsOpen(prev => !prev)} className="fixed bottom-4 right-4 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-50 text-2xl" style={{ backgroundColor: '#a45785' }}>
                🌿
            </button>

            <div className={`fixed bottom-0 right-0 h-[75vh] w-full bg-gray-800 shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-in-out md:bottom-20 md:right-4 md:w-80 md:h-[500px] md:rounded-lg ${isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}>
                <div className="bg-gray-900 p-3 flex justify-between items-center rounded-t-lg flex-shrink-0">
                    <h3 className="font-bold text-white">Nina, a sua Herbalista</h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white text-2xl leading-none">&times;</button>
                </div>

                <div ref={chatContainerRef} className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                    <Image src="/avatar-nina.png" alt="Avatar da Nina" width={32} height={32} />
                                </div>
                            )}
                            <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                <ReactMarkdown className="prose prose-sm prose-invert">{msg.text}</ReactMarkdown>
                            </div>
                            {msg.role === 'assistant' && index > 0 && (
                                <button onClick={() => playAudio(msg.text)} className="text-gray-400 hover:text-white transition-colors flex-shrink-0"><PlayAudioIcon /></button>
                            )}
                        </div>
                    ))}
                    
                    {messages.length === 1 && (
                        <div className="flex flex-col gap-2 mt-4">
                            {suggestedQuestions.map((q, i) => (
                                <button key={i} onClick={() => handleSuggestedQuestion(q)} className="bg-gray-700/50 text-left text-sm text-gray-300 p-2 rounded-md border border-gray-600 hover:bg-gray-700 transition-colors">
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex items-end gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                <Image src="/avatar-nina.png" alt="Avatar da Nina" width={32} height={32} />
                            </div>
                            <div className="p-3 rounded-lg bg-gray-700 text-gray-400 text-sm italic">
                                Nina está a pensar...
                            </div>
                        </div>
                    )}
                </div>
                
                <form onSubmit={handleSubmit} className="p-4 bg-gray-900 flex items-center rounded-b-lg">
                    <button type="button" onClick={handleToggleRecording} disabled={isLoading} className="mr-2 p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50"><MicrophoneIcon isRecording={isRecording} /></button>
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={isRecording ? "A gravar..." : "Digite a sua dúvida..."} disabled={isLoading || isRecording} className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="submit" disabled={isLoading || isRecording} className="ml-2 p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                </form>
            </div>
        </>
    );
}