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

  useEffect(() => {
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token || !moduleId) return;
        
        try {
            const [moduloRes, progressoRes] = await Promise.all([
                fetch(`http://localhost:3001/modulos/${moduleId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('http://localhost:3001/progresso', {
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

  // Derivação de estado
  const aulaAtual = modulo?.aulas.find(a => a.id.toString() === aulaId);
  const aulaIndex = modulo?.aulas.findIndex(a => a.id.toString() === aulaId);

  if (!modulo || !aulaAtual || aulaIndex === undefined) {
    return <div>Aula não encontrada.</div>;
  }
  
  const isUltimaAulaDoModulo = aulaIndex === modulo.aulas.length - 1;
  const proximoModuloId = parseInt(moduleId as string, 10) + 1; // Simplificado
  const isConcluida = aulasConcluidas.includes(aulaAtual.id);

  const handleMarcarComoConcluida = async () => {
    const token = localStorage.getItem('token');
    if(!token) return;

    try {
        await fetch(`http://localhost:3001/progresso/aula/${aulaAtual.id}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });

        // Atualiza o estado local para refletir a mudança imediatamente
        let progressoAtualizado;
        if (isConcluida) {
            progressoAtualizado = aulasConcluidas.filter(id => id !== aulaAtual.id);
        } else {
            progressoAtualizado = [...aulasConcluidas, aulaAtual.id];
        }
        setAulasConcluidas(progressoAtualizado);

        // Dispara um evento para o layout atualizar o progresso total
        window.dispatchEvent(new Event('storage'));

    } catch (error) {
        console.error("Erro ao marcar aula como concluída:", error);
    }
  };

  const handleProximo = () => {
    // Se não for a última aula, vai para a próxima aula
    if (!isUltimaAulaDoModulo) {
        const proximaAula = modulo.aulas[aulaIndex + 1];
        router.push(`/modulo/${moduleId}/aula/${proximaAula.id}`);
    } 
    // Se for a última aula e houver um próximo módulo, vai para o próximo módulo
    else {
        // Esta lógica pode ser melhorada para verificar se o próximo módulo realmente existe
        router.push(`/modulo/${proximoModuloId}`);
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
            <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-center">
                <h3 className="font-bold text-lg">Parabéns!</h3>
                <p>Você concluiu o {modulo.title} com sucesso. Continue o seu aprendizado!</p>
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
                className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-md font-bold hover:bg-blue-700"
            >
                {isUltimaAulaDoModulo ? 'Ir para o Próximo Módulo →' : 'Próxima Aula →'}
            </button>
        </div>
      </main>
    </div>
  );
}