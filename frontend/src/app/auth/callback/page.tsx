"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('A verificar o seu acesso...');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('Token de autenticação não encontrado. Por favor, tente novamente.');
      setStatus('Falha na autenticação');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus(`Bem-vindo, ${data.userName}! A redirecionar...`);
          localStorage.setItem('token', data.token); // Guarda o token JWT final
          router.push('/dashboard'); // Redireciona para a área de membros
        } else {
          setError(data.message || 'Ocorreu um erro na verificação.');
          setStatus('Falha na autenticação');
        }
      } catch (err) {
        setError('Não foi possível comunicar com o servidor. Verifique a sua ligação.');
        setStatus('Falha na autenticação');
      }
    };

    verifyToken();
  }, [searchParams, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{status}</h1>
        {error && <p className="mt-4 text-red-400">{error}</p>}
        {!error && (
            <div className="mt-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            </div>
        )}
      </div>
    </main>
  );
}