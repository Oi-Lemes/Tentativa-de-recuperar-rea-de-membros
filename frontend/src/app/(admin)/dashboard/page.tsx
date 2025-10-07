"use client";

import Link from 'next/link';

// Dados de exemplo para os módulos
const modulos = [
  { id: 1, title: 'Módulo 1: Introdução ao Desenvolvimento Web', description: 'Comece sua jornada aqui, aprendendo os conceitos fundamentais.', locked: false },
  { id: 2, title: 'Módulo 2: HTML e CSS na Prática', description: 'Construa suas primeiras páginas e estilize-as com maestria.', locked: false },
  { id: 3, title: 'Módulo 3: JavaScript Essencial', description: 'Adicione interatividade e dinamismo aos seus projetos.', locked: false },
  { id: 4, title: 'Módulo 4: React.js do Básico ao Avançado', description: 'Crie interfaces reativas e modernas com a biblioteca mais popular.', locked: true },
  { id: 5, title: 'Módulo 5: Backend com Node.js e Express', description: 'Entenda como o "cérebro" das aplicações funciona.', locked: true },
  { id: 6, title: 'Módulo 6: Bancos de Dados com Prisma', description: 'Aprenda a modelar e gerenciar dados de forma eficiente.', locked: true },
  { id: 7, title: 'Módulo 7: Autenticação e Segurança', description: 'Proteja suas aplicações com as melhores práticas.', locked: true },
  { id: 8, title: 'Módulo 8: Testes Automatizados', description: 'Garanta a qualidade e a estabilidade do seu código.', locked: true },
  { id: 9, title: 'Módulo 9: Deploy em Produção', description: 'Coloque seu projeto no ar para o mundo ver.', locked: true },
  { id: 10, title: 'Módulo 10: Próximos Passos', description: 'Continue sua evolução como desenvolvedor.', locked: true },
];

export default function DashboardPage() {
  // A lógica de proteção (useEffect, useState, etc.) foi removida daqui
  // porque agora ela é controlada pelo layout pai: /app/(admin)/layout.tsx

  return (
    // Note que o <main> e o <header> com o botão de logout foram removidos
    // porque eles agora vêm do layout.
    <section>
      <h2 className="text-2xl font-semibold mb-6">Meus Módulos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modulos.map((modulo) => (
          <Link key={modulo.id} href={!modulo.locked ? `/modulo/${modulo.id}` : '#'} passHref>
            <div
              className={`bg-gray-800 rounded-lg p-6 h-full transition-colors ${
                modulo.locked
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-700 cursor-pointer'
              }`}
            >
              <h3 className="text-xl font-bold mb-2">{modulo.title}</h3>
              <p className="text-gray-400">{modulo.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}