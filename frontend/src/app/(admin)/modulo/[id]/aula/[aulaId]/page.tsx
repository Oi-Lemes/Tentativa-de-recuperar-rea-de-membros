"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Tipos
interface Aula {
  id: number;
  nome: string;       
  videoUrl?: string; 
}
interface Modulo {
  id: number;
  nome: string; 
  aulas: Aula[];
}

// --- MUDANÇA 1: Componente de Ícone para os botões ---
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);


export default function AulaPage() {
  const params = useParams();
  const router = useRouter();
  const { id: moduleId, aulaId } = params;

  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [aulasConcluidas, setAulasConcluidas] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  // Estado para desativar botões durante o delay do redirect com aviso
  const [isRedirecting, setIsRedirecting] = useState(false);

  const fetchData = useCallback(async () => {
    setError(null);
    const token = localStorage.getItem('token');
    if (!token || !moduleId) {
        router.push('/');
        return;
    }
    
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        
        const [moduloRes, progressoRes] = await Promise.all([
            fetch(`${backendUrl}/modulos/${moduleId}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }),
            fetch(`${backendUrl}/progresso`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' })
        ]);

        if (!moduloRes.ok) {
          const errorData = await moduloRes.json();
          throw new Error(errorData.message || 'Falha ao carregar o módulo.');
        }

        setModulo(await moduloRes.json());
        setAulasConcluidas(await progressoRes.json());
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  }, [moduleId, router]);

  useEffect(() => {
    if (!document.querySelector('script[src="https://fast.wistia.net/player.js"]')) {
      const script = document.createElement('script');
      script.src = "https://fast.wistia.net/player.js";
      script.async = true;
      document.body.appendChild(script);
    }
    fetchData();
  }, [moduleId, aulaId, fetchData]); 

  useEffect(() => {
      const handleStorageChange = () => {
          fetchData();
      };
      window.addEventListener('storage', handleStorageChange);
      return () => {
          window.removeEventListener('storage', handleStorageChange);
      };
  }, [fetchData]);

  const aulaAtual = modulo?.aulas.find(a => a.id.toString() === aulaId);
  const aulaIndex = modulo?.aulas.findIndex(a => a.id.toString() === aulaId) ?? -1;
  const isUltimaAulaDoModulo = aulaIndex !== -1 && aulaIndex === (modulo?.aulas.length ?? 0) - 1;
  const isConcluida = aulaAtual ? aulasConcluidas.includes(aulaAtual.id) : false;

  const isModuloConcluido = modulo ? modulo.aulas.every(a => aulasConcluidas.includes(a.id)) : false;

  useEffect(() => {
    if (isUltimaAulaDoModulo && isModuloConcluido) {
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isModuloConcluido, isUltimaAulaDoModulo, router]);

  const handleMarcarComoConcluida = async () => {
    if (!aulaAtual) return;
    setFeedbackMessage(null); 
    const token = localStorage.getItem('token');
    if(!token) return;

    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        await fetch(`${backendUrl}/aulas/concluir`, { 
          method: 'POST', 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ aulaId: aulaAtual.id }) 
        });
        
        window.dispatchEvent(new Event('storage'));
    } catch (error) {
        console.error("Erro ao marcar aula como concluída:", error);
    }
  };

  const handleProximo = () => {
    setFeedbackMessage(null); 

    if (modulo && !isUltimaAulaDoModulo) {
        const proximaAula = modulo.aulas[aulaIndex + 1];
        router.push(`/modulo/${moduleId}/aula/${proximaAula.id}`);
    } else if (modulo) { 
        const moduloCompleto = modulo.aulas.every(a => aulasConcluidas.includes(a.id));

        if (moduloCompleto) {
            router.push('/dashboard');
        } else {
            const primeiraAulaNaoConcluida = modulo.aulas.find(a => !aulasConcluidas.includes(a.id));
            if (primeiraAulaNaoConcluida) {
                // --- MUDANÇA 2: A lógica de delay foi adicionada aqui ---
                setFeedbackMessage(`Aguarde... você precisa concluir a aula "${primeiraAulaNaoConcluida.nome}".`);
                setIsRedirecting(true); // Desativa os botões
                setTimeout(() => {
                    router.push(`/modulo/${moduleId}/aula/${primeiraAulaNaoConcluida.id}`);
                    // O estado será resetado quando a nova página carregar
                }, 3000); // Delay de 3 segundos
            } else {
                router.push('/dashboard');
            }
        }
    }
  };
  
  const isVideo = aulaAtual?.videoUrl?.includes('wistia.com');

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>;
  }

  if (error || !modulo || !aulaAtual) {
    return (
        <div className="text-center p-4">
             <h1 className="text-2xl md:text-3xl font-bold text-red-400">Ocorreu um Erro</h1>
             <p className="mt-2 text-white">{error || "Não foi possível carregar as informações da aula."}</p>
             <Link href="/dashboard" className="text-blue-400 hover:underline mt-4 block">
              Voltar para o Dashboard
            </Link>
        </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      <nav className="mb-4 md:mb-6 mt-12 md:mt-0">
        <Link href={`/modulo/${moduleId}`} className="text-blue-400 hover:underline text-sm md:text-base">
          &larr; Voltar para as aulas do {modulo.nome}
        </Link>
      </nav>
      <header className="mb-4 md:mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{aulaAtual.nome}</h1>
      </header>
      <main className="space-y-6">
        
        <div>
          {/* ... (código do vídeo permanece o mesmo) ... */}
          {aulaAtual.videoUrl ? (
              isVideo ? (
                <div className="w-full aspect-w-16 aspect-h-9 rounded-lg overflow-hidden shadow-lg">
                  <iframe src={aulaAtual.videoUrl} title={aulaAtual.nome} allow="autoplay; fullscreen; picture-in-picture" frameBorder="0" scrolling="no" className="w-full h-full"></iframe>
                </div>
              ) : (
                <iframe src={aulaAtual.videoUrl} title={aulaAtual.nome} frameBorder="0" className="w-full h-[75vh] rounded-lg shadow-lg"></iframe>
              )
          ) : (
            <div className="flex items-center justify-center w-full aspect-video bg-gray-900 rounded-lg">
              <p className="text-gray-400">Conteúdo indisponível para esta aula.</p>
            </div>
          )}
        </div>

        {isUltimaAulaDoModulo && isModuloConcluido && (
            <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-center">
                <h3 className="font-bold text-lg">Parabéns!</h3>
                <p className="text-sm">Você concluiu o {modulo.nome}. Redirecionando para o Início...</p>
            </div>
        )}
        {feedbackMessage && (
            <div className={`px-4 py-3 rounded-lg text-center ${isRedirecting ? 'bg-yellow-900/50 border border-yellow-700 text-yellow-300' : ''}`}>
                <p>{feedbackMessage}</p>
            </div>
        )}

        {/* --- MUDANÇA 3: Novo layout e estilo para os botões --- */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
            <button
                onClick={handleMarcarComoConcluida}
                disabled={isRedirecting}
                className={`w-full sm:w-auto px-8 py-3 rounded-full font-semibold text-base transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none
                    ${isConcluida ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}
                `}
            >
                {isConcluida && <CheckIcon />}
                <span>{isConcluida ? 'Aula Concluída' : 'Marcar como Concluída'}</span>
            </button>
            <button
                onClick={handleProximo}
                disabled={(isUltimaAulaDoModulo && isModuloConcluido) || isRedirecting}
                className="w-full sm:w-auto px-8 py-3 rounded-full font-semibold text-base transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
            >
                <span>{isUltimaAulaDoModulo ? 'Finalizar Módulo' : 'Próxima Aula'}</span>
                {!isUltimaAulaDoModulo && <ArrowRightIcon />}
            </button>
        </div>
      </main>
    </div>
  );
}