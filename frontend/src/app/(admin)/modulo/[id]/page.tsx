// frontend/src/app/(admin)/modulo/[id]/page.tsx

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
  description: string;
  aulas?: Aula[];
}

export default function ModuloPage() {
  const params = useParams();
  const { id } = params;
  const router = useRouter();

  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [aulasConcluidas, setAulasConcluidas] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      };

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const [moduloRes, progressoRes] = await Promise.all([
          fetch(`${backendUrl}/modulos/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${backendUrl}/progresso`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (!moduloRes.ok) {
          throw new Error("Módulo não encontrado ou falha na rede.");
        }

        setModulo(await moduloRes.json());
        setAulasConcluidas(await progressoRes.json());

      } catch (err: any) {
        console.error("Erro ao buscar dados do módulo:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, router]);
  
  if (isLoading) {
    return <div className="text-center text-white">A carregar...</div>;
  }

  if (error || !modulo) {
    return (
        <div className="text-center">
            <h1 className="text-3xl font-bold text-red-400">Ocorreu um Erro</h1>
            <p className="mt-2 text-white">{error || "Não foi possível carregar o módulo."}</p>
            <Link href="/dashboard" className="text-blue-400 hover:underline mt-4 block">
              Voltar para o Dashboard
            </Link>
        </div>
    );
  }

  const temAulas = modulo.aulas && modulo.aulas.length > 0;

  return (
    <div className="w-full max-w-4xl">
      <nav className="mb-8 mt-12 md:mt-0">
        <Link href="/dashboard" className="text-blue-400 hover:underline flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Voltar para todos os módulos
        </Link>
      </nav>

      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{modulo.title}</h1>
        <p className="text-lg text-gray-400">{modulo.description}</p>
      </header>
      <main>
        {temAulas ? (
          <>
            <h2 className="text-2xl font-semibold mb-4">Aulas do Módulo</h2>
            <div className="flex flex-col space-y-4">
                {modulo.aulas!.map((aula, index) => {
                  const isConcluida = aulasConcluidas.includes(aula.id);
                  return (
                    <Link 
                      key={aula.id} 
                      href={`/modulo/${modulo.id}/aula/${aula.id}`}
                      className="bg-gray-800 p-4 rounded-lg flex items-center justify-between hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex items-center">
                            <span className={`text-lg mr-4 font-bold ${isConcluida ? 'text-green-500' : 'text-gray-500'}`}>
                              {isConcluida ? '✓' : index + 1}
                            </span>
                            <h3 className={`text-lg ${isConcluida ? 'text-gray-400 line-through' : 'text-white'}`}>
                              {aula.title}
                            </h3>
                        </div>
                        <span className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold">
                            Assistir
                        </span>
                    </Link>
                  );
                })}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400 mt-10">
            <p>Este módulo não possui aulas.</p>
          </div>
        )}
      </main>
    </div>
  );
}