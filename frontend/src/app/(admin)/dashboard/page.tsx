// Caminho: frontend/src/app/(admin)/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@/contexts/UserContext';
import { PixModal } from '@/components/PixModal'; // 1. IMPORTAR O NOVO COMPONENTE DO MODAL

// --- Componente ProgressCircle (do seu código original) ---
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
  const { user, loading: userLoading, refetchUser } = useUser();

  // Estados originais
  const [modulos, setModulos] = useState<any[]>([]);
  const [progressoModulos, setProgressoModulos] = useState<{[key: number]: number}>({});
  const [aulasConcluidasIds, setAulasConcluidasIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- 2. NOVOS ESTADOS PARA CONTROLAR O MODAL PIX ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; qrCode: string } | null>(null);
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [productToBuy, setProductToBuy] = useState('');

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      setLoading(true);
      setErrorMessage(null);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const [modulosRes, progressoModulosRes, progressoIdsRes] = await Promise.all([
        fetch(`${backendUrl}/modulos`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }),
        fetch(`${backendUrl}/progresso-modulos`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }),
        fetch(`${backendUrl}/progresso`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' })
      ]);
      if (!modulosRes.ok || !progressoModulosRes.ok || !progressoIdsRes.ok) throw new Error('Falha ao carregar dados.');
      const modulosData = await modulosRes.json();
      const progressoModulosData = await progressoModulosRes.json();
      const progressoIdsData = await progressoIdsRes.json();
      setModulos(modulosData);
      setProgressoModulos(progressoModulosData);
      setAulasConcluidasIds(progressoIdsData);
    } catch (error: any) {
      console.error("Erro ao buscar dados do dashboard:", error);
      setErrorMessage(error.message || "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'aula_concluida') {
        fetchData();
        refetchUser();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchData, refetchUser]);

  // --- 3. NOVA FUNÇÃO PARA ABRIR O MODAL PIX ---
  const handleOpenPixModal = async (offerHash: string) => {
    if (!user) {
        alert("Utilizador não autenticado. Por favor, recarregue a página.");
        return;
    }
    setIsLoadingPix(true);
    setProductToBuy(offerHash);
    const token = localStorage.getItem('token');
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/gerar-pix-tribopay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ offerHash }),
      });
      if (!response.ok) throw new Error('Falha ao gerar o PIX a partir do backend.');
      const data = await response.json();
      setPixData(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
      alert('Não foi possível iniciar o pagamento. Tente novamente mais tarde.');
    } finally {
      setIsLoadingPix(false);
    }
  };

  // --- 4. NOVO EFEITO PARA VERIFICAR O PAGAMENTO ---
  useEffect(() => {
    if (!isModalOpen) return;
    const interval = setInterval(() => {
      refetchUser();
    }, 5000); // A cada 5 segundos, busca os dados mais recentes do utilizador
    return () => clearInterval(interval);
  }, [isModalOpen, refetchUser]);

  useEffect(() => {
    if (!user || !isModalOpen) return;
    
    // Verifica se o acesso para o produto que está a ser comprado foi libertado
    const productWasPurchased = 
        (productToBuy === 'jsnklaekc4' && user.hasLiveAccess) || // Hash real da Live
        (productToBuy === 'HASH_DA_NINA' && user.hasNinaAccess) ||
        (productToBuy === 'HASH_DA_CARTEIRA' && user.hasWalletAccess) ||
        (productToBuy === 'HASH_DO_PREMIUM' && (user.plan === 'premium' || user.plan === 'ultra'));

    if (productWasPurchased) {
        setIsModalOpen(false);
        setProductToBuy(''); // Limpa o estado
        alert('Pagamento confirmado! O seu acesso foi libertado.');
    }
  }, [user, isModalOpen, productToBuy]);

  // Resto do seu código original...
  if (loading || userLoading) {
    return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>;
  }
  if (errorMessage) {
      return (<div className="flex flex-col items-center justify-center h-full text-center text-red-400"><h2 className="text-2xl font-bold mb-4">Erro ao Carregar</h2><p>{errorMessage}</p><button onClick={fetchData} className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Tentar Novamente</button></div>);
  }

  const modulosPrincipais = Array.isArray(modulos) ? modulos.filter(m => m && m.nome && !m.nome.toLowerCase().includes('certificado')) : [];
  const totalAulasPrincipais = modulosPrincipais.reduce((acc, m) => acc + (m.aulas?.length || 0), 0);
  const aulasPrincipais = modulosPrincipais.flatMap((m: any) => m.aulas || []);
  const totalConcluidasPrincipais = aulasPrincipais.filter((a: any) => aulasConcluidasIds.includes(a.id)).length;
  const cursoConcluido = totalAulasPrincipais > 0 && totalConcluidasPrincipais >= totalAulasPrincipais;
  
  const modulosParaExibir = [...modulosPrincipais];
  const modulosFixos = [
      { id: 98, nome: 'Live com o Dr. José Nakamura', description: 'Um encontro exclusivo para tirar dúvidas.', aulas: [] },
      { id: 99, nome: 'Grupo no Whatsapp', description: 'Conecte-se com outros alunos.', aulas: [] },
      { id: 100, nome: 'Emissão de Certificado', description: 'Parabéns! Emita o seu certificado.', aulas: [] },
      { id: 101, nome: 'Emissão CARTEIRA NACIONAL CRTH ABRATH', description: 'Esta carteira tem sua emissão de forma anual.', aulas: [] }
  ];
  modulosFixos.forEach(mf => { if (!modulosParaExibir.some(m => m.id === mf.id)) modulosParaExibir.push(mf); });

  return (
    <section className="flex flex-col items-center w-full">
      <div className="text-center mb-10 md:mb-12 px-12 md:px-0">
        <h1 className="font-handwriting text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white" style={{ fontFamily: 'var(--font-great-vibes)' }}>Área de Membros</h1>
      </div>
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {modulosParaExibir.map((modulo) => {
          const indexPrincipal = modulosPrincipais.findIndex(mp => mp.id === modulo.id);
          const progressoAnterior = indexPrincipal > 0 ? (progressoModulos[modulosPrincipais[indexPrincipal - 1].id] ?? 0) : 100;

          let isLockedByProgress = indexPrincipal > 0 && progressoAnterior < 100;
          let isPaywalled = false;
          let lockMessage = "Conclua o módulo anterior";
          let purchaseOfferId = '';

          let destinationUrl = `/modulo/${modulo.id}`;
          let imageIndex = modulos.findIndex(m => m.id === modulo.id) + 1;
          let imageUrl = imageIndex > 0 ? `/img/md${imageIndex}.jpg` : '/img/fundo.png';
          
          const userPlan = user?.plan || 'basic';

          // --- LÓGICA DE BLOQUEIO COM SEUS DADOS REAIS ---
          if (indexPrincipal >= 6 && userPlan === 'basic') {
              isPaywalled = true;
              lockMessage = "Faça upgrade para Premium para aceder";
              purchaseOfferId = 'HASH_DO_PREMIUM'; // Substituir pelo seu hash real
          }
          if (modulo.nome.toLowerCase().includes('certificado')) {
            destinationUrl = '/certificado'; imageUrl = '/img/md7.jpg';
            if (!cursoConcluido) { isLockedByProgress = true; lockMessage = "Conclua todos os módulos para emitir"; } 
            else if (userPlan === 'basic') {
                isPaywalled = true; isLockedByProgress = false;
                lockMessage = "Faça upgrade para Premium para emitir";
                purchaseOfferId = 'HASH_DO_PREMIUM';
            }
          } else if (modulo.nome.toLowerCase().includes('live')) {
            destinationUrl = '/live'; imageUrl = '/img/md8.jpg';
            if (!user?.hasLiveAccess && userPlan !== 'ultra') { // Libertado para Ultra ou quem comprou
                isPaywalled = true;
                lockMessage = "Adquira seu acesso a este encontro exclusivo";
                purchaseOfferId = 'jsnklaekc4'; // <-- SEU HASH REAL DA LIVE AQUI
            }
          } else if (modulo.nome.toLowerCase().includes('whatsapp')) {
            destinationUrl = '#'; imageUrl = '/img/md9.jpg';
            isLockedByProgress = true;
            lockMessage = "Acesso liberado após a Live";
          } else if (modulo.nome.toLowerCase().includes('carteira')) {
            destinationUrl = '/carteira'; imageUrl = '/img/ABRATH.png';
            if (userPlan !== 'ultra' && !user?.hasWalletAccess) {
                isPaywalled = true;
                lockMessage = "Exclusivo do plano Ultra ou compre agora";
                purchaseOfferId = 'HASH_DA_CARTEIRA'; // Substituir pelo seu hash real
            }
          }

          const isLocked = isLockedByProgress && !isPaywalled;
          const finalOnClick = isPaywalled ? (e: React.MouseEvent) => { e.preventDefault(); handleOpenPixModal(purchaseOfferId); } : undefined;
          
          const linkClassName = `group relative block rounded-lg overflow-hidden transition-all duration-300 transform ${isPaywalled ? 'cursor-pointer hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/40' : isLocked ? 'cursor-not-allowed filter grayscale' : 'hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/40'}`;

          return (
            <Link key={modulo.id} href={isLocked || isPaywalled ? '#' : destinationUrl} onClick={finalOnClick} className={linkClassName}>
              <div className="relative w-full h-80"><Image src={imageUrl} alt={modulo.nome} layout="fill" objectFit="cover" className="transition-transform duration-500 group-hover:scale-110" onError={(e) => { e.currentTarget.src = '/img/fundo.png'; }}/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              </div>
              <div className="absolute bottom-0 left-0 p-4 md:p-6 text-white w-full">
                <h3 className="text-xl md:text-2xl font-bold uppercase tracking-wider">{modulo.nome}</h3>
                <p className={`${modulo.nome.toLowerCase().includes('certificado') ? 'text-amber-300' : 'text-gray-300'} text-sm mt-1`}>
                  {modulo.nome.toLowerCase().includes('certificado') && '🏆 '} {modulo.description}
                </p>
              </div>
              {(!isLocked && !isPaywalled && modulo.aulas && modulo.aulas.length > 0) && <ProgressCircle percentage={progressoModulos[modulo.id] ?? 0} />}
              {(isLocked || isPaywalled) && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4 text-center">
                  <span className="font-bold text-amber-400">{isPaywalled ? "CONTEÚDO EXCLUSIVO" : "BLOQUEADO"}</span>
                  <span className="text-xs">{lockMessage}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* --- 5. RENDERIZAR O MODAL E O ECRÃ DE CARREGAMENTO --- */}
      {isLoadingPix && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"><p className="text-white text-lg">A gerar o seu PIX, aguarde...</p></div>}
      {isModalOpen && pixData && (
        <PixModal 
          qrCodeBase64={pixData.qrCodeBase64} 
          qrCode={pixData.qrCode} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </section>
  );
}