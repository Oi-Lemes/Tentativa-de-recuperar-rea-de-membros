// Caminho: frontend/src/components/ChatbotNina.tsx

"use client";

import { useState, useRef, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  id: number;
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function ChatbotNina() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const playAudio = useCallback(async (text: string) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
  
      if (!response.ok) throw new Error("Falha ao gerar áudio.");
  
      const audioBlob = new Blob([await response.arrayBuffer()], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
  
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (error) {
      console.error("Erro ao tocar áudio:", error);
    }
  }, []);

  const handleSubmit = async (messageText: string) => {
    if (!messageText.trim() || isGenerating) return;

    setIsGenerating(true);
    const newUserMessage: Message = { id: Date.now(), role: 'user', parts: [{ text: messageText }] };
    
    const updatedHistory = [...history, newUserMessage];
    setHistory(updatedHistory);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: updatedHistory, message: messageText }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta da API de chat.');
      }

      const result = await response.json();
      const responseText = result.text;

      const modelMessage: Message = {
        id: Date.now(),
        role: 'model',
        parts: [{ text: responseText }],
      };
      
      setHistory(prev => [...prev, modelMessage]);
      
      await playAudio(responseText);

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      const errorMessage: Message = {
        id: Date.now(),
        role: 'model',
        parts: [{ text: 'Desculpe, ocorreu um erro.' }],
      };
      setHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("O seu navegador não suporta reconhecimento de voz.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return;
        console.error("Erro no reconhecimento de voz:", event.error);
    };
    recognition.onresult = (event: any) => {
      const finalTranscript = event.results[0][0].transcript;
      if (finalTranscript) {
        handleSubmit(finalTranscript);
      }
    };
    recognition.start();
  };
  
  return (
    <>
      <audio ref={audioRef} className="hidden" />
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 h-[28rem] bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50">
          <div className="bg-gray-900 p-3 flex justify-between items-center rounded-t-lg">
            <h3 className="font-bold text-white">Nina, sua Herbalista</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white text-2xl leading-none">&times;</button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {history.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
                }`}>
                  {msg.parts[0].text}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm">
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 border-t border-gray-700 flex items-center justify-center">
             <button type="button" onClick={handleToggleRecording} className={`p-4 rounded-full transition-colors ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}`}>
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z"/><path d="M5.5 11.5a5.5 5.5 0 1011 0v-6a5.5 5.5 0 10-11 0v6zM10 20a1 1 0 001-1v-2.065a8.45 8.45 0 005.657-3.238 1 1 0 00-1.58-1.22A6.5 6.5 0 0110 15a6.5 6.5 0 01-4.077-1.523 1 1 0 00-1.58 1.22A8.45 8.45 0 009 16.935V19a1 1 0 001 1z"/></svg>
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 z-50 text-2xl"
      >
        🌿
      </button>
    </>
  );
}