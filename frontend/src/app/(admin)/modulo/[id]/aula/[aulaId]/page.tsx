"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Tipos
interface Aula {
  id: number;
  title: string;
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

  // Estado local para dados da API
  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [aulasConcluidas, setAulasConcluidas] = useState<number[]>([]);

  // Derivação de estado
  const aulaAtual = modulo?.aulas.find(a => a.id.toString() === aulaId);
  const aulaIndex = modulo?.aulas.findIndex(a => a.id.toString() === aulaId);
  const isUltimaAulaDoModulo = aulaIndex !== undefined && modulo ? aulaIndex === modulo.aulas.length - 1 : false;
  const isConcluida = aulaAtual ? aulasConcluidas.includes(aulaAtual.id) : false;

  // --- LÓGICA DE REDIRECIONAMENTO AUTOMÁTICO ---
  useEffect(() => {
    if (isUltimaAulaDoModulo && isConcluida) {
      console.log('Última aula do módulo concluída! Redirecionando em 3 segundos...');
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isConcluida, isUltimaAulaDoModulo, router]);


  useEffect(() => {
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token || !moduleId) return;
        
        try {
            const [moduloRes, progressoRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/modulos/${moduleId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/progresso`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            setModulo(await moduloRes.json());
            setAulasConcluidas(await progressoRes.json());
        } catch (error) {
            console.error("Erro ao buscar dados da aula:", error);
        }
    };
    fetchData();
  }, [moduleId]);


  if (!modulo || !aulaAtual || aulaIndex === undefined) {
    return <div>Aula não encontrada.</div>;
  }

  const handleMarcarComoConcluida = async () => {
    const token = localStorage.getItem('token');
    if(!token || !aulaAtual) return;

    try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/progresso/aula/${aulaAtual.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });

        let progressoAtualizado;
        if (isConcluida) {
            progressoAtualizado = aulasConcluidas.filter(id => id !== aulaAtual.id);
        } else {
            progressoAtualizado = [...aulasConcluidas, aulaAtual.id];
        }
        setAulasConcluidas(progressoAtualizado);

        window.dispatchEvent(new Event('storage'));

    } catch (error) {
        console.error("Erro ao marcar aula como concluída:", error);
    }
  };

  const handleProximo = () => {
    if (!isUltimaAulaDoModulo && modulo) {
        const proximaAula = modulo.aulas[aulaIndex + 1];
        router.push(`/modulo/${moduleId}/aula/${proximaAula.id}`);
    } 
    else {
        router.push('/dashboard');
    }
  };

  return (
    <div>
      <nav className="mb-6">
        <Link href={`/modulo/${moduleId}`} className="text-blue-400 hover:underline">
          &larr; Voltar para as aulas do {modulo.title}
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-4xl font-bold">{aulaAtual.title}</h1>
      </header>
      
      <main className="space-y-6">
        <div className="aspect-w-16 aspect-h-9 bg-gray-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">[Vídeo da Aula]</p>
          </div>
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
                disabled={isUltimaAulaDoModulo && isConcluida} // Desabilita o botão enquanto redireciona
                className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-md font-bold hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {isUltimaAulaDoModulo ? 'Voltar para o Dashboard' : 'Próxima Aula →'}
            </button>
        </div>
      </main>
    </div>
  );
}