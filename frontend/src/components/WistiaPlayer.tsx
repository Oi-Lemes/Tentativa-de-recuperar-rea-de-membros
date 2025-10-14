"use client";

import { useEffect, useRef } from 'react';

// Adicionamos a interface do Wistia ao objeto window para o TypeScript não reclamar
declare global {
  interface Window {
    _wq: any[];
  }
}

interface WistiaPlayerProps {
  mediaId: string;
}

const WistiaPlayer = ({ mediaId }: WistiaPlayerProps) => {
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Garante que o array de comandos da Wistia exista na window
    window._wq = window._wq || [];

    // Esta função irá carregar o script principal da Wistia, mas apenas uma vez
    const loadWistiaScript = () => {
      if (document.querySelector('#wistia-e-v1-script')) {
        return; // Se o script já existe, não faz nada
      }
      const script = document.createElement('script');
      script.id = 'wistia-e-v1-script';
      script.src = 'https://fast.wistia.com/assets/external/E-v1.js';
      script.async = true;
      document.body.appendChild(script);
    };
    
    loadWistiaScript();

    // Empurra o comando para a Wistia criar o vídeo
    // A Wistia processará isso assim que o script estiver carregado e pronto
    window._wq.push({
      id: mediaId,
      onReady: (video: any) => {
        // Quando o vídeo estiver pronto, ele será injetado no nosso div de referência
        if (playerRef.current) {
          playerRef.current.appendChild(video.container);
        }
      },
    });

    // Função de limpeza: remove o player quando o componente sai da tela
    return () => {
      // Encontra o player específico pelo ID e o remove
      const video = (window as any).Wistia?.video(mediaId);
      if (video) {
        video.remove();
      }
    };
  }, [mediaId]); // O useEffect é executado sempre que o ID do vídeo mudar

  return (
    // Um container com proporção de 16:9 para o vídeo
    <div className="aspect-w-16 aspect-h-9 w-full">
        {/* O ref aponta para este div, onde o vídeo será inserido */}
        <div ref={playerRef} className="w-full h-full" />
    </div>
  );
};

export default WistiaPlayer;