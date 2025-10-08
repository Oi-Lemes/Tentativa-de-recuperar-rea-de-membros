"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Simula a busca dos dados da aula (em um app real, viria de uma API)
import { modulos } from '../../../../../../data/modulos';

export default function AulaPage() {
  const params = useParams();
  const router = useRouter();
  const { id: moduleId, aulaId } = params;

  const [aulasConcluidas, setAulasConcluidas] = useState<number[]>([]);

  // Carrega o progresso do localStorage quando o componente monta
  useEffect(() => {
    const progressoSalvo = localStorage.getItem('progressoAulas');
    if (progressoSalvo) {
      setAulasConcluidas(JSON.parse(progressoSalvo));
    }
  }, []);

  const modulo = modulos.find(m => m.id.toString() === moduleId);
  const aula = modulo?.aulas.find(a => a.id.toString() === aulaId);
  const aulaIndex = modulo?.aulas.findIndex(a => a.id.toString() === aulaId);

  if (!modulo || !aula || aulaIndex === undefined) {
    return <div>Aula não encontrada.</div>;
  }
  
  const proximaAula = modulo.aulas[aulaIndex + 1];
  const isConcluida = aulasConcluidas.includes(aula.id);

  const handleMarcarComoConcluida = () => {
    let progressoAtualizado;
    if (isConcluida) {
      // Desmarcar
      progressoAtualizado = aulasConcluidas.filter(id => id !== aula.id);
    } else {
      // Marcar
      progressoAtualizado = [...aulasConcluidas, aula.id];
    }
    setAulasConcluidas(progressoAtualizado);
    localStorage.setItem('progressoAulas', JSON.stringify(progressoAtualizado));
  };

  const handleProximaAula = () => {
    if (proximaAula) {
      router.push(`/modulo/${moduleId}/aula/${proximaAula.id}`);
    } else {
      router.push(`/modulo/${moduleId}`);
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
        <h1 className="text-4xl font-bold">{aula.title}</h1>
      </header>
      
      <main className="space-y-6">
        <div className="aspect-w-16 aspect-h-9 bg-gray-800 rounded-lg overflow-hidden">
          {/* AQUI ENTRARIA O VÍDEO DA AULA */}
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">[Vídeo da Aula]</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-800 rounded-md">
            <button
                onClick={handleMarcarComoConcluida}
                className={`w-full sm:w-auto px-6 py-3 rounded-md font-bold transition-colors ${
                    isConcluida
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
            >
                {isConcluida ? '✓ Concluída' : 'Marcar como Concluída'}
            </button>

            <button
                onClick={handleProximaAula}
                className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-md font-bold hover:bg-blue-700"
            >
                {proximaAula ? 'Próxima Aula →' : 'Finalizar Módulo'}
            </button>
        </div>
      </main>
    </div>
  );
}