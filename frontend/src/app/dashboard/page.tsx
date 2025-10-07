"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Importe o Link para os módulos

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Esta verificação garante que o código só roda no navegador
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        // Se não houver token, expulsa o usuário para a página de login
        router.push('/');
      } else {
        setToken(storedToken);
      }
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token'); // Remove o token
    router.push('/'); // Redireciona para o login
  };

  // Se o token ainda não foi verificado, não mostra nada para evitar um "flash" de conteúdo
  if (!token) {
    return null; // ou um componente de loading
  }

  // Este é o conteúdo real do Dashboard
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 text-white p-12">
      <div className="w-full max-w-4xl">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold">Minha Área de Membros</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Sair (Logout)
          </button>
        </header>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Meus Módulos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Módulo 1 */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer">
              <h3 className="text-xl font-bold mb-2">Módulo 1: Introdução</h3>
              <p className="text-gray-400">Comece sua jornada aqui.</p>
            </div>
            
            {/* Adicione mais módulos aqui no futuro */}
            <div className="bg-gray-800 rounded-lg p-6 opacity-50">
              <h3 className="text-xl font-bold mb-2">Módulo 2: Em Breve</h3>
              <p className="text-gray-400">Conteúdo será liberado em breve.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}