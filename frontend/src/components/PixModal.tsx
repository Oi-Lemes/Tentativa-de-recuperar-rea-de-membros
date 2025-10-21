// Caminho: frontend/src/components/PixModal.tsx
"use client";
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

// --- Interfaces para as props ---
interface PixModalProps {
  pixData: {
    pix_qr_code: string;
    amount_paid: number;
    expiration_date: string;
    hash: string;
  };
  onClose: () => void;
  onPaymentSuccess: () => void;
}

// --- Constantes ---
const PIX_MODAL_TITLE = 'Pagamento via PIX';
const PIX_MODAL_COPY_BUTTON_TEXT = 'Copiar código PIX';
const PIX_MODAL_VALUE_TEXT = '💰 Valor:';
const PIX_MODAL_EXPIRATION_TEXT = '🕒 Válido até:';
const PIX_MODAL_SECURE_PAYMENT_TEXT = 'Pagamento seguro via PIX';

// --- O Componente ---
export const PixModal = ({ pixData, onClose, onPaymentSuccess }: PixModalProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copyButtonText, setCopyButtonText] = useState(PIX_MODAL_COPY_BUTTON_TEXT);
  // ▼▼▼ CORREÇÃO APLICADA AQUI ▼▼▼
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // ▲▲▲ FIM DA CORREÇÃO ▲▲▲

  const formatCurrency = (valueInCents: number) => {
    return (valueInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatExpirationDate = (dateString: string | null | undefined) => { // Tornar robusto a null/undefined
    if (!dateString) return '--';
    try {
        const date = new Date(dateString);
        // Verifica se a data é válida
        if (isNaN(date.getTime())) return '--';
        return date.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).replace(',', '');
    } catch (e) {
        console.error("Erro ao formatar data:", dateString, e);
        return '--'; // Retorna '--' se houver erro na formatação
    }
  };


  useEffect(() => {
    if (pixData.pix_qr_code) {
      QRCode.toDataURL(pixData.pix_qr_code, {
        width: 200, // Aumentado ligeiramente para melhor leitura
        margin: 1,
        errorCorrectionLevel: 'M'
      })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error("Erro ao gerar QR Code:", err));
    }
  }, [pixData.pix_qr_code]);


  useEffect(() => {
    const checkStatus = async () => {
      if (!pixData.hash) return;
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
        // Adiciona timestamp para evitar cache no GET
        const url = `${apiUrl}/verificar-status-paradise/${pixData.hash}?_=${Date.now()}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.payment_status === 'paid') {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                }
                onPaymentSuccess();
            }
        } else {
            // Se der erro 404 (hash não encontrado), talvez parar de verificar?
             console.warn(`Erro ${response.status} ao verificar status para hash ${pixData.hash}`);
             if(response.status === 404 && intervalRef.current) {
                // clearInterval(intervalRef.current); // Opcional: Parar se hash não existe mais
             }
        }
      } catch (error) {
        console.error('Erro de rede ao verificar status do pagamento:', error);
      }
    };

    // Limpa intervalo anterior se existir
    if (intervalRef.current) {
        clearInterval(intervalRef.current);
    }
    // Inicia a verificação imediatamente e depois a cada 2 segundos
    checkStatus();
    intervalRef.current = setInterval(checkStatus, 2000);

    // Limpa o intervalo quando o componente é desmontado
    return () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };
  }, [pixData.hash, onPaymentSuccess]); // Dependências corretas


  const handleCopy = () => {
    navigator.clipboard.writeText(pixData.pix_qr_code)
        .then(() => {
            setCopyButtonText('Copiado!');
            setTimeout(() => setCopyButtonText(PIX_MODAL_COPY_BUTTON_TEXT), 2000);
        })
        .catch(err => {
            console.error("Erro ao copiar para clipboard:", err);
            alert("Não foi possível copiar o código PIX."); // Feedback para o usuário
        });
  };

  return (
    // Estilos baseados no seu código PHP e melhorias
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-xs w-full text-center text-[#1f2937] relative shadow-2xl animate-slideIn">
        <button onClick={onClose} className="absolute top-2 right-4 text-3xl font-light text-gray-400 hover:text-gray-600 focus:outline-none">&times;</button>

        <h2 className="text-xl font-bold mb-4">{PIX_MODAL_TITLE}</h2>

        <div className="flex justify-center mb-4 p-1 bg-white border border-gray-200 rounded-lg inline-block shadow-sm">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="QR Code PIX" width={184} height={184} /> // Tamanho do PHP
          ) : (
            <div className="w-[184px] h-[184px] bg-gray-200 animate-pulse rounded-md flex items-center justify-center text-gray-500 text-sm">Gerando QR...</div>
          )}
        </div>

        {/* Input e Botão Copiar */}
        <div className="relative mb-3">
            <input
              type="text"
              value={pixData.pix_qr_code}
              readOnly
              className="w-full box-border p-3 text-xs font-mono text-center border border-[#d1d5db] rounded-lg bg-[#f9fafb] text-[#374151] pr-10" // Estilos do PHP
              aria-label="Código PIX Copia e Cola"
            />
             <button
                onClick={handleCopy}
                title={PIX_MODAL_COPY_BUTTON_TEXT}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 bg-transparent border-none"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
             </button>
        </div>
        <button
          onClick={handleCopy}
          className="w-full bg-[#00c27a] text-white font-semibold py-3 px-5 rounded-lg text-base hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-[#00c27a] focus:ring-offset-2" // Estilos do PHP
        >
          {copyButtonText}
        </button>

        <div className="text-sm text-[#0f172a] mt-4 space-y-1">
            <p>{PIX_MODAL_VALUE_TEXT} <strong className="font-semibold">{formatCurrency(pixData.amount_paid)}</strong></p>
            <p>{PIX_MODAL_EXPIRATION_TEXT} <span className="font-semibold">{formatExpirationDate(pixData.expiration_date)}</span></p>
        </div>

        <p className="mt-4 font-bold text-sm text-[#00c27a]">
            {PIX_MODAL_SECURE_PAYMENT_TEXT}
        </p>

         <p className="text-xs text-gray-500 mt-6 animate-pulse">Aguardando confirmação do pagamento...</p> {/* Adicionado feedback visual */}
      </div>

      {/* Estilos para animação */}
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};