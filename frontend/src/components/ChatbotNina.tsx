// Caminho: frontend/src/components/ChatbotNina.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

// --- LÓGICA ADAPTATIVA DE FORMATO DE ÁUDIO ---
const SUPPORTED_MIME_TYPES = [
    'audio/webm; codecs=opus',
    'audio/ogg; codecs=opus',
    'audio/webm',
];

// Esta função encontra o primeiro formato de áudio que o navegador do usuário suporta.
const getSupportedMimeType = () => {
    for (const mimeType of SUPPORTED_MIME_TYPES) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
            return mimeType;
        }
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
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const audioChunkQueue = useRef<ArrayBuffer[]>([]);
  const supportedMimeType = useRef<string | null>(null);

  const processChunkQueue = useCallback(() => {
    if (sourceBufferRef.current && !sourceBufferRef.current.updating && audioChunkQueue.current.length > 0) {
      const chunk = audioChunkQueue.current.shift();
      if (chunk) {
        try {
          sourceBufferRef.current.appendBuffer(chunk);
          setIsSpeaking(true);
        } catch (error) {
          console.error("Erro ao adicionar buffer:", error);
        }
      }
    }
  }, []);
  
  useEffect(() => {
    supportedMimeType.current = getSupportedMimeType();
    mediaSourceRef.current = new MediaSource();
    const audioPlayer = audioPlayerRef.current;
    
    if (audioPlayer) {
      audioPlayer.src = URL.createObjectURL(mediaSourceRef.current);
      
      const handleSourceOpen = () => {
        console.log("MediaSource aberto, pronto para receber áudio.");
        const mime = supportedMimeType.current;
        if (mediaSourceRef.current && mime) {
          const sourceBuffer = mediaSourceRef.current.addSourceBuffer(mime);
          sourceBuffer.addEventListener('updateend', processChunkQueue);
          sourceBufferRef.current = sourceBuffer;
        } else {
          console.error("Nenhum MIME type suportado encontrado para o MediaSource.");
        }
      };

      mediaSourceRef.current.addEventListener('sourceopen', handleSourceOpen);

      return () => {
        mediaSourceRef.current?.removeEventListener('sourceopen', handleSourceOpen);
      }
    }
  }, [processChunkQueue]);

  useEffect(() => {
    const audioPlayer = audioPlayerRef.current;
    if (audioPlayer && audioChunkQueue.current.length > 0 && audioPlayer.paused) {
      audioPlayer.play().catch(e => console.error("Play falhou:", e));
    }
    const interval = setInterval(() => {
        if (sourceBufferRef.current && !sourceBufferRef.current.updating && audioChunkQueue.current.length === 0) {
            setIsSpeaking(false);
        }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const connect = useCallback(async () => {
    if (ws.current || !supportedMimeType.current) {
        if (!supportedMimeType.current) {
            alert("Seu navegador não suporta a gravação de áudio necessária para esta funcionalidade.");
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

        mediaRecorder.current = new MediaRecorder(stream, { mimeType: supportedMimeType.current! });
        console.log(`MediaRecorder iniciado com o formato: ${supportedMimeType.current}`);

        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(event.data);
          }
        };
        mediaRecorder.current.start(250);
      };

      ws.current.onmessage = async (event) => {
        let chunk: ArrayBuffer;
        if (event.data instanceof Blob) {
            chunk = await event.data.arrayBuffer();
        } else if (event.data instanceof ArrayBuffer) {
            chunk = event.data;
        } else { return; }

        audioChunkQueue.current.push(chunk);
        processChunkQueue();
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
      alert("Você precisa permitir o acesso ao microfone para falar com a Nina.");
    }
  }, [processChunkQueue]);

  const disconnect = () => { ws.current?.close(); };
  const handleToggleConversation = () => { (isConnected || isConnecting) ? disconnect() : connect(); };
  const getButtonState = () => {
    if (isConnecting) return { text: "Conectando...", color: "bg-yellow-500", disabled: true };
    if (isConnected) return { text: "Encerrar Conversa", color: "bg-red-500 hover:bg-red-600", disabled: false };
    return { text: "Falar com a Nina", color: "bg-blue-600 hover:bg-blue-700", disabled: false };
  };
  const buttonState = getButtonState();

  return (
    <>
      <audio ref={audioPlayerRef} className="hidden" />
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 h-auto bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50">
          <div className="bg-gray-900 p-3 flex justify-between items-center rounded-t-lg">
            <h3 className="font-bold text-white">Nina, sua Herbalista</h3>
            <button onClick={() => { disconnect(); setIsOpen(false); }} className="text-gray-300 hover:text-white text-2xl leading-none">&times;</button>
          </div>
          <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-4">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 border-4 ${isConnected ? 'border-green-400' : 'border-gray-600'} ${isSpeaking ? 'animate-pulse' : ''}`}>
                 <svg className={`w-16 h-16 ${isConnected ? 'text-green-400' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z"/><path d="M5.5 11.5a5.5 5.5 0 1011 0v-6a5.5 5.5 0 10-11 0v6zM10 20a1 1 0 001-1v-2.065a8.45 8.45 0 005.657-3.238 1 1 0 00-1.58-1.22A6.5 6.5 0 0110 15a6.5 6.5 0 01-4.077-1.523 1 1 0 00-1.58 1.22A8.45 8.45 0 009 16.935V9a1 1 0 001 1z"/></svg>
              </div>
              <p className="text-sm text-gray-400 h-4">
                {isConnecting ? "Conectando..." : isConnected ? "Conectado. Pode falar!" : "Pronta para ouvir."}
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