"use client";

// Importa o 'useCallback'
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const ProgressCircle = ({ percentage }: { percentage: number }) => {
    const radius = 30;
    const stroke = 5;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="absolute top-4 right-4 z-10">
            <svg height={radius * 2} width={radius * 2} className="-rotate-90">
                <circle
                    stroke="#ffffff50"
                    fill="transparent"
                    strokeWidth={stroke}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    stroke="#34D399" // green-400
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset }}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    className="transition-all duration-300"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">
                {Math.round(percentage)}%
            </span>
        </div>
    );
};


export default function DashboardPage() {
  const [modulos, setModulos] = useState<any[]>([]);
  // Dois states separados para os dois tipos de progresso
  const [progressoModulos, setProgressoModulos] = useState<{[key: number]: number}>({});
  const [aulasConcluidasIds, setAulasConcluidasIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  // Opcional: Estado para guardar a mensagem de erro a exibir ao utilizador
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 'fetchData' movido para fora e envolvido em 'useCallback'
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      setLoading(true);
      setErrorMessage(null); // Limpa erros anteriores
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

      const [modulosRes, progressoModulosRes, progressoIdsRes] = await Promise.all([
        fetch(`${backendUrl}/modulos`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }),
        fetch(`${backendUrl}/progresso-modulos`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }),
        fetch(`${backendUrl}/progresso`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' })
      ]);

      // --- CORREÇÃO ADICIONADA AQUI ---
      // Verifica se as respostas das APIs foram bem-sucedidas ANTES de ler o JSON
      if (!modulosRes.ok) {
          const errorData = await modulosRes.json().catch(() => ({ error: 'Falha ao ler erro da API de módulos.' }));
          throw new Error(`Erro ao buscar módulos: ${errorData.error || modulosRes.statusText}`);
      }
      if (!progressoModulosRes.ok) {
           const errorData = await progressoModulosRes.json().catch(() => ({ error: 'Falha ao ler erro da API de progresso de módulos.' }));
          throw new Error(`Erro ao buscar progresso dos módulos: ${errorData.error || progressoModulosRes.statusText}`);
      }
      if (!progressoIdsRes.ok) {
          const errorData = await progressoIdsRes.json().catch(() => ({ error: 'Falha ao ler erro da API de progresso de aulas.' }));
          throw new Error(`Erro ao buscar progresso das aulas: ${errorData.error || progressoIdsRes.statusText}`);
      }
      // --- FIM DA CORREÇÃO ---

      // Agora é seguro ler o JSON
      const modulosData = await modulosRes.json();
      const progressoModulosData = await progressoModulosRes.json();
      const progressoIdsData = await progressoIdsRes.json();

      setModulos(modulosData); // Garante que setModulos só recebe um array
      setProgressoModulos(progressoModulosData);
      setAulasConcluidasIds(progressoIdsData); // Corrigido: setAulasConcluidasIds

    } catch (error: any) { // Captura erros do fetch ou das verificações .ok
      console.error("Erro ao buscar dados do dashboard:", error);
      setErrorMessage(error.message || "Não foi possível carregar os dados do dashboard.");
      // Garante que o estado não fica com dados inválidos em caso de erro
      setModulos([]);
      setProgressoModulos({});
      setAulasConcluidasIds([]); // Corrigido: setAulasConcluidasIds
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect principal que roda no carregamento da página
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ouve o evento da página de aula para atualizar o dashboard
  useEffect(() => {
    const handleStorageChange = () => {
      fetchData(); // Re-busca os dados quando uma aula é concluída
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchData]);

  // --- CORREÇÃO DE FILTRO (case-insensitive) ---
  // Verifica se modulos é um array antes de chamar filter
  const modulosPrincipais = Array.isArray(modulos)
      ? modulos.filter(m => m && m.nome && !m.nome.toLowerCase().includes('certificado'))
      : [];
  // --- FIM DA CORREÇÃO ---

  const totalAulasPrincipais = modulosPrincipais.reduce((acc, m) => acc + (m.aulas?.length || 0), 0);

  // Usa 'aulasConcluidasIds' (a lista) para o cálculo TOTAL
  const totalConcluidasPrincipais = modulosPrincipais.flatMap(m => m.aulas || []).filter((a: any) => aulasConcluidasIds.includes(a.id)).length;
  const cursoConcluido = totalAulasPrincipais > 0 && totalConcluidasPrincipais >= totalAulasPrincipais;

  // Lógica para adicionar módulos fixos (Live, Whatsapp) e Certificado condicionalmente
  const modulosParaExibir = [
    ...modulosPrincipais,
    // Adicione os módulos fixos aqui se eles não vierem do backend
    // Exemplo: { id: 98, nome: 'Live...', description: '...', aulas: [] },
  ];
  // Adiciona módulos fixos que podem não estar no array `modulos` vindo do backend
  const modulosFixos = [
      { id: 98, nome: 'Live com o Dr. José Nakamura', description: 'Um encontro exclusivo para tirar dúvidas.', aulas: [] },
      { id: 99, nome: 'Grupo no Whatsapp', description: 'Conecte-se com outros alunos.', aulas: [] },
  ];
  modulosFixos.forEach(mf => {
      if (!modulosParaExibir.some(m => m.id === mf.id)) {
          modulosParaExibir.push(mf);
      }
  });

  if(cursoConcluido) {
      const certificadoModulo = { id: 100, nome: 'Emissão de Certificado', description: 'Parabéns! Emita o seu certificado.', aulas: [] };
      if (!modulosParaExibir.some(m => m.id === certificadoModulo.id)) {
          modulosParaExibir.push(certificadoModulo);
      }
  }


  if (loading) {
    return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>;
  }

  // Se houver um erro na busca de dados, exibe a mensagem
  if (errorMessage) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-center text-red-400">
              <h2 className="text-2xl font-bold mb-4">Erro ao Carregar</h2>
              <p>{errorMessage}</p>
              <button
                  onClick={fetchData} // Permite tentar novamente
                  className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                  Tentar Novamente
              </button>
          </div>
      );
  }

  return (
    <section className="flex flex-col items-center w-full">
      <div className="text-center mb-10 md:mb-12 px-12 md:px-0">
        <h1 className="font-handwriting text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white" style={{ fontFamily: 'var(--font-great-vibes)' }}>
          Área de Membros
        </h1>
      </div>
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {modulosParaExibir.map((modulo, index) => {

          // Encontra o índice correto nos módulos *principais* para a lógica de bloqueio
          const indexPrincipal = modulosPrincipais.findIndex(mp => mp.id === modulo.id);
          let progressoAnterior = indexPrincipal > 0 ? (progressoModulos[modulosPrincipais[indexPrincipal - 1].id] ?? 0) : 100;

          // A lógica de bloqueio só se aplica aos módulos principais (exceto o primeiro)
          let isLocked = indexPrincipal > 0 && progressoAnterior < 100;

          let destinationUrl = `/modulo/${modulo.id}`;
          // Usa a ordem real vinda do seed para a imagem, ou um fallback
          let imageIndex = modulos.findIndex(m => m.id === modulo.id) + 1;
          let imageUrl = imageIndex > 0 ? `/img/md${imageIndex}.jpg` : '/img/fundo.png'; // Fallback
          let lockMessage = "Conclua o módulo anterior";

          // Lógica específica para os módulos fixos/certificado
          if (modulo.nome.toLowerCase().includes('live')) {
            destinationUrl = '/live';
            imageUrl = '/img/md8.jpg'; // Imagem específica
            isLocked = !cursoConcluido; // Bloqueado se o curso não estiver concluído
            lockMessage = "Conclua todos os módulos principais";
          } else if (modulo.nome.toLowerCase().includes('whatsapp')) {
            destinationUrl = '/whatsapp'; // Corrigido para a página correta
            imageUrl = '/img/md9.jpg'; // Imagem específica
            isLocked = !cursoConcluido; // Bloqueado se o curso não estiver concluído
            lockMessage = "Conclua todos os módulos principais";
          } else if (modulo.nome.toLowerCase().includes('certificado')) {
            destinationUrl = '/certificado';
            imageUrl = '/img/md7.jpg'; // Imagem específica
            isLocked = !cursoConcluido; // Bloqueado se o curso não estiver concluído (já verificado antes de adicionar)
             lockMessage = "Conclua todos os módulos principais";
          }

          // Define o progresso individual usando 'progressoModulos'
          const progresso = progressoModulos[modulo.id] ?? 0;

          return (
            <Link key={modulo.id} href={isLocked ? '#' : destinationUrl} className={`group relative block rounded-lg overflow-hidden transition-all duration-300 transform ${isLocked ? 'cursor-not-allowed filter grayscale' : 'hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/40'}`}>
              <div className="relative w-full h-80">
                <Image src={imageUrl} alt={modulo.nome} layout="fill" objectFit="cover" className="transition-transform duration-500 group-hover:scale-110" onError={(e) => { e.currentTarget.src = '/img/fundo.png'; }}/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              </div>
              <div className="absolute bottom-0 left-0 p-4 md:p-6 text-white w-full">
                <h3 className="text-xl md:text-2xl font-bold uppercase tracking-wider">{modulo.nome}</h3>
                <p className={`${modulo.nome.toLowerCase().includes('certificado') ? 'text-amber-300' : 'text-gray-300'} text-sm mt-1`}>
                  {modulo.nome.toLowerCase().includes('certificado') && '🏆 '}
                  {modulo.description}
                </p>
              </div>

              {/* Passa a variável 'progresso' para o círculo */}
              {(!isLocked && modulo.aulas && modulo.aulas.length > 0) && <ProgressCircle percentage={progresso} />}

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