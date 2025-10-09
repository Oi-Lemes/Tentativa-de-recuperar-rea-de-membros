// Cole este código completo no ficheiro: frontend/src/components/ChatbotNina.tsx
"use client";

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function ChatbotNina() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Efeito para rolar para a última mensagem
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: input }] };
    setHistory(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: history, message: input }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let modelResponse = '';

      // Adiciona um placeholder para a resposta do modelo
      setHistory(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        modelResponse += chunk;
        
        // Atualiza a última mensagem (a do modelo) em tempo real
        setHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1].parts[0].text = modelResponse;
          return newHistory;
        });
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setHistory(prev => [...prev, { role: 'model', parts: [{ text: 'Desculpe, ocorreu um erro.' }] }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      {/* Janela de Chat */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 h-[28rem] bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50">
          {/* Cabeçalho */}
          <div className="bg-gray-900 p-3 flex justify-between items-center rounded-t-lg">
            <h3 className="font-bold text-white">Nina, sua Herbalista</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white text-2xl leading-none">&times;</button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {history.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-200'
                }`}>
                  {msg.parts[0].text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-2 border-t border-gray-700">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre ervas..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>
        </div>
      )}

      {/* Botão/Ícone para abrir o chat */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 z-50 text-2xl"
      >
        🌿
      </button>
    </>
  );
}