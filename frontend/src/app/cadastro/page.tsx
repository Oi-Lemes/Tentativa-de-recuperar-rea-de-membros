"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';

export default function CadastroPage() {
  const [nome, setNome] = useState(''); // Estado para o nome
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');

    try {
      const response = await fetch('http://localhost:3001/usuarios', { // Apontar para a rota de /usuarios
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Enviar 'nome', 'email' e 'password'
        body: JSON.stringify({ nome, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Cadastro realizado com sucesso! Redirecionando para o login...");
        setTimeout(() => {
          router.push('/'); // Redireciona para a página de login após o sucesso
        }, 2000);
      } else {
        setMessage(`Erro: ${data.message || 'Ocorreu um erro no cadastro.'}`);
      }
    } catch (error) {
        setMessage("Erro de conexão: Não foi possível se comunicar com o servidor.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center">Criar a sua Conta</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CAMPO DE NOME ADICIONADO */}
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-300">
              Nome Completo
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Seu nome completo"
            />
          </div>
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
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="********"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Criar Conta
            </button>
          </div>
        </form>
        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </main>
  );
}