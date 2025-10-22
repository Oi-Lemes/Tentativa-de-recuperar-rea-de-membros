// Caminho: frontend/src/contexts/UserContext.tsx
"use client";

import { createContext, useState, useContext, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';

// Define a estrutura (o "formato") dos dados do utilizador que vamos receber do backend
// Exportamos o 'User' para ser usado no nosso novo componente
export interface User {
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
  refetchUser: () => void; // Uma função para podermos recarregar os dados do utilizador
  // --- MODIFICAÇÃO AQUI ---
  // Expor a função 'setUser' para podermos alterá-lo de outros componentes
  setUser: Dispatch<SetStateAction<User | null>>;
}

// Cria o Contexto
const UserContext = createContext<UserContextType | undefined>(undefined);

// Cria o "Provider", o componente que vai gerir e fornecer os dados
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${backendUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // --- LÓGICA DO 'FORCE_PLAN' REMOVIDA ---
        // Agora apenas definimos o usuário que vem do backend.
        // O nosso novo componente visual fará a sobreposição.
        setUser(data); 

      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do utilizador:", error);
    } finally {
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // O Provider devolve o seu "valor"
  return (
    <UserContext.Provider value={{ user, loading, refetchUser: fetchUser, setUser }}> 
      {/* --- MODIFICAÇÃO AQUI: Adicionamos o 'setUser' ao 'value' --- */}
      {children}
    </UserContext.Provider>
  );
};

// Hook personalizado para facilitar o uso do contexto
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser deve ser usado dentro de um UserProvider');
  }
  return context;
};