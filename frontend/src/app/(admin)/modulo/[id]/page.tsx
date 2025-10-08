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
        const [moduloRes, progressoRes] = await Promise.all([
          fetch(`http://localhost:3001/modulos/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/progresso', {
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