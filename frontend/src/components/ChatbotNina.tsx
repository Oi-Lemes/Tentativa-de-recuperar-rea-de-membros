// Caminho: frontend/src/components/ChatbotNina.tsx
"use client";

import { useState, useRef, useEffect } from 'react';

type Message = {
    role: 'user' | 'assistant';
    text: string;
};

export default function ChatbotNina() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    // Efeito para rolar para a última mensagem
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // A API de chat já existe e pode ser reutilizada
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    history: messages, // Envia o histórico para dar contexto à IA
                    message: input,
                }),
            });

            if (!response.ok) {
                throw new Error('Falha na resposta da API');
            }

            const data = await response.json();
            const assistantMessage: Message = { role: 'assistant', text: data.text };
            setMessages(prev => [...prev, assistantMessage]);

        } catch (error) {
            console.error("Erro ao comunicar com a API de chat:", error);
            const errorMessage: Message = { role: 'assistant', text: "Desculpe, não consigo responder agora. Tente novamente mais tarde." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
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
                <div className="fixed bottom-0 right-0 h-[75vh] w-full bg-gray-800 shadow-2xl flex flex-col z-50
                                md:bottom-20 md:right-4 md:w-80 md:h-[500px] md:rounded-lg">
                    
                    <div className="bg-gray-900 p-3 flex justify-between items-center rounded-t-lg flex-shrink-0">
                        <h3 className="font-bold text-white">Nina, a sua Herbalista</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white text-2xl leading-none">&times;</button>
                    </div>

                    <div ref={chatContainerRef} className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {messages.length === 0 && (
                             <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                                <p>Olá! Sou a Nina. Como posso ajudar com suas dúvidas sobre ervas e plantas medicinais?</p>
                            </div>
                        )}
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                    {msg.text}
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
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Digite a sua dúvida..."
                            disabled={isLoading}
                            className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="ml-2 p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-500"
                        >
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