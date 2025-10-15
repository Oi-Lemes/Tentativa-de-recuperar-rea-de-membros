"use client";
import { useState, useEffect } from 'react';

const PwaInstallButton = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Deteta se o dispositivo é iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Ouve o evento de instalação em outros dispositivos (Android/Desktop)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    
    if (!isIOSDevice) {
      window.addEventListener('beforeinstallprompt', handler);
    }

    return () => {
      if (!isIOSDevice) {
        window.removeEventListener('beforeinstallprompt', handler);
      }
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Utilizador aceitou a instalação');
      } else {
        console.log('Utilizador dispensou a instalação');
      }
      setInstallPrompt(null);
    });
  };

  // Se for iOS, mostra uma instrução
  if (isIOS) {
    return (
      <div className="text-center text-sm text-gray-400 bg-gray-900/50 p-3 rounded-md border border-gray-700">
        <p>📱 Para instalar no seu iPhone/iPad, toque no ícone de Partilha (caixa com seta) e escolha "Adicionar ao Ecrã Principal".</p>
      </div>
    );
  }

  // Se não for possível instalar (ou já estiver instalado), não mostra nada
  if (!installPrompt) {
    return null;
  }

  // Se for possível instalar, mostra o botão
  return (
    <button
      onClick={handleInstallClick}
      className="w-full px-4 py-3 font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
    >
      📱 Instalar App no seu Celular
    </button>
  );
};

export default PwaInstallButton;