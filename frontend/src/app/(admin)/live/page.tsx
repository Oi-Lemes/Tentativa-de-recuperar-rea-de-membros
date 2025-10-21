// Caminho: frontend/src/app/(admin)/live/page.tsx
"use client";

import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { PixModal } from '@/components/PixModal';
import Image from 'next/image';

// Interface PixData (igual aos outros ficheiros)
interface PixData {
  pix_qr_code: string;
  amount_paid: number;
  expiration_date: string;
  hash: string;
}

// Detalhes do Produto "Live"
const LIVE_PRODUCT = {
  hash: 'prod_cb02db3516be7ede', // Hash do PHP
  amount: 6700,                 // Valor em centavos do PHP
  title: 'Dr José Nakamura'     // Título do PHP
};

export default function LivePage() {
  const { user, loading: userLoading, refetchUser } = useUser();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const handleOpenPixModal = async () => {
    if (!user) {
      alert("Utilizador não autenticado.");
      return;
    }
    setIsLoadingPix(true);
    setPaymentError('');
    const token = localStorage.getItem('token');

    const paymentPayload = {
      productHash: LIVE_PRODUCT.hash,
      baseAmount: LIVE_PRODUCT.amount,
      productTitle: LIVE_PRODUCT.title,
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

  const handlePaymentSuccess = () => {
    setIsModalOpen(false);
    refetchUser(); // Atualiza os dados do usuário (buscará o `hasLiveAccess`)
    alert('Pagamento confirmado! Seu acesso à Live foi liberado.');
  };

  // ----- Renderização -----

  if (userLoading) {
    return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>;
  }

  // Se o usuário TEM acesso (Ultra OU comprou avulso)
  if (user?.hasLiveAccess || user?.plan === 'ultra') {
    return (
      <section className="flex flex-col items-center w-full p-4 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">Live Exclusiva com Dr. José Nakamura</h1>
          <p className="text-lg text-gray-300">Tema: A Ciência por Trás das Ervas Medicinais</p>
        </div>

        <div className="w-full max-w-4xl bg-black rounded-lg overflow-hidden shadow-2xl mb-8 aspect-video">
          {/* O seu iframe ou player de vídeo vai aqui */}
           <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" // Link de Exemplo - SUBSTITUA PELO SEU LINK REAL
            title="Live Dr. José Nakamura"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>

        <div className="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-lg text-gray-300">
          <h2 className="text-2xl font-semibold text-white mb-4">Sobre a Live</h2>
          <p className="mb-4">
            Neste encontro exclusivo, o Dr. José Nakamura, renomado especialista em fitoterapia,
            compartilha insights valiosos sobre como as plantas medicinais atuam no nosso corpo,
            desmistificando crenças populares e apresentando as últimas descobertas científicas.
          </p>
          <p>
            Prepare suas perguntas e participe de uma sessão interativa de Q&A ao final da apresentação.
          </p>
          {/* Adicione mais informações se desejar */}
        </div>
      </section>
    );
  }

  // Se o usuário NÃO tem acesso
  return (
    <section className="flex flex-col items-center justify-center h-full text-center p-4 md:p-8">
       <div className="relative w-full max-w-md h-auto mb-6">
        <Image
          src="/img/fundodr.png" // Use a imagem de fundo que desejar
          alt="Live Dr. José Nakamura"
          width={500}
          height={300} // Ajuste a altura conforme necessário
          className="rounded-lg shadow-lg"
          objectFit="cover" // Garante que a imagem cubra a área
        />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Live Exclusiva com Dr. José Nakamura</h1>
      <p className="text-gray-300 mb-6 max-w-lg">
        Garanta seu acesso a este encontro único para aprofundar seus conhecimentos em fitoterapia diretamente com um especialista.
      </p>
      <div className="bg-gray-800 p-6 rounded-lg shadow-md max-w-sm w-full">
         <p className="text-lg mb-1 text-gray-300">Acesso único por apenas</p>
         <p className="text-4xl font-bold text-blue-400 mb-6">
             {(LIVE_PRODUCT.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
         </p>
        <button
            onClick={handleOpenPixModal}
            disabled={isLoadingPix}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
        >
            {isLoadingPix ? 'Gerando PIX...' : 'Liberar Acesso com PIX'}
        </button>
        {paymentError && <p className="text-red-500 text-sm mt-4">{paymentError}</p>}
      </div>

      {/* Renderização do Modal */}
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