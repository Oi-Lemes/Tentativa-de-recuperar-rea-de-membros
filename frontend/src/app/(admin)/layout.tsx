"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { modulos } from '../../data/modulos'; // Importando os dados

// Componente para o Círculo de Progresso
const ProgressCircle = ({ percentage }: { percentage: number }) => {
    const strokeWidth = 8;
    const radius = 60;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
    // Muda de cor com base na porcentagem
    const getColor = () => {
        if (percentage < 33) return '#f56565'; // Vermelho
        if (percentage < 66) return '#ecc94b'; // Amarelo
        return '#48bb78'; // Verde
    };

    return (
      <div className="relative">
        <svg height={radius * 2} width={radius * 2} className="-rotate-90">
          <circle stroke="#2d3748" fill="transparent" strokeWidth={strokeWidth} r={normalizedRadius} cx={radius} cy={radius} />
          <circle
            stroke={getColor()}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-out' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{`${Math.round(percentage)}%`}</span>
            <span className="text-xs text-gray-400">Completo</span>
        </div>
      </div>
    );
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [aulasConcluidas, setAulasConcluidas] = useState<number[]>([]);

  const totalAulas = modulos.reduce((acc, modulo) => acc + modulo.aulas.length, 0);

  const calcularProgressoTotal = (concluidas: number[]) => {
    if (totalAulas === 0) return 0;
    return (concluidas.length / totalAulas) * 100;
  };

  const progressoTotal = calcularProgressoTotal(aulasConcluidas);

  // Função para atualizar o estado com base no localStorage
  const atualizarProgresso = () => {
    const progressoSalvo = localStorage.getItem('progressoAulas');
    if (progressoSalvo) {
      setAulasConcluidas(JSON.parse(progressoSalvo));
    }
  };

  useEffect(() => {
    // Lógica de proteção da rota
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
    }
    
    // Carrega o progresso inicial
    atualizarProgresso();

    // Adiciona um "ouvinte" para quando o progresso for alterado em outra página
    window.addEventListener('storage', atualizarProgresso);

    // Limpa o "ouvinte" quando o componente for desmontado
    return () => {
      window.removeEventListener('storage', atualizarProgresso);
    };
  }, [router]);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      {/* Barra Lateral (Sidebar) */}
      <aside className="w-72 bg-gray-800 p-6 flex flex-col">
        <div className="flex flex-col items-center mb-10">
            <ProgressCircle percentage={progressoTotal} />
            <h2 className="text-xl font-bold mt-4">Progresso Total</h2>
        </div>

        <nav className="flex flex-col space-y-2">
          <Link href="/dashboard" className="text-lg text-gray-300 hover:text-white p-2 rounded-md hover:bg-gray-700">
            Início / Módulos
          </Link>
          {/* Pode adicionar mais links aqui no futuro */}
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Sair
        </button>
      </aside>

      {/* Conteúdo Principal da Página */}
      <main className="flex-1 p-12">
        {children}
      </main>
    </div>
  );
}