"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // A lógica de proteção agora vive aqui, no layout principal da área logada.
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
    }
  }, [router]);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      {/* Barra Lateral (Sidebar) */}
      <aside className="w-64 bg-gray-800 p-6 flex flex-col">
        <h2 className="text-2xl font-bold mb-10">Módulos</h2>
        <nav className="flex flex-col space-y-4">
          <Link href="/dashboard" className="text-lg text-gray-300 hover:text-white">
            Início
          </Link>
          {/* Futuramente, os links para os módulos virão aqui */}
          <a href="#" className="text-lg text-gray-300 hover:text-white">Módulo 1</a>
          <a href="#" className="text-lg text-gray-400 cursor-not-allowed">Módulo 2</a>
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