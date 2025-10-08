"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { modulos } from '../../../../../data/modulos';

export default function AulaPage() {
  const params = useParams();
  const router = useRouter();
  const { id: moduleId, aulaId } = params;

  const [aulasConcluidas, setAulasConcluidas] = useState<number[]>([]);

  useEffect(() => {
    const progressoSalvo = localStorage.getItem('progressoAulas');
    if (progressoSalvo) {
      setAulasConcluidas(JSON.parse(progressoSalvo));
    }
  }, []);

  const moduloIndex = modulos.findIndex(m => m.id.toString() === moduleId);
  const modulo = modulos[moduloIndex];
  const aula = modulo?.aulas.find(a => a.id.toString() === aulaId);
  const aulaIndex = modulo?.aulas.findIndex(a => a.id.toString() === aulaId);

  if (!modulo || !aula || aulaIndex === undefined) {
    return <div>Aula não encontrada.</div>;
  }
  
  const isUltimaAulaDoModulo = aulaIndex === modulo.aulas.length - 1;
  const proximoModulo = modulos[moduloIndex + 1];
  const isConcluida = aulasConcluidas.includes(aula.id);

  const handleMarcarComoConcluida = () => {
    let progressoAtualizado;
    if (isConcluida) {
      progressoAtualizado = aulasConcluidas.filter(id => id !== aula.id);
    } else {
      progressoAtualizado = [...aulasConcluidas, aula.id];
    }
    setAulasConcluidas(progressoAtualizado);
    localStorage.setItem('progressoAulas', JSON.stringify(progressoAtualizado));
    // Dispara um evento para que o layout possa atualizar o progresso total
    window.dispatchEvent(new Event('storage'));
  };

  const handleProximo = () => {
    // Se não for a última aula, vai para a próxima aula
    if (!isUltimaAulaDoModulo) {
        const proximaAula = modulo.aulas[aulaIndex + 1];
        router.push(`/modulo/${moduleId}/aula/${proximaAula.id}`);
    } 
    // Se for a última aula e houver um próximo módulo, vai para o próximo módulo
    else if (proximoModulo) {
        router.push(`/modulo/${proximoModulo.id}`);
    } 
    // Se for a última aula do último módulo, volta para o dashboard
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
        <h1 className="text-4xl font-bold">{aula.title}</h1>
      </header>
      
      <main className="space-y-6">
        <div className="aspect-w-16 aspect-h-9 bg-gray-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">[Vídeo da Aula]</p>
          </div>
        </div>

        {/* Mensagem de Parabéns ao concluir a última aula */}
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
                {isUltimaAulaDoModulo ? (proximoModulo ? 'Ir para o Próximo Módulo →' : 'Finalizar Curso') : 'Próxima Aula →'}
            </button>
        </div>
      </main>
    </div>
  );
}