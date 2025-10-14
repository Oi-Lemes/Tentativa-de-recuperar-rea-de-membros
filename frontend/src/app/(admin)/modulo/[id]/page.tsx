"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Tipos para os dados da API
interface Aula {
  id: number;
  title: string;
}
interface Modulo {
  id: number;
  title: string;
  description: string;
  aulas: Aula[];
}

export default function ModuloPage() {
  const params = useParams();
  const { id } = params;

  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [aulasConcluidas, setAulasConcluidas] = useState<number[]>([]);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

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

        const moduloData = await moduloRes.json();
        const progressoData = await progressoRes.json();

        setModulo(moduloData);
        setAulasConcluidas(progressoData);
      } catch (error) {
        console.error("Erro ao buscar dados do módulo:", error);
      }
    };
    fetchData();
  }, [id]);
  
  if (!modulo) {
    return (
        <div>
            <h1 className="text-3xl font-bold">Módulo não encontrado</h1>
            <Link href="/dashboard" className="text-blue-400 hover:underline mt-4 block">
              Voltar para o Dashboard
            </Link>
        </div>
    );
  }

  return (
    <div>
      {/* --- BOTÃO DE VOLTAR ADICIONADO AQUI --- */}
      <nav className="mb-8">
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
        <h2 className="text-2xl font-semibold mb-4">Aulas do Módulo</h2>
        <div className="flex flex-col space-y-4">
            {modulo.aulas.map((aula, index) => {
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
      </main>
    </div>
  );
}