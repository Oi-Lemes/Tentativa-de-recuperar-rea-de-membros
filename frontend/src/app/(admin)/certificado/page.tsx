// Caminho: frontend/src/app/(admin)/certificado/page.tsx
"use client";

import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { PixModal } from '@/components/PixModal';
import { DownloadIcon } from '@/components/Icons'; // Assumindo que você tem um componente Icons

// Interface PixData
interface PixData {
  pix_qr_code: string;
  amount_paid: number;
  expiration_date: string;
  hash: string;
}

// Detalhes do Produto Certificado
const CERTIFICATE_PRODUCT = {
  hash: 'prod_0bc162e2175f527f', // Hash do PHP
  amount: 1490,                 // Valor em centavos do PHP
  title: 'Certificado'          // Título do PHP
};

export default function CertificadoPage() {
  const { user, loading: userLoading, refetchUser } = useUser();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [studentName, setStudentName] = useState('');

  // Estados para o PIX Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const normalizeName = (name: string): string => {
    return name
      .normalize('NFD') // Normaliza para decompor acentos
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove caracteres especiais (exceto espaço)
      .replace(/\s+/g, '_') // Substitui espaços por underscore
      .toLowerCase();
  };

  const handleGenerateCertificate = async () => {
    if (!user || !user.name) {
      alert("Erro: Nome do usuário não encontrado.");
      return;
    }

    const nameToUse = studentName.trim() || user.name;
    const safeName = normalizeName(nameToUse);
    if (!safeName) {
      alert("Por favor, insira um nome válido para o certificado.");
      return;
    }

    setIsGenerating(true);
    setGenerationError('');
    const token = localStorage.getItem('token');

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/gerar-certificado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ safeStudentName: safeName }), // Envia o nome seguro
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido ao gerar certificado.' }));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}_certificado.pdf`; // Nome do arquivo para download
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

    } catch (error: any) {
      console.error('Erro ao gerar certificado:', error);
      setGenerationError(error.message || 'Falha ao gerar o certificado.');
    } finally {
      setIsGenerating(false);
    }
  };

   // Função para abrir o PIX Modal
  const handleOpenPixModal = async () => {
    if (!user) {
      alert("Utilizador não autenticado.");
      return;
    }
    setIsLoadingPix(true);
    setPaymentError('');
    const token = localStorage.getItem('token');

    const paymentPayload = {
      productHash: CERTIFICATE_PRODUCT.hash,
      baseAmount: CERTIFICATE_PRODUCT.amount,
      productTitle: CERTIFICATE_PRODUCT.title,
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

  // Função chamada pelo Modal em caso de sucesso
  const handlePaymentSuccess = () => {
    setIsModalOpen(false);
    refetchUser(); // Atualiza dados do user (buscará `hasWalletAccess`)
    alert('Pagamento confirmado! Agora você pode gerar seu certificado.');
  };

  // ----- Renderização -----

  if (userLoading) {
    return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>;
  }

  // Verifica se o curso foi concluído (lógica do dashboard, adaptar se necessário)
  // Esta parte precisa buscar o progresso ou receber do contexto/props
  const cursoConcluido = true; // Placeholder - Adapte com sua lógica real de conclusão

  // Se o usuário NÃO TEM acesso E o curso NÃO está concluído
  if (!user?.hasWalletAccess && user?.plan !== 'ultra' && !cursoConcluido) {
     return (
        <section className="flex flex-col items-center justify-center h-full text-center p-6">
            <h1 className="text-4xl font-bold text-white mb-4">Emissão de Certificado</h1>
            <p className="text-gray-300 text-lg max-w-lg">
                Você precisa concluir todos os módulos do curso antes de poder emitir o seu certificado.
            </p>
            {/* Opcional: Link para voltar ao dashboard */}
            {/* <Link href="/dashboard" className="mt-6 text-blue-400 hover:text-blue-300">Voltar aos Módulos</Link> */}
        </section>
    );
  }

  // Se o curso ESTÁ concluído, mas o usuário NÃO TEM acesso (não é Ultra e não comprou)
  if (!user?.hasWalletAccess && user?.plan !== 'ultra' && cursoConcluido) {
    return (
        <section className="flex flex-col items-center justify-center h-full text-center p-6">
            <h1 className="text-4xl font-bold text-white mb-4">Parabéns pela Conclusão!</h1>
            <p className="text-gray-300 text-lg mb-6 max-w-lg">
                Para emitir seu certificado de conclusão, é necessário pagar a taxa de emissão.
            </p>
            <div className="bg-gray-800 p-6 rounded-lg shadow-md max-w-sm w-full">
                <p className="text-lg mb-1 text-gray-300">Taxa única de emissão:</p>
                <p className="text-4xl font-bold text-blue-400 mb-6">
                    {(CERTIFICATE_PRODUCT.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <button
                    onClick={handleOpenPixModal}
                    disabled={isLoadingPix}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                >
                    {isLoadingPix ? 'Gerando PIX...' : 'Pagar Taxa com PIX'}
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

  // Se o usuário TEM acesso (Ultra OU já pagou a taxa) E o curso está concluído
  if ((user?.hasWalletAccess || user?.plan === 'ultra') && cursoConcluido) {
    return (
      <section className="flex flex-col items-center w-full p-4 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">Emissão de Certificado</h1>
          <p className="text-lg text-gray-300">Parabéns por concluir a Formação Herbalista Pro!</p>
        </div>

        <div className="w-full max-w-lg bg-gray-800 p-6 md:p-8 rounded-lg shadow-lg text-center">
          <label htmlFor="studentName" className="block text-sm font-medium text-gray-300 mb-2">
            Nome Completo para o Certificado (como no seu documento):
          </label>
          <input
            type="text"
            id="studentName"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder={user?.name || "Seu Nome Completo"}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 mb-6"
          />

          <button
            onClick={handleGenerateCertificate}
            disabled={isGenerating}
            className={`w-full px-6 py-3 font-bold text-white rounded-md transition-colors flex items-center justify-center ${
              isGenerating ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Gerando Certificado...
              </>
            ) : (
              <>
                <DownloadIcon className="mr-2 h-5 w-5" />
                Baixar meu Certificado
              </>
            )}
          </button>
          {generationError && <p className="text-red-400 text-sm mt-4">{generationError}</p>}
        </div>
      </section>
    );
  }

   // Fallback: Se algo estiver inconsistente (ex: não concluiu mas tem acesso)
   return (
     <section className="flex flex-col items-center justify-center h-full text-center p-6">
        <h1 className="text-4xl font-bold text-white mb-4">Ops!</h1>
        <p className="text-gray-300 text-lg max-w-lg">
           Parece que há uma inconsistência. Verifique se você concluiu todos os módulos.
           Se o problema persistir, entre em contato com o suporte.
        </p>
    </section>
   );
}