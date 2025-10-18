// Caminho: frontend/src/contexts/UserContext.tsx
"use client";

import { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Define a estrutura (o "formato") dos dados do utilizador que vamos receber do backend
interface User {
  email: string;
  name: string;
  plan: 'basic' | 'premium' | 'ultra';
  hasLiveAccess: boolean;
  hasNinaAccess: boolean;
  hasWalletAccess: boolean;
}

// Define a estrutura do nosso Contexto, que disponibilizará os dados
interface UserContextType {
  user: User | null;
  loading: boolean;
  refetchUser: () => void; // Uma função para podermos recarregar os dados do utilizador quando precisarmos
}

// Cria o Contexto
const UserContext = createContext<UserContextType | undefined>(undefined);

// Cria o "Provider", o componente que vai gerir e fornecer os dados
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    // Se não houver token, não há utilizador logado, então não fazemos nada
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      // Usamos a variável de ambiente para saber o endereço do backend
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      // Chamamos a nova rota /me que criámos no backend para buscar os dados
      const response = await fetch(`${backendUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data); // Guardamos os dados do utilizador no estado
      } else {
        // Se a resposta não for 'ok', o token pode ser inválido ou ter expirado
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do utilizador:", error);
    } finally {
      setLoading(false); // Termina o estado de carregamento
    }
  };

  // Este useEffect faz com que a função fetchUser seja chamada uma vez, quando o componente é montado
  useEffect(() => {
    fetchUser();
  }, []);

  // O Provider devolve o seu "valor" (os dados do utilizador) para todos os componentes "filho"
  return (
    <UserContext.Provider value={{ user, loading, refetchUser: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook personalizado para facilitar o uso do contexto noutras partes da aplicação
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser deve ser usado dentro de um UserProvider');
  }
  return context;
};