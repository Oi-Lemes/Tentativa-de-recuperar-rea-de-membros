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
      const response = await fetch('http://localhost:3001/generate-certificate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // O backend retorna o PDF diretamente, então precisamos tratar como um "blob"
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Pega o nome do arquivo do header 'Content-Disposition' se disponível
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
    <div className="flex flex-col items-center justify-center h-full text-center">
      <header className="mb-8">
        <h1 className="text-5xl font-bold text-amber-300">Parabéns pela Conclusão!</h1>
        <p className="text-xl text-gray-300 mt-4">
          Você completou todas as aulas do curso Saberes da Floresta.
        </p>
      </header>
      
      <main className="bg-gray-800/50 p-10 rounded-lg shadow-xl border border-gray-700">
        <p className="mb-6">
          Clique no botão abaixo para gerar e baixar o seu certificado oficial.
        </p>
        <button
          onClick={handleGenerateCertificate}
          disabled={isLoading}
          className="bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-lg hover:bg-green-700 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-wait"
        >
          {isLoading ? 'Gerando seu certificado...' : '🎓 Gerar Certificado'}
        </button>
        {message && <p className="mt-4 text-red-400">{message}</p>}
      </main>
    </div>
  );
}