// Caminho: frontend/src/components/PixModal.tsx
"use client";
import Image from 'next/image';

interface PixModalProps {
  qrCodeBase64: string;
  qrCode: string;
  onClose: () => void;
}

export const PixModal = ({ qrCodeBase64, qrCode, onClose }: PixModalProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(qrCode);
    alert('Código PIX copiado!');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 md:p-8 max-w-sm w-full text-center text-gray-800 relative">
        <button onClick={onClose} className="absolute top-2 right-3 text-3xl text-gray-400 hover:text-gray-600">&times;</button>
        <h2 className="text-xl md:text-2xl font-bold mb-4">Pague com PIX para Liberar</h2>
        <p className="text-sm mb-4">Para concluir, escaneie o código abaixo com a aplicação do seu banco.</p>
        <div className="flex justify-center mb-4 p-2 border rounded-md">
          <Image src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code PIX" width={250} height={250} />
        </div>
        <p className="text-xs mb-2">Não consegue ler o QR Code? Copie o código:</p>
        <div className="flex">
          <input type="text" value={qrCode} readOnly className="w-full p-2 border rounded-l-md bg-gray-100 text-xs" />
          <button onClick={handleCopy} className="bg-blue-600 text-white px-3 text-sm rounded-r-md hover:bg-blue-700">Copiar</button>
        </div>
        <p className="text-xs text-gray-500 mt-6 animate-pulse">Aguardando confirmação do pagamento...</p>
      </div>
    </div>
  );
};