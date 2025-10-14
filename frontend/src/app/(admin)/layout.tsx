"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ChatbotNina from '@/components/ChatbotNina';

const ProgressCircle = ({ percentage }: { percentage: number }) => {
    const strokeWidth = 8;
    const radius = 60;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const getColor = () => {
        if (percentage < 33) return '#ef4444';
        if (percentage < 66) return '#f59e0b';
        return '#22c55e';
    };

    return (
      <div className="relative">
        <svg height={radius * 2} width={radius * 2} className="-rotate-90">
          <circle stroke="#a3b892" fill="transparent" strokeWidth={strokeWidth} r={normalizedRadius} cx={radius} cy={radius} />
          <circle
            stroke={getColor()}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.5s ease-out' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-black">{`${Math.round(percentage)}%`}</span>
            <span className="text-xs text-gray-800">Completo</span>
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
  const [userName, setUserName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    if (window.innerWidth >= 768) { // Alterado para md (768px)
      setIsSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName');

    if (!token) {
      router.push('/');
    } else {
        if (name) setUserName(name);
        fetchProgressData();
    }

    const handleStorageChange = () => {
      const updatedName = localStorage.getItem('userName');
      if (updatedName) setUserName(updatedName);
      fetchProgressData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [router]);
  
  const fetchProgressData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const [modulosRes, progressoRes] = await Promise.all([
            fetch(`${backendUrl}/modulos`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${backendUrl}/progresso`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!modulosRes.ok || !progressoRes.ok) {
            handleLogout();
            return;
        }

        const modulos = await modulosRes.json();
        const aulasConcluidasIds = await progressoRes.json();
        const totalAulas = modulos.reduce((acc: number, modulo: any) => acc + modulo.aulas.length, 0);

        setProgressoTotal(totalAulas > 0 ? (aulasConcluidasIds.length / totalAulas) * 100 : 0);
    } catch (error) {
        console.error("Erro ao buscar progresso total:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    router.push('/');
  };

  return (
    <div className="flex min-h-screen bg-transparent">
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30 md:hidden" />}

      <aside 
        className={`w-72 p-6 flex flex-col shadow-lg fixed top-0 left-0 h-full z-40 transform transition-transform duration-300 ease-in-out`}
        style={{ backgroundColor: '#b9d7a1', color: 'black', transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div className={`flex flex-col items-center mb-10 transition-opacity duration-300 ease-in-out ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-800">Bem-vindo(a),</p>
              <h2 className="text-xl font-bold text-black truncate w-full">{userName || 'Carregando...'}</h2>
            </div>
            <ProgressCircle percentage={progressoTotal} />
            <h2 className="text-xl font-bold mt-4 text-black">Progresso Total</h2>
        </div>

        <nav className="flex flex-col space-y-2">
          <Link href="/dashboard" onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)} className="text-lg text-black hover:text-gray-700 p-2 rounded-md hover:bg-white/30">
            Início / Módulos
          </Link>
        </nav>

        <button onClick={handleLogout} className="mt-auto w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700">
          Sair
        </button>
      </aside>

      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-white/50 backdrop-blur-sm rounded-full text-black transition-all duration-300 ease-in-out hover:bg-white/80 md:hidden"
        aria-label="Toggle sidebar"
      >
        {isSidebarOpen ? (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
        )}
      </button>

      <main className={`flex-1 p-6 sm:p-8 lg:p-12 transition-all duration-300 ease-in-out md:ml-72 flex flex-col items-center`}>
        <div className="w-full max-w-6xl">
          {children}
        </div>
      </main>

      <ChatbotNina />
    </div>
  );
}