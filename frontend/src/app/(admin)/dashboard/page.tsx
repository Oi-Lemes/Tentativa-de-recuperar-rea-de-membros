"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

// Componente para o Círculo de Progresso (sem alterações)
const ProgressCircle = ({ percentage }: { percentage: number }) => {
  const strokeWidth = 10;
  const radius = 50;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <svg height={radius * 2} width={radius * 2} className="-rotate-90">
      <circle
        stroke="#4a5568"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke="#4299e1" // Cor azul para o progresso
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        className="text-xl font-bold fill-white rotate-90"
      >
        {`${Math.round(percentage)}%`}
      </text>
    </svg>
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
        // Busca os módulos e o progresso em paralelo
        const [modulosRes, progressoRes] = await Promise.all([
          fetch('http://localhost:3001/modulos', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/progresso', {
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
      <h2 className="text-2xl font-semibold mb-6">Meus Módulos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {modulos.map((modulo, index) => {
          const progresso = getProgressoModulo(modulo);
          const progressoAnterior = index > 0 ? getProgressoModulo(modulos[index - 1]) : 100;
          const isLocked = index > 0 && progressoAnterior < 100;

          return (
            <div
              key={modulo.id}
              className={`bg-gray-800 rounded-lg p-6 flex flex-col transition-all duration-300 ${
                isLocked ? 'opacity-50' : 'hover:shadow-lg hover:shadow-blue-500/20'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">{modulo.title}</h3>
                  <p className="text-gray-400 text-sm">{modulo.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <ProgressCircle percentage={progresso} />
                </div>
              </div>

              {isLocked ? (
                <div className="mt-auto pt-4 border-t border-gray-700 text-center text-gray-400">
                  Conclua o módulo anterior para desbloquear
                </div>
              ) : (
                <Link
                  href={`/modulo/${modulo.id}`}
                  className="mt-auto pt-4 border-t border-gray-700 text-center text-blue-400 font-bold hover:underline"
                >
                  Acessar Módulo
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}