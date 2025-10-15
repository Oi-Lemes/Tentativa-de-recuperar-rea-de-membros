"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const ProgressCircle = ({ percentage }: { percentage: number }) => {
  const strokeWidth = 8;
  const radius = 35;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="absolute top-3 right-3">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle stroke="rgba(0, 0, 0, 0.5)" fill="transparent" strokeWidth={strokeWidth} r={normalizedRadius} cx={radius} cy={radius}/>
        <circle stroke="#FFD700" fill="transparent" strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-out' }} r={normalizedRadius} cx={radius} cy={radius} strokeLinecap="round"/>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{`${Math.round(percentage)}%`}</span>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const [modulos, setModulos] = useState<any[]>([]);
  const [aulasConcluidas, setAulasConcluidas] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const [modulosRes, progressoRes] = await Promise.all([
          fetch(`${backendUrl}/modulos`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${backendUrl}/progresso`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const modulosData = await modulosRes.json();
        const progressoData = await progressoRes.json();
        
        setModulos(modulosData);
        setAulasConcluidas(progressoData);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getProgressoModulo = (modulo: any) => {
    if (!modulo || !modulo.aulas || modulo.aulas.length === 0) return 0;
    const aulasDoModuloIds = modulo.aulas.map((a: any) => a.id);
    const concluidasNesteModulo = aulasDoModuloIds.filter((id: number) => aulasConcluidas.includes(id));
    return (concluidasNesteModulo.length / aulasDoModuloIds.length) * 100;
  };

  const modulosPrincipais = modulos.filter(m => !m.title.includes('Certificado'));
  const totalAulasPrincipais = modulosPrincipais.reduce((acc, m) => acc + m.aulas.length, 0);
  const totalConcluidasPrincipais = modulosPrincipais.flatMap(m => m.aulas).filter((a: any) => aulasConcluidas.includes(a.id)).length;
  const cursoConcluido = totalAulasPrincipais > 0 && totalConcluidasPrincipais >= totalAulasPrincipais;

  const modulosParaExibir = [
    ...modulosPrincipais,
    { id: 98, title: 'Live com o Dr. José Nakamura', description: 'Um encontro exclusivo para tirar dúvidas.', aulas: [] },
    { id: 99, title: 'Grupo no Whatsapp', description: 'Conecte-se com outros alunos.', aulas: [] },
  ];
  if(cursoConcluido) {
    modulosParaExibir.push({ id: 100, title: 'Emissão de Certificado', description: 'Parabéns! Emita o seu certificado.', aulas: [] });
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>;
  }

  return (
    <section className="flex flex-col items-center w-full">
      <div className="text-center mb-10 md:mb-12 px-12 md:px-0">
        <h1 className="font-handwriting text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white" style={{ fontFamily: 'var(--font-great-vibes)' }}>
          Área de Membros
        </h1>
      </div>
      
      {/* ALTERAÇÃO FINAL E CORRETA AQUI */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {modulosParaExibir.map((modulo, index) => {
          
          let progressoAnterior = index > 0 ? getProgressoModulo(modulosParaExibir[index - 1]) : 100;
          let isLocked = index > 0 && progressoAnterior < 100;
          
          let destinationUrl = `/modulo/${modulo.id}`;
          let imageUrl = `/img/md${index + 1}.jpg`;
          let lockMessage = "Conclua o módulo anterior";

          if (modulo.title.includes('Live')) {
            destinationUrl = '/live';
            imageUrl = '/img/md8.jpg';
            isLocked = !cursoConcluido;
          } else if (modulo.title.includes('Whatsapp')) {
            destinationUrl = '#';
            imageUrl = '/img/md9.jpg';
            isLocked = true; 
            lockMessage = "Acesso liberado após a live";
          } else if (modulo.title.includes('Certificado')) {
            destinationUrl = '/certificado';
            imageUrl = '/img/md7.jpg';
            isLocked = false; 
          }

          return (
            <Link key={modulo.id} href={isLocked ? '#' : destinationUrl} className={`group relative block rounded-lg overflow-hidden transition-all duration-300 transform ${isLocked ? 'cursor-not-allowed filter grayscale' : 'hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/40'}`}>
              <div className="relative w-full h-80">
                <Image src={imageUrl} alt={modulo.title} layout="fill" objectFit="cover" className="transition-transform duration-500 group-hover:scale-110" onError={(e) => { e.currentTarget.src = '/img/fundo.png'; }}/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              </div>
              <div className="absolute bottom-0 left-0 p-4 md:p-6 text-white w-full">
                <h3 className="text-xl md:text-2xl font-bold uppercase tracking-wider">{modulo.title}</h3>
                <p className={`${modulo.title.includes('Certificado') ? 'text-amber-300' : 'text-gray-300'} text-sm mt-1`}>
                  {modulo.title.includes('Certificado') && '🏆 '}
                  {modulo.description}
                </p>
              </div>
              {(!isLocked && modulo.aulas.length > 0) && <ProgressCircle percentage={getProgressoModulo(modulo)} />}
              {isLocked && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 text-center">
                   <svg className="w-10 h-10 mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  <span className="font-bold">BLOQUEADO</span>
                  <span className="text-xs">{lockMessage}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}