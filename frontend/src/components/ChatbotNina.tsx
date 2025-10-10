// Caminho: frontend/src/components/ChatbotNina.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

// Esta função agora é segura, pois só será chamada no cliente dentro do useEffect
const getSupportedMimeType = () => {
    const types = [
        'audio/webm; codecs=opus',
        'audio/ogg; codecs=opus',
        'audio/webm',
    ];
    // Esta verificação é uma salvaguarda extra
    if (typeof MediaRecorder === 'undefined') {
        return null;
    }
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return null;
};

export default function ChatbotNina() {
    const [isOpen, setIsOpen] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const ws = useRef<WebSocket | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    
    // O MimeType suportado é determinado no cliente para evitar o erro de SSR
    const [supportedMimeType, setSupportedMimeType] = useState<string | null>(null);

    // Efeito para correr código APENAS no navegador
    useEffect(() => {
        // Determina o MimeType aqui, de forma segura
        setSupportedMimeType(getSupportedMimeType());
    }, []); // O array vazio [] garante que isto só corre uma vez quando o componente "monta" no cliente.

    const connect = useCallback(async () => {
        if (ws.current || !supportedMimeType) {
            if (!supportedMimeType) {
                alert("O seu navegador não suporta a gravação de áudio necessária.");
            }
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsConnecting(true);
            ws.current = new WebSocket('ws://localhost:3001');

            ws.current.onopen = () => {
                console.log('WebSocket Conectado!');
                setIsConnecting(false);
                setIsConnected(true);
                setIsSpeaking(false);

                mediaRecorder.current = new MediaRecorder(stream, { mimeType: supportedMimeType });

                mediaRecorder.current.ondataavailable = (event) => {
                    if (event.data.size > 0 && ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(event.data);
                    }
                };
                mediaRecorder.current.start(250); // Envia áudio a cada 250ms
            };

            ws.current.onmessage = async (event) => {
                setIsSpeaking(true);
                const audioBlob = new Blob([event.data], { type: 'audio/opus' });
                const audioUrl = URL.createObjectURL(audioBlob);
                if (audioPlayerRef.current) {
                    audioPlayerRef.current.src = audioUrl;
                    audioPlayerRef.current.play();
                }
            };

            ws.current.onclose = () => {
                console.log('WebSocket Desconectado.');
                setIsConnected(false);
                setIsConnecting(false);
                mediaRecorder.current?.stop();
                stream.getTracks().forEach(track => track.stop());
                ws.current = null;
            };
            ws.current.onerror = (err) => {
                console.error('Erro no WebSocket:', err);
                ws.current?.close();
            };
        } catch (error) {
            console.error("Erro ao obter acesso ao microfone:", error);
            alert("Você precisa de permitir o acesso ao microfone para falar com a Nina.");
        }
    }, [supportedMimeType]);

    const disconnect = () => {
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
        }
        ws.current?.close();
    };

    const handleToggleConversation = () => {
        (isConnected || isConnecting) ? disconnect() : connect();
    };
    
    // ... o resto do seu componente (return com o JSX) permanece igual ...
    const getButtonState = () => {
    if (isConnecting) return { text: "A ligar...", color: "bg-yellow-500", disabled: true };
    if (isConnected) return { text: "Terminar Conversa", color: "bg-red-500 hover:bg-red-600", disabled: false };
    return { text: "Falar com a Nina", color: "bg-blue-600 hover:bg-blue-700", disabled: supportedMimeType === null };
    };
    const buttonState = getButtonState();

  return (
    <>
      <audio ref={audioPlayerRef} className="hidden" onEnded={() => setIsSpeaking(false)} />
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 h-auto bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50">
          <div className="bg-gray-900 p-3 flex justify-between items-center rounded-t-lg">
            <h3 className="font-bold text-white">Nina, a sua Herbalista</h3>
            <button onClick={() => { disconnect(); setIsOpen(false); }} className="text-gray-300 hover:text-white text-2xl leading-none">&times;</button>
          </div>
          <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-4">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 border-4 ${isConnected ? 'border-green-400' : 'border-gray-600'} ${isSpeaking ? 'animate-pulse' : ''}`}>
                 <svg className={`w-16 h-16 ${isConnected ? 'text-green-400' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z"/><path d="M5.5 11.5a5.5 5.5 0 1011 0v-6a5.5 5.5 0 10-11 0v6zM10 20a1 1 0 001-1v-2.065a8.45 8.45 0 005.657-3.238 1 1 0 00-1.58-1.22A6.5 6.5 0 0110 15a6.5 6.5 0 01-4.077-1.523 1 1 0 00-1.58 1.22A8.45 8.45 0 009 16.935V9a1 1 0 001 1z"/></svg>
              </div>
              <p className="text-sm text-gray-400 h-4">
                {isConnecting ? "A ligar..." : isConnected ? "Ligado. Pode falar!" : "Pronta para ouvir."}
              </p>
              <button
                onClick={handleToggleConversation}
                disabled={buttonState.disabled}
                className={`w-full px-4 py-3 font-bold text-white rounded-md transition-colors disabled:opacity-50 ${buttonState.color}`}
              >
                {buttonState.text}
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