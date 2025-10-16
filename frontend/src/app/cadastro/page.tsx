"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3001/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nome, // O backend espera 'name' e não 'nome'
          email: email,
          // O backend precisa saber para onde redirecionar o usuário
          // depois que ele clicar no link mágico.
          destination: "http://localhost:3000/auth/callback",
        }),
      });

      if (response.ok) {
        setMessage("Link de acesso enviado para o seu e-mail! Verifique sua caixa de entrada.");
        // Redireciona para a página de login após 3 segundos
        setTimeout(() => {
          router.push("/");
        }, 3000);
      } else {
        const errorData = await response.json();
        setMessage(`Erro ao cadastrar: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      setMessage("Erro ao cadastrar. Tente novamente mais tarde.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Crie sua conta
        </h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="nome"
              className="text-sm font-medium text-gray-700"
            >
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cadastrar
            </button>
          </div>
        </form>
        {message && <p className="text-center text-sm text-gray-600">{message}</p>}
        <p className="text-sm text-center text-gray-600">
          Já tem uma conta?{" "}
          <a
            href="/"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Faça login
          </a>
        </p>
      </div>
    </div>
  );
}