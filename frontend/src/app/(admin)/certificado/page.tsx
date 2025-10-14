"use client";

import { useState } from 'react';

export default function CertificadoPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGenerateCertificate = async () => {
    setIsLoading(true);
    setMessage('');
    const token = localStorage.getItem('token');

    if (!token) {
      setMessage("Erro: Você não está autenticado.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/generate-certificate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const disposition = response.headers.get('content-disposition');
        let filename = 'certificado.pdf';
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        setMessage(`Erro ao gerar certificado: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Erro de rede:", error);
      setMessage("Erro de conexão ao tentar gerar o certificado.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-amber-300">Parabéns pela Conclusão!</h1>
        <p className="text-lg md:text-xl text-gray-300 mt-4 max-w-2xl">
          Você completou todas as aulas do curso Saberes da Floresta.
        </p>
      </header>
      
      <main className="bg-gray-800/50 p-6 sm:p-10 rounded-lg shadow-xl border border-gray-700 w-full max-w-lg">
        <p className="mb-6 text-base md:text-lg">
          Clique no botão abaixo para gerar e baixar o seu certificado oficial.
        </p>
        <button
          onClick={handleGenerateCertificate}
          disabled={isLoading}
          className="bg-green-600 text-white font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-lg text-base sm:text-lg hover:bg-green-700 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-wait"
        >
          {isLoading ? 'A gerar seu certificado...' : '🎓 Gerar Certificado'}
        </button>
        {message && <p className="mt-4 text-red-400">{message}</p>}
      </main>
    </div>
  );
}