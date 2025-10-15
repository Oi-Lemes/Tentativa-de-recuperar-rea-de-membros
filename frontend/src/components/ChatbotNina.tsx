// Caminho: frontend/src/components/ChatbotNina.tsx
"use client";

import { useState, useRef, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

// --- TIPOS ---
type Message = {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    feedback?: 'like' | 'dislike' | null;
};

// --- ÍCONES ---
const MicrophoneIcon = ({ isRecording }: { isRecording: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-500 dark:text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const ClearIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const ThumbsUpIcon = ({ selected }: { selected: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${selected ? 'text-blue-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.085a2 2 0 00-1.736.93L5.5 8m7 2H5.5" />
    </svg>
);

const ThumbsDownIcon = ({ selected }: { selected: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${selected ? 'text-red-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.085a2 2 0 001.736-.93l2.5-4.5M17 14h-2.5" />
    </svg>
);


// --- COMPONENTE PRINCIPAL ---
export default function ChatbotNina() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
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
        const audio = new Audio(`/api/tts?text=${encodeURIComponent(text)}`);
        audio.play();
    };

    const handleClearChat = () => {
        setMessages([]);
    };
    
    const handleFeedback = (messageId: number, feedback: 'like' | 'dislike') => {
        setMessages(messages.map(msg => 
            msg.id === messageId ? { ...msg, feedback } : msg
        ));
        // TODO: Enviar o feedback para o backend para análise
        console.log(`Feedback para a mensagem ${messageId}: ${feedback}`);
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
            const errorMessage: Message = { id: Date.now(), role: 'assistant', text: "Desculpe, tive um problema ao processar o seu áudio." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
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

    const handleSubmit = async (e?: FormEvent, transcribedText?: string) => {
        if (e) e.preventDefault();
        const messageText = transcribedText || input;
        if (!messageText.trim() || isLoading) return;

        const userMessage: Message = { id: Date.now(), role: 'user', text: messageText };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    history: messages.map(({role, text}) => ({role, text})),
                    message: messageText,
                }),
            });

            if (!response.ok) throw new Error('Falha na resposta da API');

            const data = await response.json();
            const assistantMessage: Message = { 
                id: Date.now() + 1, 
                role: 'assistant', 
                text: data.text,
                feedback: null
            };
            setMessages([...newMessages, assistantMessage]);
            playAudio(data.text);

        } catch (error) {
            console.error("Erro ao comunicar com a API de chat:", error);
            const errorMessage: Message = { id: Date.now() + 1, role: 'assistant', text: "Desculpe, não consigo responder agora.", feedback: null };
            setMessages([...newMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <>
            <button 
                onClick={() => setIsOpen(prev => !prev)} 
                className="fixed bottom-4 right-4 bg-[#a45785] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-50 text-2xl"
            >
                🌿
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                        className="fixed bottom-0 right-0 h-[75vh] w-full bg-white/80 backdrop-blur-lg dark:bg-gray-800/80 shadow-2xl flex flex-col z-50 md:bottom-20 md:right-4 md:w-96 md:h-[600px] md:rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                        <div className="bg-gray-50 dark:bg-gray-900/70 p-4 flex items-center rounded-t-xl flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
                            <img src="/avatar-nina.png" alt="Nina" className="w-10 h-10 rounded-full mr-3" />
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white">Nina, a sua Herbalista</h3>
                                <p className="text-xs text-green-500 flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                                    Online
                                </p>
                            </div>
                            <div className="ml-auto flex items-center space-x-2">
                                <button onClick={handleClearChat} title="Limpar conversa" className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                    <ClearIcon />
                                </button>
                                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl leading-none">&times;</button>
                            </div>
                        </div>

                        <div ref={chatContainerRef} className="flex-1 p-4 space-y-4 overflow-y-auto">
                            {messages.length === 0 && (
                                 <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 space-y-4">
                                    <p>Olá! Sou a Nina. Como posso te ajudar hoje?</p>
                                    <div className="flex flex-col items-center space-y-2">
                                        <button onClick={() => handleSubmit(undefined, "Qual o conteúdo do Módulo 1?")} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Qual o conteúdo do Módulo 1?</button>
                                        <button onClick={() => handleSubmit(undefined, "Como faço para emitir meu certificado?")} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Como emito meu certificado?</button>
                                        <button onClick={() => handleSubmit(undefined, "Para que serve a erva cidreira?")} className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Para que serve a erva cidreira?</button>
                                    </div>
                                </div>
                            )}
                            {messages.map((msg) => (
                                <motion.div key={msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                        </div>
                                    </div>
                                    {msg.role === 'assistant' && (
                                        <div className="mt-1.5 flex items-center space-x-2">
                                            <button onClick={() => handleFeedback(msg.id, 'like')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                                                <ThumbsUpIcon selected={msg.feedback === 'like'} />
                                            </button>
                                            <button onClick={() => handleFeedback(msg.id, 'dislike')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                                                <ThumbsDownIcon selected={msg.feedback === 'dislike'} />
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                            {isLoading && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                                    <div className="p-3 rounded-2xl bg-gray-200 dark:bg-gray-700 rounded-bl-none">
                                        <div className="flex items-center space-x-2">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-3 bg-gray-50 dark:bg-gray-900/70 flex items-center rounded-b-xl border-t border-gray-200 dark:border-gray-800">
                            <button type="button" onClick={handleToggleRecording} disabled={isLoading} className="mr-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors">
                               <MicrophoneIcon isRecording={isRecording} />
                            </button>
                            <input
                                type="text"
                                value={input}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isRecording ? "A gravar... Fale agora!" : "Digite a sua dúvida..."}
                                disabled={isLoading || isRecording}
                                className="w-full px-4 py-2 text-gray-800 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="submit" disabled={!input.trim() || isLoading || isRecording} className="ml-2 p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-gray-500 transition-colors">
                               <SendIcon />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}