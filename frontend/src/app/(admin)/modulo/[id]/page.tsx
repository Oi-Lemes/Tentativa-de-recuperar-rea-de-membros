"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { modulos } from '../../../../data/modulos'; // <-- Vai passar a usar o ficheiro central

export default function ModuloPage() {
  const params = useParams();
  const { id } = params;

  const [aulasConcluidas, setAulasConcluidas] = useState<number[]>([]);

  useEffect(() => {
    const progressoSalvo = localStorage.getItem('progressoAulas');
    if (progressoSalvo) {
      setAulasConcluidas(JSON.parse(progressoSalvo));
    }
  }, []);

  const modulo = modulos.find(m => m.id.toString() === id);
  
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
                // LIGAÇÃO CORRIGIDA: Agora aponta para a página da aula correta
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