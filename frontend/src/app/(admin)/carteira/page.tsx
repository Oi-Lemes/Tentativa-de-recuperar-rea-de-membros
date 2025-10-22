// Caminho: frontend/src/app/(admin)/carteira/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { PixModal } from '@/components/PixModal';
import { useRouter } from 'next/navigation'; // --- ALTERAÇÃO 1: Importar o useRouter

// Interface PixData
interface PixData {
  pix_qr_code: string;
  amount_paid: number;
  expiration_date: string;
  hash: string;
}

// Mapeamento FINAL dos Produtos e Preços
const PRODUCTS = {
  walletAccess: { 
    hash: 'prod_375f8ceb7a4cffcc', 
    amount: 2700,                 
    title: 'Taxa de Emissão da Carteira ABRATH'
  },
  pac: {
    hash: 'prod_3aeba29f077583c1', 
    amount: 990,                  
    title: 'Frete PAC'            
  },
  express: {
    hash: 'prod_3aeba29f077583c1', 
    amount: 1490,                 
    title: 'Frete Express'        
  }
};


export default function CarteiraPage() {
  const { user, loading: userLoading, refetchUser } = useUser();
  const router = useRouter(); // --- ALTERAÇÃO 2: Inicializar o useRouter

  const [cep, setCep] = useState('');
  const [address, setAddress] = useState({ street: '', number: '', neighborhood: '', city: '', state: '' });
  const [recipientName, setRecipientName] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [productBeingPaid, setProductBeingPaid] = useState<'walletAccess' | 'pac' | 'express' | null>(null);


  // --- ALTERAÇÃO 3: Adicionar useEffect para redirecionamento ---
  useEffect(() => {
    // Verifica se a condição da "Página de Sucesso" (Caso 1) está ativa
    if (user?.hasWalletAccess && user.plan !== 'ultra') {
      
      // Inicia o temporizador
      const timer = setTimeout(() => {
        router.push('/dashboard'); // Redireciona para os módulos
      }, 7000); // 7000ms = 7 segundos

      // Função de limpeza: se o usuário sair da página, cancela o timer
      return () => clearTimeout(timer);
    }
  }, [user, router]); // O hook depende do 'user' (para saber se o pagamento foi feito) e do 'router'


  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCep = e.target.value;
    setCep(newCep);
    if (newCep.length !== 8) {
        setAddress({ street: '', number: '', neighborhood: '', city: '', state: '' });
        return;
    };

    setLoadingCep(true);
    setError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${newCep}/json/`);
      if (!response.ok) throw new Error('CEP não encontrado ou inválido.');
      const data = await response.json();
      if (data.erro) throw new Error('CEP não encontrado.');
      setAddress({
        street: data.logradouro || '', // Bug da rua corrigido
        number: '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || ''
      });
    } catch (err: any) {
      setError(err.message);
      setAddress({ street: '', number: '', neighborhood: '', city: '', state: '' }); 
    } finally {
      setLoadingCep(false);
    }
  };

  const handleOpenPixModal = async (productKey: keyof typeof PRODUCTS) => {
    const product = PRODUCTS[productKey];
     if (!user || !product) {
      alert("Utilizador não autenticado ou produto inválido.");
      return;
    }
    setIsLoadingPix(true);
    setPaymentError('');
    setProductBeingPaid(productKey);
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
      if (!response.ok) {
           console.error("Erro ao gerar PIX:", result);
           throw new Error(result.error || `Falha ao gerar o PIX (${response.status})`);
      }

      setPixData({
        pix_qr_code: result.pix.pix_qr_code,
        amount_paid: result.amount_paid,
        expiration_date: result.pix.expiration_date,
        hash: result.hash
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
      setPaymentError(error instanceof Error ? error.message : "Ocorreu um erro desconhecido ao gerar o PIX.");
      setProductBeingPaid(null);
    } finally {
      setIsLoadingPix(false);
    }
  };

  // Callback de sucesso do Modal
  const handlePaymentSuccess = () => {
    setIsModalOpen(false);
    refetchUser(); // Atualiza dados do usuário (isso vai disparar o re-render e o useEffect)
    
    // --- ALTERAÇÃO 4: Remover os alerts daqui ---
    // if(productBeingPaid === 'walletAccess') {
    //     alert('Pagamento da taxa confirmado! Agora preencha os dados de entrega e pague o frete.');
    // } else if (productBeingPaid === 'pac' || productBeingPaid === 'express') {
    //     alert('Pagamento do frete confirmado! Sua solicitação foi registrada.');
    // }

    setProductBeingPaid(null); // Limpa o estado
  };

  // Submissão do formulário de FRETE
  const handleSubmitShipping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingMethod) {
      alert('Por favor, selecione uma opção de entrega.');
      return;
    }
    if (!cep || !address.street || !address.number || !address.neighborhood || !address.city || !address.state || !recipientName) {
        alert('Por favor, preencha todos os dados de entrega.');
        return;
    }

    const productKey = shippingMethod === 'pac' ? 'pac' : 'express';
    handleOpenPixModal(productKey);
  };

  // ----- Renderização -----

  if (userLoading) {
    return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>;
  }

  // Caso 1: Usuário já tem acesso E NÃO é Ultra (pagou taxa E frete OU só frete se já tinha acesso antes)
  // A lógica `hasWalletAccess` agora cobre ambos pagamentos no webhook.
  if (user?.hasWalletAccess && user.plan !== 'ultra') {
    return (
        <section className="flex flex-col items-center w-full p-8 text-center">
            <h1 className="text-4xl font-bold text-white">Obrigado! Solicitação Recebida.</h1>
            {/* --- ALTERAÇÃO 5: Texto atualizado --- */}
            <p className="text-gray-300 mt-4 max-w-2xl">
                O seu pagamento foi confirmado e a solicitação para a emissão da sua carteira foi registada com sucesso.
                <br />
                Enviaremos para o endereço fornecido. O prazo de entrega é de <strong>4 a 14 dias úteis</strong>, dependendo do frete escolhido.
                <br /><br />
                Fique atento ao seu email para o código de rastreio.
            </p>
            <p className="text-gray-400 mt-8">
                A redirecionar para os módulos em 7 segundos...
            </p>
            {/* Adicionando um spinner simples */}
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mt-4"></div>
        </section>
    );
  }

  // Caso 2: Usuário NÃO tem acesso E NÃO é Ultra -> Precisa pagar a taxa primeiro
  if (!user?.hasWalletAccess && user?.plan !== 'ultra') {
    return (
        <section className="flex flex-col items-center w-full p-8 text-center">
            <h1 className="text-4xl font-bold text-white">Adquira a sua Carteira ABRATH</h1>
             <p className="text-gray-300 mt-4 max-w-2xl">
                Para solicitar a emissão da sua carteira nacional, primeiro é necessário pagar a taxa de emissão.
             </p>
             <button
                onClick={() => handleOpenPixModal('walletAccess')} // Paga a taxa
                disabled={isLoadingPix}
                className="mt-8 px-8 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
            >
                {isLoadingPix && productBeingPaid === 'walletAccess' ? 'A gerar PIX...' : `Pagar Taxa de Emissão (${(PRODUCTS.walletAccess.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`}
            </button>
            {paymentError && <p className="text-red-500 text-sm mt-2">{paymentError}</p>}

            {/* Modal PIX */}
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

  // Caso 3: Usuário é Ultra OU pagou a taxa (hasWalletAccess=true), mas ainda não pagou frete
  // Mostra o formulário de endereço e frete.
   if (user?.plan === 'ultra' || (user?.hasWalletAccess && !userLoading)) { 
    return (
        <section className="flex flex-col items-center w-full p-4 md:p-8">
        <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">Emissão de Carteira Nacional CRTH ABRATH</h1>
            <p className="text-gray-300 mt-2 max-w-2xl mx-auto">
                {user.plan === 'ultra' ? 'Como membro Ultra, a taxa de emissão é por nossa conta!' : 'Taxa de emissão paga!'}
                 Agora, preencha os seus dados de entrega e pague apenas o frete para receber a sua carteira.
             </p>
        </div>

        <div className="w-full max-w-2xl bg-gray-800 p-6 md:p-8 rounded-lg shadow-lg">
            <form onSubmit={handleSubmitShipping}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                <label htmlFor="recipientName" className="block text-sm font-medium text-gray-300 mb-2">Nome Completo do Destinatário</label>
                <input type="text" id="recipientName" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                <label htmlFor="cep" className="block text-sm font-medium text-gray-300 mb-2">CEP</label>
                <input type="text" id="cep" value={cep} onChange={handleCepChange} maxLength={8} required placeholder="Apenas números" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500" />
                {loadingCep && <p className="text-sm text-blue-400 mt-1">Buscando CEP...</p>}
                {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
                </div>
                <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-300 mb-2">Rua / Logradouro</label>
                <input type="text" id="street" value={address.street} readOnly={!!address.street && !loadingCep} placeholder={loadingCep ? '' : 'Preenchido automaticamente'} required className={`w-full p-3 border rounded-md text-white ${!!address.street && !loadingCep ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed' : 'bg-gray-700 border-gray-600 focus:ring-2 focus:ring-blue-500'}`} />
                </div>
                <div>
                <label htmlFor="number" className="block text-sm font-medium text-gray-300 mb-2">Número / Complemento</label>
                <input type="text" id="number" value={address.number} onChange={(e) => setAddress({...address, number: e.target.value})} required placeholder="Ex: 123, Apto 4B" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-300 mb-2">Bairro</label>
                <input type="text" id="neighborhood" value={address.neighborhood} readOnly={!!address.neighborhood && !loadingCep} placeholder={loadingCep ? '' : 'Preenchido automaticamente'} required className={`w-full p-3 border rounded-md text-white ${!!address.neighborhood && !loadingCep ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed' : 'bg-gray-700 border-gray-600 focus:ring-2 focus:ring-blue-500'}`} />
                </div>
                <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">Cidade</label>
                <input type="text" id="city" value={address.city} readOnly={!!address.city && !loadingCep} placeholder={loadingCep ? '' : 'Preenchido automaticamente'} required className={`w-full p-3 border rounded-md text-white ${!!address.city && !loadingCep ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed' : 'bg-gray-700 border-gray-600 focus:ring-2 focus:ring-blue-500'}`} />
                </div>
                <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-2">Estado (UF)</label>
                <input type="text" id="state" value={address.state} readOnly={!!address.state && !loadingCep} placeholder={loadingCep ? '' : 'UF'} required maxLength={2} className={`w-full p-3 border rounded-md text-white uppercase ${!!address.state && !loadingCep ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed' : 'bg-gray-700 border-gray-600 focus:ring-2 focus:ring-blue-500'}`} />
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-medium text-white mb-4">Escolha o Frete</h3>
                <div className="space-y-4">
                <label className={`flex items-center p-4 rounded-md cursor-pointer transition-colors ${shippingMethod === 'pac' ? 'bg-blue-900 border-2 border-blue-500' : 'bg-gray-700 border border-gray-600 hover:bg-gray-600'}`}>
                    <input type="radio" name="shipping" value="pac" checked={shippingMethod === 'pac'} onChange={(e) => setShippingMethod(e.target.value)} className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500" />
                    <div className="ml-4 flex justify-between w-full items-center">
                    <div>
                        <span className="block font-bold text-white">PAC</span>
                        <span className="block text-sm text-gray-400">Entrega em 11 a 14 dias úteis</span>
                    </div>
                    <span className="font-bold text-lg text-white">{(PRODUCTS.pac.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </label>
                 <label className={`flex items-center p-4 rounded-md cursor-pointer transition-colors ${shippingMethod === 'express' ? 'bg-blue-900 border-2 border-blue-500' : 'bg-gray-700 border border-gray-600 hover:bg-gray-600'}`}>
                    <input type="radio" name="shipping" value="express" checked={shippingMethod === 'express'} onChange={(e) => setShippingMethod(e.target.value)} className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500" />
                    <div className="ml-4 flex justify-between w-full items-center">
                    <div>
                        <span className="block font-bold text-white">Express (Recomendado)</span>
                        <span className="block text-sm text-gray-400">Entrega em 4 a 8 dias úteis</span>
                    </div>
                    <span className="font-bold text-lg text-white">{(PRODUCTS.express.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </label>
                </div>
            </div>

            <div className="mt-8 text-center">
                <button type="submit" disabled={isLoadingPix || !shippingMethod} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                {isLoadingPix && (productBeingPaid === 'pac' || productBeingPaid === 'express') ? 'A gerar PIX...' : 'Pagar Frete com PIX'}
                </button>
                {paymentError && <p className="text-red-500 text-sm mt-2">{paymentError}</p>}
            </div>
            </form>
        </div>

        {/* Modal PIX */}
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

  // Fallback
  return <div>Ocorreu um erro ao carregar a página. Tente novamente.</div>;
}