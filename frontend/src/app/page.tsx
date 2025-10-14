"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');
    setIsSuccess(false);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setMessage(data.message);
      } else {
        setMessage(`Erro: ${data.message || 'Ocorreu um erro.'}`);
      }
    } catch (error) {
      setMessage("Erro de conexão: Não foi possível comunicar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-md">
        
        {isSuccess ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-green-400">Verifique o seu Email!</h1>
            <p className="mt-4 text-gray-300">{message}</p>
            <p className="mt-2 text-sm text-gray-400">Enviámos um link mágico para a sua caixa de entrada. Clique nele para aceder à sua conta.</p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-center">Aceder à Área de Membros</h1>
            <p className="text-center text-gray-400">Insira o email que usou na compra para receber o seu link de acesso.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="seu@email.com"
                  disabled={isLoading}
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-wait"
                >
                  {isLoading ? 'A enviar...' : 'Enviar Link de Acesso'}
                </button>
              </div>
            </form>
            {message && <p className="mt-4 text-center text-sm text-red-400">{message}</p>}
          </>
        )}
      </div>
    </main>
  );
}