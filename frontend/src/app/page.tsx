// NOVIDADE: Esta linha é obrigatória no Next.js para componentes que usam interatividade e estado.
"use client";

// NOVIDADE: Importamos o 'useState' do React para gerenciar o estado (memória) do formulário.
import { useState } from "react";

export default function LoginPage() {
  // NOVIDADE: Criamos os "estados" para guardar o que o usuário digita.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(''); // Para mostrar mensagens de erro ou sucesso

  // NOVIDADE: Esta função será chamada quando o usuário clicar em "Entrar".
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Impede que a página recarregue ao enviar o formulário
    setMessage(''); // Limpa mensagens antigas

    try {
        // Enviando os dados para o nosso backend!
        const response = await fetch('http://localhost:3001/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // CORREÇÃO AQUI: O campo da senha agora é 'password' para bater com o backend
          body: JSON.stringify({ email: email, password: password }),
        });

        const data = await response.json();

        if (response.ok) {
          // Se o login for bem-sucedido
          console.log("Login com sucesso!", data);
          setMessage(`Login bem-sucedido! Seu token é: ${data.token}`);
          // No futuro, salvaremos o token e redirecionaremos o usuário
        } else {
          // Se o login falhar
          console.error("Erro no login:", data);
          setMessage(`Erro: ${data.message || 'Ocorreu um erro.'}`);
        }
    } catch (error) {
        console.error("Falha na comunicação com o servidor:", error);
        setMessage("Erro de conexão: Não foi possível se comunicar com o servidor.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center">Acesso à Área de Membros</h1>
        {/* NOVIDADE: Associamos nossa função handleSubmit ao evento de envio do formulário */}
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
              // NOVIDADE: Ligamos este campo ao nosso estado 'email'
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
              // NOVIDADE: Ligamos este campo ao nosso estado 'password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="********"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
            >
              Entrar
            </button>
          </div>
        </form>
        {/* NOVIDADE: Mostra a mensagem de sucesso ou erro aqui */}
        {message && <p className="mt-4 text-center text-sm">{message}</p>}
      </div>
    </main>
  );
}