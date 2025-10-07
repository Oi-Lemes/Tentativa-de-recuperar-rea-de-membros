"use client";

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Reutilizamos os mesmos dados de exemplo do dashboard para encontrar o módulo certo
const modulos = [
  { id: 1, title: 'Módulo 1: Introdução ao Desenvolvimento Web', description: 'Comece sua jornada aqui, aprendendo os conceitos fundamentais.', locked: false, videoUrl: 'https://www.youtube.com/embed/videoseries?list=PLHz_AreHm4dkZ9-atkcmcBaMZdmLHft8n' },
  { id: 2, title: 'Módulo 2: HTML e CSS na Prática', description: 'Construa suas primeiras páginas e estilize-as com maestria.', locked: false, videoUrl: 'https://www.youtube.com/embed/Ejkb_YpuHWs' },
  { id: 3, title: 'Módulo 3: JavaScript Essencial', description: 'Adicione interatividade e dinamismo aos seus projetos.', locked: false, videoUrl: 'https://www.youtube.com/embed/BXqUH86F-kA' },
  { id: 4, title: 'Módulo 4: React.js do Básico ao Avançado', description: 'Crie interfaces reativas e modernas com a biblioteca mais popular.', locked: true, videoUrl: null },
  { id: 5, title: 'Módulo 5: Backend com Node.js e Express', description: 'Entenda como o "cérebro" das aplicações funciona.', locked: true, videoUrl: null },
  { id: 6, title: 'Módulo 6: Bancos de Dados com Prisma', description: 'Aprenda a modelar e gerenciar dados de forma eficiente.', locked: true, videoUrl: null },
  { id: 7, title: 'Módulo 7: Autenticação e Segurança', description: 'Proteja suas aplicações com as melhores práticas.', locked: true, videoUrl: null },
  { id: 8, title: 'Módulo 8: Testes Automatizados', description: 'Garanta a qualidade e a estabilidade do seu código.', locked: true, videoUrl: null },
  { id: 9, title: 'Módulo 9: Deploy em Produção', description: 'Coloque seu projeto no ar para o mundo ver.', locked: true, videoUrl: null },
  { id: 10, title: 'Módulo 10: Próximos Passos', description: 'Continue sua evolução como desenvolvedor.', locked: true, videoUrl: null },
];

export default function ModuloPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [token, setToken] = useState<string | null>(null);

  // Encontra o módulo correspondente ao ID da URL
  const modulo = modulos.find(m => m.id.toString() === id);

  useEffect(() => {
    // Proteção de rota: verifica o token
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        router.push('/');
      } else {
        setToken(storedToken);
      }
    }
  }, [router]);

  // Se o token ainda não foi validado ou o módulo não foi encontrado, não renderiza nada
  if (!token || !modulo) {
    return null; // Ou um componente de loading
  }

  // Se o módulo estiver bloqueado, mostra uma mensagem
  if (modulo.locked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white bg-gray-900">
        <h1 className="text-3xl font-bold mb-4">Acesso Negado</h1>
        <p className="text-gray-400 mb-8">Este módulo ainda não está disponível para você.</p>
        <Link href="/dashboard" className="px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700">
          Voltar para o Dashboard
        </Link>
      </div>
    );
  }

  // Se o módulo estiver liberado, exibe o conteúdo
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <nav className="mb-8">
        <Link href="/dashboard" className="text-blue-400 hover:underline">
          &larr; Voltar para todos os módulos
        </Link>
      </nav>
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{modulo.title}</h1>
        <p className="text-lg text-gray-400">{modulo.description}</p>
      </header>
      <main>
        {/* Passo 14: Conteúdo de Exemplo */}
        <div className="aspect-w-16 aspect-h-9 bg-gray-800 rounded-lg overflow-hidden">
          {modulo.videoUrl ? (
            <iframe
              src={modulo.videoUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p>Conteúdo em preparação.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}