"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Tipos...
interface Aula {
  id: number;
  nome: string;
}

interface Modulo {
  id: number;
  nome: string;
  description: string;
  aulas: Aula[];
}

export default function ModuloPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [aulasConcluidas, setAulasConcluidas] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const [moduloRes, progressoRes] = await Promise.all([
          fetch(`${backendUrl}/modulos/${id}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }),
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
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, router]);

  // useEffect para atualizar o progresso quando uma aula é concluída
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const fetchProgresso = async () => {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
          const progressoRes = await fetch(`${backendUrl}/progresso`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' });
          if(progressoRes.ok) {
            setAulasConcluidas(await progressoRes.json());
          }
        } catch (error) {
          console.error("Erro ao re-buscar progresso:", error);
        }
      };
      fetchProgresso();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);


  if (loading) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>;
  }

  if (error || !modulo) {
    return (
      <div className="text-center p-4">
        <h1 className="text-2xl md:text-3xl font-bold text-red-400">Ocorreu um Erro</h1>
        <p className="mt-2 text-white">{error || "Não foi possível carregar as informações do módulo."}</p>
        <Link href="/dashboard" className="text-blue-400 hover:underline mt-4 block">
          Voltar para o Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      <nav className="mb-4 md:mb-6 mt-12 md:mt-0">
        <Link href="/dashboard" className="text-blue-400 hover:underline text-sm md:text-base">
          &larr; Voltar para todos os módulos
        </Link>
      </nav>
      <main>
        <header className="mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">{modulo.nome}</h1>
          <p className="text-gray-400 mt-2">{modulo.description}</p>
        </header>

        {/* --- ESTA É A CORREÇÃO VISUAL --- */}
        <div className="space-y-3">
          {modulo.aulas.map(aula => {
            const isConcluida = aulasConcluidas.includes(aula.id);
            return (
              <Link
                key={aula.id}
                href={`/modulo/${id}/aula/${aula.id}`}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center">
                  {/* Ícone de Play só aparece se a aula NÃO estiver concluída */}
                  {!isConcluida && (
                    <div className="w-8 h-8 flex items-center justify-center mr-4 text-gray-400">
                      ▶
                    </div>
                  )}
                  {/* O nome da aula ganha o efeito de riscado se estiver concluída */}
                  <span className={`font-medium ${isConcluida ? 'line-through text-gray-500' : 'text-white'}`}>
                    {aula.nome}
                  </span>
                </div>
                <span className={`text-sm ${isConcluida ? 'text-green-400' : 'text-gray-400'}`}>
                  {isConcluida ? 'Concluída' : 'Assistir'}
                </span>
              </Link>
            );
          })}
        </div>
        {/* --- FIM DA CORREÇÃO VISUAL --- */}
        
      </main>
    </div>
  );
}