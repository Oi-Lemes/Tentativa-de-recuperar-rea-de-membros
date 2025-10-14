"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import WistiaPlayer from '@/components/WistiaPlayer'; // Importe o novo componente

// Tipos
interface Aula {
  id: number;
  title: string;
  contentUrl?: string;
}
interface Modulo {
  id: number;
  title: string;
  aulas: Aula[];
}

export default function AulaPage() {
  const params = useParams();
  const router = useRouter();
  const { id: moduleId, aulaId } = params;

  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [aulasConcluidas, setAulasConcluidas] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        if (!token || !moduleId) {
            router.push('/');
            return;
        }
        
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
            const [moduloRes, progressoRes] = await Promise.all([
                fetch(`${backendUrl}/modulos/${moduleId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${backendUrl}/progresso`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!moduloRes.ok) {
              const errorData = await moduloRes.json();
              throw new Error(errorData.message || 'Falha ao carregar o módulo.');
            }

            setModulo(await moduloRes.json());
            setAulasConcluidas(await progressoRes.json());
        } catch (err: any) {
            console.error("Erro ao buscar dados da aula:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [moduleId, aulaId, router]);

  const aulaAtual = modulo?.aulas.find(a => a.id.toString() === aulaId);
  const aulaIndex = modulo?.aulas.findIndex(a => a.id.toString() === aulaId) ?? -1;
  const isUltimaAulaDoModulo = aulaIndex !== -1 && aulaIndex === (modulo?.aulas.length ?? 0) - 1;
  const isConcluida = aulaAtual ? aulasConcluidas.includes(aulaAtual.id) : false;

  useEffect(() => {
    if (isUltimaAulaDoModulo && isConcluida) {
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isConcluida, isUltimaAulaDoModulo, router]);

  const handleMarcarComoConcluida = async () => {
    if (!aulaAtual) return;
    const token = localStorage.getItem('token');
    if(!token) return;
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        await fetch(`${backendUrl}/progresso/aula/${aulaAtual.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        setAulasConcluidas(prev => 
            isConcluida ? prev.filter(id => id !== aulaAtual.id) : [...prev, aulaAtual.id]
        );
        window.dispatchEvent(new Event('storage'));
    } catch (error) {
        console.error("Erro ao marcar aula como concluída:", error);
    }
  };

  const handleProximo = () => {
    if (modulo && !isUltimaAulaDoModulo) {
        const proximaAula = modulo.aulas[aulaIndex + 1];
        router.push(`/modulo/${moduleId}/aula/${proximaAula.id}`);
    } else {
        router.push('/dashboard');
    }
  };

  const getWistiaMediaId = (url: string | undefined): string | null => {
    if (!url || !url.includes('wistia.com')) return null;
    try {
      const path = new URL(url).pathname;
      const parts = path.split('/');
      return parts[parts.length - 1];
    } catch {
      return null;
    }
  };

  const wistiaMediaId = getWistiaMediaId(aulaAtual?.contentUrl);

  if (isLoading) {
    return <div className="text-center text-white">A carregar conteúdo da aula...</div>;
  }

  if (error) {
    return <div className="text-center text-red-400">Erro: {error}</div>;
  }
  
  if (!modulo || !aulaAtual) {
    return (
        <div className="text-center">
             <h1 className="text-3xl font-bold text-red-400">Erro</h1>
             <p className="mt-2 text-white">Não foi possível carregar as informações da aula.</p>
             <Link href="/dashboard" className="text-blue-400 hover:underline mt-4 block">
              Voltar para o Dashboard
            </Link>
        </div>
    );
  }

  return (
    <div>
      <nav className="mb-6">
        <Link href={`/modulo/${moduleId}`} className="text-blue-400 hover:underline">
          &larr; Voltar para as aulas do {modulo.title}
        </Link>
      </nav>
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold">{aulaAtual.title}</h1>
      </header>
      <main className="space-y-6">
        
        <div className="bg-gray-900 rounded-lg overflow-hidden shadow-lg w-full">
          {aulaAtual.contentUrl ? (
            wistiaMediaId ? (
              // Player para Vídeo (Wistia) usando o novo componente
              <WistiaPlayer mediaId={wistiaMediaId} />
            ) : (
              // Visualizador para Página Web (E-book)
              <iframe
                src={aulaAtual.contentUrl}
                title={aulaAtual.title}
                frameBorder="0"
                className="w-full"
                style={{ height: '75vh' }}
              ></iframe>
            )
          ) : (
            // Mensagem de conteúdo indisponível
            <div className="flex items-center justify-center w-full aspect-video">
              <p className="text-gray-400">Conteúdo indisponível para esta aula.</p>
            </div>
          )}
        </div>

        {isUltimaAulaDoModulo && isConcluida && (
            <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-center animate-pulse">
                <h3 className="font-bold text-lg">Parabéns!</h3>
                <p>Você concluiu o {modulo.title}. Redirecionando para o dashboard...</p>
            </div>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-800 rounded-md">
            <button
                onClick={handleMarcarComoConcluida}
                className={`w-full sm:w-auto px-6 py-3 rounded-md font-bold transition-colors ${
                    isConcluida
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
            >
                {isConcluida ? '✓ Aula Concluída' : 'Marcar como Concluída'}
            </button>
            <button
                onClick={handleProximo}
                disabled={isUltimaAulaDoModulo && isConcluida}
                className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-md font-bold hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {isUltimaAulaDoModulo ? 'Voltar para o Dashboard' : 'Próxima Aula →'}
            </button>
        </div>
      </main>
    </div>
  );
}