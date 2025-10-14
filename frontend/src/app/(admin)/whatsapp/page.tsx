// frontend/src/app/(admin)/whatsapp/page.tsx

"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WhatsappPage() {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    // Verifica se o utilizador já visitou a página da Live para poder aceder a esta.
    // É uma segunda camada de proteção.
    const hasVisited = localStorage.getItem('hasVisitedLivePage') === 'true';
    if (!hasVisited) {
      // Se tentar aceder diretamente sem passar pelo dashboard desbloqueado, redireciona
      router.push('/dashboard');
    } else {
      setIsAllowed(true);
    }
  }, [router]);

  // IMPORTANTE: Substitua pelo seu link real do WhatsApp
  const linkDoGrupo = "https://chat.whatsapp.com/seu-codigo-aqui";

  if (!isAllowed) {
    // Mostra um estado de carregamento ou nulo enquanto verifica a permissão
    return <div className="text-center text-white">A verificar acesso...</div>;
  }

  return (
    <div className="w-full max-w-4xl">
      <nav className="mb-8 mt-12 md:mt-0">
        <Link href="/dashboard" className="text-blue-400 hover:underline flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          Voltar para o Dashboard
        </Link>
      </nav>

      <main className="bg-gray-800/50 p-6 sm:p-10 rounded-lg shadow-xl border border-gray-700 text-center flex flex-col items-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-400">Comunidade Exclusiva no WhatsApp</h1>
        <p className="text-lg text-gray-300 mt-4 max-w-2xl">
          Este é o nosso espaço para trocar experiências, tirar dúvidas e crescer em conjunto.
        </p>

        <div className="mt-8 bg-gray-900/50 border border-gray-700 rounded-lg p-6 w-full max-w-lg">
          <p className="text-base text-gray-300">
            Parabéns por ter chegado até aqui e por ter participado na nossa comunidade ao vivo! Como recompensa, aqui está o seu acesso ao grupo exclusivo de alunos.
          </p>
        </div>

        <a
          href={linkDoGrupo}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 bg-green-600 text-white font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-lg text-base sm:text-lg hover:bg-green-700 transition-all duration-300 transform hover:scale-105"
        >
          🌿 Entrar no Grupo Agora
        </a>
      </main>
    </div>
  );
}