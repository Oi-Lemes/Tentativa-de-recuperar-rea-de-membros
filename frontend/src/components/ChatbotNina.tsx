// Caminho: frontend/src/components/ChatbotNina.tsx

"use client";

import { useState, useRef, useEffect, useCallback } from 'react';

// Declaração para a API de Reconhecimento de Voz do navegador
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  id: number;
  role: 'user' | 'model';
  text: string;
}

export default function ChatbotNina() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // Para controlar o estado geral (texto+voz)
  
  // Fila para gerir as frases que precisam de ser convertidas em áudio e exibidas
  const [sentenceQueue, setSentenceQueue] = useState<string[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Efeito para rolar para a última mensagem
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Efeito que funciona como o nosso "gestor de fila" de áudio
  useEffect(() => {
    // Se o áudio não estiver a tocar e houver frases na fila...
    if (!isAudioPlaying && sentenceQueue.length > 0) {
      const nextSentence = sentenceQueue[0];
      setSentenceQueue(prev => prev.slice(1)); // Remove a frase da fila
      playAudioAndSyncText(nextSentence);
    }
  }, [sentenceQueue, isAudioPlaying]);


  const playAudioAndSyncText = useCallback(async (text: string) => {
    setIsAudioPlaying(true);
  
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
  
      if (!response.ok) throw new Error("Falha ao gerar áudio.");
  
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
  
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
  
        // Toca o áudio e, quando ele acabar, sinaliza que parou de tocar
        audioRef.current.onended = () => {
          setIsAudioPlaying(false);
        };
  
        // Exibição do texto palavra por palavra (efeito "karaoke")
        const words = text.split(' ');
        let currentWordIndex = 0;
        
        // Simula a duração do áudio para temporizar as palavras. Não é perfeito mas funciona bem.
        const audioDuration = await new Promise<number>(resolve => {
            const tempAudio = new Audio(audioUrl);
            tempAudio.onloadedmetadata = () => resolve(tempAudio.duration);
        });
        const delay = (audioDuration * 1000) / words.length;

        const interval = setInterval(() => {
          if (currentWordIndex < words.length) {
            setHistory(prev => {
              const newHistory = [...prev];
              const lastMessage = newHistory[newHistory.length - 1];
              lastMessage.text = words.slice(0, currentWordIndex + 1).join(' ');
              return newHistory;
            });
            currentWordIndex++;
          } else {
            clearInterval(interval);
          }
        }, delay);
  
        audioRef.current.play();
      }
    } catch (error) {
      console.error("Erro ao tocar áudio:", error);
      setIsAudioPlaying(false); // Garante que o estado é resetado em caso de erro
    }
  }, []);

  const handleSubmit = async (messageText: string) => {
    if (!messageText.trim() || isGenerating) return;

    setIsGenerating(true);
    const newUserMessage: Message = { id: Date.now(), role: 'user', text: messageText };
    setHistory(prev => [...prev, newUserMessage]);
    
    // Adiciona um placeholder para a resposta da Nina
    const modelMessageId = Date.now() + 1;
    setHistory(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: [...history, { role: 'user', parts: [{ text: messageText }] }], message: messageText }),
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sentenceBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Adiciona a última frase do buffer à fila, se houver
          if (sentenceBuffer.trim()) {
            setSentenceQueue(prev => [...prev, sentenceBuffer.trim()]);
          }
          break;
        }
        const chunk = decoder.decode(value);
        sentenceBuffer += chunk;

        // Procura por frases completas (terminadas em . ! ?)
        let boundary = sentenceBuffer.search(/[.!?]/);
        while (boundary !== -1) {
          const sentence = sentenceBuffer.substring(0, boundary + 1);
          sentenceBuffer = sentenceBuffer.substring(boundary + 1);
          setSentenceQueue(prev => [...prev, sentence.trim()]);
          boundary = sentenceBuffer.search(/[.!?]/);
        }
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setHistory(prev => prev.map(msg => 
        msg.id === modelMessageId ? { ...msg, text: 'Desculpe, ocorreu um erro.' } : msg
      ));
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
    recognition.continuous = false; // Grava até haver uma pausa
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event: any) => console.error("Erro no reconhecimento de voz:", event.error);
    
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
                  {msg.text}
                </div>
              </div>
            ))}
            {isGenerating && history[history.length - 1]?.role === 'user' && (
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