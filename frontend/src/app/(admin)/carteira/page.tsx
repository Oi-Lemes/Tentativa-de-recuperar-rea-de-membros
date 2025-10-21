// Caminho: frontend/src/app/(admin)/carteira/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { PixModal } from '@/components/PixModal';

// 1. Definir a interface de dados do PIX do novo gateway
interface PixData {
  pix_qr_code: string;
  amount_paid: number;
  expiration_date: string;
  hash: string;
}

// 2. Mapeamento dos Hashes de Produto (do seu server.js) e Preços
// Assumi um valor de R$ 19,90 para a emissão, pois não estava especificado.
const PRODUCTS = {
  wallet: {
    hash: 'ta6jxnhmo2', // 'Carteirinha ABRATH' do server.js
    amount: 1990, // R$ 19,90 (Exemplo, ajuste se necessário)
    title: 'Taxa de Emissão da Carteira'
  },
  pac: {
    hash: 'ogtsy3fs0o', // 'Frete PAC' do server.js
    amount: 990, // R$ 9,90 (do seu HTML)
    title: 'Frete PAC'
  },
  express: {
    hash: 'hg4kajthaw', // 'Frete Express' do server.js
    amount: 1490, // R$ 14,90 (do seu HTML)
    title: 'Frete Express'
  }
};


export default function CarteiraPage() {
  const { user, loading: userLoading, refetchUser } = useUser();

  const [cep, setCep] = useState('');
  const [address, setAddress] = useState({ street: '', number: '', neighborhood: '', city: '', state: '' });
  const [recipientName, setRecipientName] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [error, setError] = useState('');

  // 3. Estados atualizados para o novo Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCep = e.target.value;
    setCep(newCep);
    if (newCep.length !== 8) return;

    setLoadingCep(true);
    setError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${newCep}/json/`);
      if (!response.ok) throw new Error('CEP não encontrado');
      const data = await response.json();
      if (data.erro) throw new Error('CEP não encontrado');
      setAddress({
        street: data.logouro,
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
  };

  // 4. Função atualizada para o novo gateway (Paradise Pags)
  const handleOpenPixModal = async (product: { hash: string, amount: number, title: string }) => {
    if (!user) {
      alert("Utilizador não autenticado.");
      return;
    }
    setIsLoadingPix(true);
    setPaymentError('');
    const token = localStorage.getItem('token');

    const paymentPayload = {
      productHash: product.hash,
      baseAmount: product.amount,
      productTitle: product.title,
      checkoutUrl: window.location.href
    };

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/gerar-pix-paradise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(paymentPayload),
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao gerar o PIX.');

      setPixData({
        pix_qr_code: result.pix.pix_qr_code,
        amount_paid: result.amount_paid,
        expiration_date: result.pix.expiration_date,
        hash: result.hash
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
      setPaymentError(error instanceof Error ? error.message : "Ocorreu um erro desconhecido.");
    } finally {
      setIsLoadingPix(false);
    }
  };

  // 5. Nova função de callback para o modal
  const handlePaymentSuccess = () => {
    setIsModalOpen(false);
    refetchUser(); // Atualiza os dados do usuário (buscará o `hasWalletAccess`)
    alert('Pagamento confirmado! A sua solicitação foi registada.');
  };

  // 6. handleSubmit atualizado para enviar os dados corretos
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingMethod) {
      alert('Por favor, selecione uma opção de entrega.');
      return;
    }
    
    const productToBuy = shippingMethod === 'pac' ? PRODUCTS.pac : PRODUCTS.express;
    handleOpenPixModal(productToBuy);
  };

  // --- Lógica de Renderização (Modificada) ---

  if (userLoading) {
    return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>;
  }
  
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
  
  // Se o utilizador não tiver acesso (e não for Ultra), mostramos a tela de compra da carteira
  // Esta lógica assume que a compra da carteira (ta6jxnhmo2) E do frete (ogtsy3fs0o/hg4kajthaw)
  // são processos separados. A sua lógica anterior parecia ter 2 passos.
  if (!user?.hasWalletAccess && user?.plan !== 'ultra') {
    return (
        <section className="flex flex-col items-center w-full p-8 text-center">
            <h1 className="text-4xl font-bold text-white">Adquira a sua Carteira Nacional</h1>
             <p className="text-gray-300 mt-4 max-w-2xl">
                Para solicitar a emissão da sua carteira, primeiro é necessário pagar a taxa de emissão.
             </p>
             <button
                onClick={() => handleOpenPixModal(PRODUCTS.wallet)} // 7. Usando o hash e produto corretos
                disabled={isLoadingPix}
                className="mt-8 px-8 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
                {isLoadingPix ? 'A gerar PIX...' : `Pagar Taxa de Emissão (${(PRODUCTS.wallet.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`}
            </button>
            {paymentError && <p className="text-red-500 text-sm mt-2">{paymentError}</p>}
            
            {/* 8. Chamada do Modal Corrigida */}
            {isModalOpen && pixData && (
              <PixModal 
                pixData={pixData} 
                onClose={() => setIsModalOpen(false)} 
                onPaymentSuccess={handlePaymentSuccess}
              />
            )}
        </section>
    );
  }

  // Se o utilizador for Ultra ou já tiver comprado o acesso (hasWalletAccess = true),
  // mostramos o formulário de frete.
  // NOTA: A sua lógica no server.js dá `hasWalletAccess` na compra do frete.
  // Se for esse o caso, a tela anterior pode ser pulada.
  // Mas, seguindo a lógica do seu ficheiro, este é o segundo passo.
  return (
    <section className="flex flex-col items-center w-full p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white">Emissão de Carteira Nacional CRTH ABRATH</h1>
        <p className="text-gray-300 mt-2">Taxa de emissão paga! Agora, preencha os seus dados de entrega e pague o frete.</p>
      </div>

      <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-lg shadow-lg">
        <form onSubmit={handleSubmit}>
          {/* ... (Todo o seu formulário de CEP e Endereço permanece o mesmo) ... */}
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
          {/* ... (Fim do formulário de endereço) ... */}
          
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
            <button type="submit" disabled={isLoadingPix} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400">
              {isLoadingPix ? 'A gerar PIX...' : 'Pagar Frete com PIX'}
            </button>
            {paymentError && <p className="text-red-500 text-sm mt-2">{paymentError}</p>}
          </div>
        </form>
      </div>

      {/* 9. Chamada do Modal Corrigida */}
      {isModalOpen && pixData && (
        <PixModal 
          pixData={pixData} 
          onClose={() => setIsModalOpen(false)} 
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </section>
  );
}