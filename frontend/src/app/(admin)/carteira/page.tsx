// Caminho: frontend/src/app/(admin)/carteira/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { PixModal } from '@/components/PixModal';

export default function CarteiraPage() {
  const { user, loading: userLoading, refetchUser } = useUser();

  // Estados originais do seu formulário
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState({
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: ''
  });
  const [recipientName, setRecipientName] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [error, setError] = useState('');

  // --- NOVOS ESTADOS PARA O MODAL PIX ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; qrCode: string } | null>(null);
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [productToBuy, setProductToBuy] = useState('');

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCep = e.target.value;
    setCep(newCep);

    if (newCep.length === 8) {
      setLoadingCep(true);
      setError('');
      try {
        const response = await fetch(`https://viacep.com.br/ws/${newCep}/json/`);
        if (!response.ok) throw new Error('CEP não encontrado');
        const data = await response.json();
        if (data.erro) throw new Error('CEP não encontrado');
        setAddress({
          street: data.logradouro,
          number: '',
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        });
      } catch (err: any) {
        setError(err.message);
        setAddress({ street: '', number: '', neighborhood: '', city: '', state: '' });
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // --- NOVA FUNÇÃO PARA ABRIR O MODAL PIX ---
  const handleOpenPixModal = async (offerHash: string) => {
    if (!user) {
        alert("Utilizador não autenticado.");
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
      if (!response.ok) throw new Error('Falha ao gerar o PIX.');
      const data = await response.json();
      setPixData(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
      alert('Não foi possível iniciar o pagamento.');
    } finally {
      setIsLoadingPix(false);
    }
  };

  // --- NOVO EFEITO PARA VERIFICAR O PAGAMENTO ---
  useEffect(() => {
    if (!isModalOpen) return;
    const interval = setInterval(() => { refetchUser(); }, 5000);
    return () => clearInterval(interval);
  }, [isModalOpen, refetchUser]);

  useEffect(() => {
    if (!user || !isModalOpen) return;
    if (user.hasWalletAccess) {
        setIsModalOpen(false);
        setProductToBuy('');
        alert('Pagamento confirmado! A sua solicitação foi registada.');
    }
  }, [user, isModalOpen]);


  // --- FUNÇÃO handleSubmit ATUALIZADA ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingMethod) {
      alert('Por favor, selecione uma opção de entrega.');
      return;
    }
    
    // Escolhe o HASH DA OFERTA correto com base na seleção do utilizador
    const offerHash = shippingMethod === 'pac' ? 'x8qommvqhr' : '7fbkqhjukr';
    handleOpenPixModal(offerHash);
  };

  // Se o utilizador já tiver acesso, mostramos a mensagem de sucesso
  if (user?.hasWalletAccess && user.plan !== 'ultra') {
    return (
        <section className="flex flex-col items-center w-full p-8 text-center">
            <h1 className="text-4xl font-bold text-white">Solicitação Recebida</h1>
            <p className="text-gray-300 mt-4 max-w-2xl">
                O seu pagamento foi confirmado e a solicitação para a emissão da sua carteira foi registada com sucesso.
                <br />
                Enviaremos para o endereço fornecido assim que estiver pronta.
            </p>
        </section>
    );
  }

  // Ecrã de carregamento
  if (userLoading) {
    return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>;
  }
  
  // Se o utilizador não tiver acesso (e não for Ultra), mostramos a tela de compra da carteira primeiro
  if (!user?.hasWalletAccess && user?.plan !== 'ultra') {
    return (
        <section className="flex flex-col items-center w-full p-8 text-center">
            <h1 className="text-4xl font-bold text-white">Adquira a sua Carteira Nacional</h1>
             <p className="text-gray-300 mt-4 max-w-2xl">
                Para solicitar a emissão da sua carteira, primeiro é necessário adquirir o acesso.
             </p>
             <button
                onClick={() => handleOpenPixModal('ffusknrwlr')} // HASH DA OFERTA DA CARTEIRA
                className="mt-8 px-8 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors"
            >
                Comprar Acesso à Emissão com PIX
            </button>
            {isLoadingPix && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"><p className="text-white text-lg">A gerar PIX...</p></div>}
            {isModalOpen && pixData && ( <PixModal qrCodeBase64={pixData.qrCodeBase64} qrCode={pixData.qrCode} onClose={() => setIsModalOpen(false)} /> )}
        </section>
    );
  }

  // Se o utilizador for Ultra ou já tiver comprado o acesso, mostramos o formulário de frete
  return (
    <section className="flex flex-col items-center w-full p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white">Emissão de Carteira Nacional CRTH ABRATH</h1>
        <p className="text-gray-300 mt-2">Preencha os seus dados de entrega e pague o frete para receber a sua carteira.</p>
      </div>

      <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-lg shadow-lg">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="recipientName" className="block text-sm font-medium text-gray-300 mb-2">Nome do Destinatário</label>
              <input type="text" id="recipientName" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="cep" className="block text-sm font-medium text-gray-300 mb-2">CEP</label>
              <input type="text" id="cep" value={cep} onChange={handleCepChange} maxLength={8} required className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500" />
              {loadingCep && <p className="text-sm text-blue-400 mt-1">A buscar CEP...</p>}
              {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
            </div>
            <div>
              <label htmlFor="street" className="block text-sm font-medium text-gray-300 mb-2">Rua</label>
              <input type="text" id="street" value={address.street} readOnly className="w-full p-3 bg-gray-600 border border-gray-500 rounded-md text-gray-400 cursor-not-allowed" />
            </div>
            <div>
              <label htmlFor="number" className="block text-sm font-medium text-gray-300 mb-2">Número / Apto</label>
              <input type="text" id="number" value={address.number} onChange={(e) => setAddress({...address, number: e.target.value})} required className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-300 mb-2">Bairro</label>
              <input type="text" id="neighborhood" value={address.neighborhood} readOnly className="w-full p-3 bg-gray-600 border border-gray-500 rounded-md text-gray-400 cursor-not-allowed" />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">Cidade</label>
              <input type="text" id="city" value={address.city} readOnly className="w-full p-3 bg-gray-600 border border-gray-500 rounded-md text-gray-400 cursor-not-allowed" />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
              <input type="text" id="state" value={address.state} readOnly className="w-full p-3 bg-gray-600 border border-gray-500 rounded-md text-gray-400 cursor-not-allowed" />
            </div>
          </div>
          <div className="mt-8">
            <h3 className="text-lg font-medium text-white mb-4">Opções de Entrega</h3>
            <div className="space-y-4">
              <label className="flex items-center p-4 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-600">
                <input type="radio" name="shipping" value="pac" checked={shippingMethod === 'pac'} onChange={(e) => setShippingMethod(e.target.value)} className="form-radio h-5 w-5 text-blue-600" />
                <div className="ml-4 flex justify-between w-full">
                  <div>
                    <span className="block font-bold text-white">PAC</span>
                    <span className="block text-sm text-gray-400">Entrega em 11 a 14 dias úteis</span>
                  </div>
                  <span className="font-bold text-white">R$ 9,90</span>
                </div>
              </label>
              <label className="flex items-center p-4 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-600">
                <input type="radio" name="shipping" value="express" checked={shippingMethod === 'express'} onChange={(e) => setShippingMethod(e.target.value)} className="form-radio h-5 w-5 text-blue-600" />
                <div className="ml-4 flex justify-between w-full">
                  <div>
                    <span className="block font-bold text-white">Express</span>
                    <span className="block text-sm text-gray-400">Entrega em 4 a 8 dias úteis</span>
                  </div>
                  <span className="font-bold text-white">R$ 14,90</span>
                </div>
              </label>
            </div>
          </div>
          <div className="mt-8 text-center">
            <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors">Pagar Frete com PIX</button>
          </div>
        </form>
      </div>

      {isLoadingPix && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"><p className="text-white text-lg">A gerar PIX...</p></div>}
      {isModalOpen && pixData && ( <PixModal qrCodeBase64={pixData.qrCodeBase64} qrCode={pixData.qrCode} onClose={() => setIsModalOpen(false)} /> )}
    </section>
  );
}