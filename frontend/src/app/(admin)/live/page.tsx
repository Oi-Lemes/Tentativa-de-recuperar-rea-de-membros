"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function LivePage() {
  const [proximaLive, setProximaLive] = useState('');

  useEffect(() => {
    const calcularProximaQuinta = () => {
      const hoje = new Date();
      const seteDiasNoFuturo = new Date(hoje.setDate(hoje.getDate() + 7));
      
      let dataAtual = seteDiasNoFuturo;
      while (dataAtual.getDay() !== 4) { // 4 = Quinta-feira
        dataAtual.setDate(dataAtual.getDate() + 1);
      }

      const opcoes: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
      setProximaLive(dataAtual.toLocaleDateString('pt-BR', opcoes));
    };

    calcularProximaQuinta();
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <nav className="mb-6 mt-16 md:mt-0">
        <Link href="/dashboard" className="text-blue-400 hover:underline flex items-center gap-2 text-sm sm:text-base">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          Voltar para o Dashboard
        </Link>
      </nav>

      {/* Estrutura ajustada para destacar a imagem */}
      <div className="relative flex flex-col items-center mt-16 sm:mt-20">
        
        {/* Imagem do Doutor, maior e posicionada acima */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 -mb-24 sm:-mb-28 z-10">
          <Image
            src="/img/fundodr.png"
            alt="Dr. José Nakamura"
            layout="fill"
            objectFit="contain" // Garante que a imagem não seja cortada
            className="rounded-full border-4 border-gray-800 shadow-lg"
            priority
          />
        </div>

        {/* Caixa de conteúdo com espaçamento no topo para a imagem */}
        <main className="relative bg-gray-800/50 p-6 sm:p-8 rounded-lg shadow-xl border border-gray-700 text-center flex flex-col items-center w-full pt-32 sm:pt-36">
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-300">Live com Dr. José Nakamura</h1>
          <p className="text-base sm:text-lg text-gray-300 mt-4 max-w-2xl">
            Um encontro ao vivo e exclusivo para os alunos do curso Saberes da Floresta.
          </p>

          <div className="mt-8 border-2 border-dashed border-gray-600 rounded-lg p-6 w-full max-w-md">
            <p className="text-base sm:text-lg text-gray-400">A nossa próxima live está marcada para:</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-2">
              {proximaLive || 'A calcular...'}
            </p>
          </div>

          <p className="text-sm text-gray-400 mt-8 max-w-xl">
            Nesta data, o link de acesso à transmissão ao vivo aparecerá aqui.
          </p>
        </main>
      </div>
    </div>
  );
}