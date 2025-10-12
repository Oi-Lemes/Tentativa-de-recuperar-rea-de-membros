// Caminho do ficheiro: frontend/src/app/(admin)/layout.tsx

"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ChatbotNina from '@/components/ChatbotNina';

// Componente para o Círculo de Progresso (sem alterações)
const ProgressCircle = ({ percentage }: { percentage: number }) => {
    const strokeWidth = 8;
    const radius = 60;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

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
  const [progressoTotal, setProgressoTotal] = useState(0);

  const fetchProgressData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        router.push('/');
        return;
    }

    try {
        const [modulosRes, progressoRes] = await Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/modulos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/progresso`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        if (!modulosRes.ok || !progressoRes.ok) {
            localStorage.removeItem('token');
            router.push('/');
            return;
        }

        const modulos = await modulosRes.json();
        const aulasConcluidasIds = await progressoRes.json();
        const totalAulas = modulos.reduce((acc: number, modulo: any) => acc + modulo.aulas.length, 0);

        if (totalAulas > 0) {
            const percentage = (aulasConcluidasIds.length / totalAulas) * 100;
            setProgressoTotal(percentage);
        } else {
            setProgressoTotal(0);
        }

    } catch (error) {
        console.error("Erro ao buscar progresso total:", error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
    } else {
        fetchProgressData();
    }

    window.addEventListener('storage', fetchProgressData);

    return () => {
      window.removeEventListener('storage', fetchProgressData);
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  return (
    <div className="flex min-h-screen bg-transparent text-white">
      {/* Barra Lateral (Sidebar) */}
      <aside className="w-72 bg-gray-800/80 backdrop-blur-sm p-6 flex flex-col shadow-lg">
        <div className="flex flex-col items-center mb-10">
            <ProgressCircle percentage={progressoTotal} />
            <h2 className="text-xl font-bold mt-4">Progresso Total</h2>
        </div>

        <nav className="flex flex-col space-y-2">
          <Link href="/dashboard" className="text-lg text-gray-300 hover:text-white p-2 rounded-md hover:bg-gray-700/50">
            Início / Módulos
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Sair
        </button>
      </aside>

      {/* Conteúdo Principal da Página (agora transparente) */}
      <main className="flex-1 p-12">
        {children}
      </main>

      <ChatbotNina />
    </div>
  );
}