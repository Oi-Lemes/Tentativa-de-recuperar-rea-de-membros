// Caminho: frontend/src/components/PixModal.tsx
"use client";
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

// --- Interfaces para as props (COM A CORREÇÃO) ---
interface PixModalProps {
  pixData: {
    pix_qr_code: string;
    amount_paid: number;
    expiration_date: string;
    hash: string;
  };
  onClose: () => void; // AQUI ESTAVA O ERRO: Removido o ponto extra
  onPaymentSuccess: () => void;
}

// --- Constantes do PHP adaptadas ---
const PIX_MODAL_TITLE = 'Pagamento via PIX';
const PIX_MODAL_COPY_BUTTON_TEXT = 'Copiar código PIX';
const PIX_MODAL_VALUE_TEXT = '💰 Valor:';
const PIX_MODAL_EXPIRATION_TEXT = '🕒 Válido até:';
const PIX_MODAL_SECURE_PAYMENT_TEXT = 'Pagamento seguro via PIX';

// --- O Componente Atualizado ---
export const PixModal = ({ pixData, onClose, onPaymentSuccess }: PixModalProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copyButtonText, setCopyButtonText] = useState(PIX_MODAL_COPY_BUTTON_TEXT);
  const intervalRef = useRef<NodeJS.Timeout>();

  const formatCurrency = (valueInCents: number) => {
    return (valueInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatExpirationDate = (dateString: string) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(',', '');
  };

  // Efeito para gerar a imagem do QR Code a partir do código PIX
  useEffect(() => {
    if (pixData.pix_qr_code) {
      QRCode.toDataURL(pixData.pix_qr_code, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M'
      })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error("Erro ao gerar QR Code:", err));
    }
  }, [pixData.pix_qr_code]);


  // Efeito para verificar o status do pagamento
  useEffect(() => {
    const checkStatus = async () => {
      if (!pixData.hash) return;
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
        const response = await fetch(`${apiUrl}/verificar-status-paradise/${pixData.hash}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.payment_status === 'paid') {
                clearInterval(intervalRef.current);
                onPaymentSuccess();
            }
        }
      } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
      }
    };

    // Inicia a verificação a cada 2 segundos
    intervalRef.current = setInterval(checkStatus, 2000);

    // Limpa o intervalo quando o componente é desmontado
    return () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };
  }, [pixData.hash, onPaymentSuccess]);


  const handleCopy = () => {
    navigator.clipboard.writeText(pixData.pix_qr_code);
    setCopyButtonText('Copiado!');
    setTimeout(() => setCopyButtonText(PIX_MODAL_COPY_BUTTON_TEXT), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center text-gray-800 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-2 right-4 text-3xl font-light text-gray-400 hover:text-gray-600">&times;</button>

        <h2 className="text-xl font-bold mb-4 text-[#1f2937]">{PIX_MODAL_TITLE}</h2>

        <div className="flex justify-center mb-4 p-1 bg-white border rounded-lg inline-block">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="QR Code PIX" width={184} height={184} />
          ) : (
            <div className="w-[184px] h-[184px] bg-gray-200 animate-pulse rounded-md"></div>
          )}
        </div>

        <input
          type="text"
          value={pixData.pix_qr_code}
          readOnly
          className="w-full box-border p-3 mb-3 text-sm font-mono text-center border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
        />
        <button
          onClick={handleCopy}
          className="w-full bg-[#00c27a] text-white font-semibold py-3.5 px-5 rounded-lg text-base hover:brightness-110 transition-all"
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
      </div>
    </div>
  );
};