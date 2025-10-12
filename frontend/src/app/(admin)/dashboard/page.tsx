"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Tipos para os dados que virão da API
interface Aula {
  id: number;
}
interface Modulo {
  id: number;
  title: string;
  description: string;
  aulas: Aula[];
}

// Componente para o Círculo de Progresso
const ProgressCircle = ({ percentage }: { percentage: number }) => {
  const strokeWidth = 8;
  const radius = 35;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="absolute top-3 right-3">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="rgba(0, 0, 0, 0.5)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#FFD700" // Dourado para o progresso
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
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{`${Math.round(percentage)}%`}</span>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [aulasConcluidas, setAulasConcluidas] = useState<number[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const [modulosRes, progressoRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/modulos`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/progresso`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const modulosData = await modulosRes.json();
        const progressoData = await progressoRes.json();

        setModulos(modulosData);
        setAulasConcluidas(progressoData);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      }
    };
    fetchData();
  }, []);

  const getProgressoModulo = (modulo: Modulo) => {
    if (!modulo || modulo.aulas.length === 0) return 0;

    const aulasDoModuloIds = modulo.aulas.map(a => a.id);
    const concluidasNesteModulo = aulasDoModuloIds.filter(id => aulasConcluidas.includes(id));

    return (concluidasNesteModulo.length / aulasDoModuloIds.length) * 100;
  };

  return (
    <section>
      <h2 className="text-4xl font-bold mb-8 text-center text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
        Área de Membros
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {modulos.map((modulo, index) => {
          const progresso = getProgressoModulo(modulo);
          const progressoAnterior = index > 0 ? getProgressoModulo(modulos[index - 1]) : 100;
          const isLocked = index > 0 && progressoAnterior < 100;
          
          const destinationUrl = modulo.title === 'Emissão de Certificado'
            ? '/certificado'
            : `/modulo/${modulo.id}`;
          
          const imageUrl = '/img/fundo.png';

          return (
            <Link
              key={modulo.id}
              href={isLocked ? '#' : destinationUrl}
              className={`
                group relative block rounded-lg overflow-hidden transition-all duration-300 transform
                ${isLocked
                  ? 'cursor-not-allowed filter grayscale'
                  : 'hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/40'
                }
              `}
            >
              <div className="relative w-full h-80">
                <Image
                  src={imageUrl}
                  alt={modulo.title}
                  layout="fill"
                  objectFit="cover"
                  className="transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              </div>

              <div className="absolute bottom-0 left-0 p-6 text-white w-full">
                <h3 className="text-2xl font-bold uppercase tracking-wider">{modulo.title}</h3>
                {modulo.title === 'Emissão de Certificado' ? (
                    <p className="text-amber-300 text-sm">🏆 {modulo.description}</p>
                ) : (
                    <p className="text-gray-300 text-sm">{modulo.description}</p>
                )}
              </div>

              {!isLocked && modulo.aulas.length > 0 && <ProgressCircle percentage={progresso} />}

              {isLocked && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 text-center">
                   <svg className="w-10 h-10 mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  <span className="font-bold">BLOQUEADO</span>
                  <span className="text-xs">Conclua o módulo anterior</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}