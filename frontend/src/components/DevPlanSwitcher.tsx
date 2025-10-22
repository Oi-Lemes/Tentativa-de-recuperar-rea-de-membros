// Caminho: frontend/src/components/DevPlanSwitcher.tsx
"use client";

// Importamos o hook e o tipo User do nosso contexto
import { useUser, User } from '@/contexts/UserContext';

export const DevPlanSwitcher = () => {
  // --- 1. SÓ RENDERIZA EM DESENVOLVIMENTO ---
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const { user, setUser } = useUser();

  // Se não há usuário logado, não mostra nada
  if (!user || !setUser) {
    return null;
  }

  // --- 2. FUNÇÃO PARA MUDAR O PLANO ---
  const handlePlanChange = (plan: 'basic' | 'premium' | 'ultra') => {
    
    // Criamos um novo objeto de usuário FALSO, baseado no usuário atual
    const updatedUser: User = {
      ...user,
      plan: plan,
      
      // --- IMPORTANTE: Ajuste estas regras de acesso conforme sua lógica de negócio ---
      hasLiveAccess: (plan === 'premium' || plan === 'ultra'),
      hasNinaAccess: (plan === 'ultra'),
      hasWalletAccess: (plan === 'ultra'),
    };

    // --- 3. ATUALIZA O ESTADO GLOBAL ---
    setUser(updatedUser);
  };

  // --- ALTERAÇÃO NO ESTILO AQUI ---
  // Estilos inline para a "barra centralizada no rodapé"
  const switcherStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    
    // Substituído 'right: 20px' por esta lógica de centralização:
    left: '50%',
    transform: 'translateX(-50%)',

    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: '10px 15px', // Ajustado o padding
    borderRadius: '8px',
    zIndex: 9999,
    border: '1px solid #fff',
    color: 'white',
    fontFamily: 'sans-serif',
    fontSize: '14px',

    // Adicionado display: flex para alinhar o título e os botões horizontalmente
    display: 'flex',
    alignItems: 'center',
    gap: '15px' // Espaço entre o título e o grupo de botões
  };
  // --- FIM DA ALTERAÇÃO NO ESTILO ---

  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '5px 10px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: isActive ? '#0070f3' : '#555',
    color: 'white',
    fontWeight: isActive ? 'bold' : 'normal',
    whiteSpace: 'nowrap' // Evita que o texto quebre
  });

  return (
    <div style={switcherStyle}>
      {/* Título (sem margem) */}
      <h4 style={{ margin: 0, padding: 0, fontSize: '12px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
        [PAINEL DE TESTE]
      </h4>
      
      {/* --- ALTERAÇÃO NO LAYOUT DOS BOTÕES --- */}
      {/* Alterado para 'flexDirection: row' para ficarem lado a lado */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
        <button onClick={() => handlePlanChange('basic')} style={buttonStyle(user.plan === 'basic')}>
          Basic
        </button>
        <button onClick={() => handlePlanChange('premium')} style={buttonStyle(user.plan === 'premium')}>
          Premium
        </button>
        <button onClick={() => handlePlanChange('ultra')} style={buttonStyle(user.plan === 'ultra')}>
          Ultra
        </button>
      </div>
      {/* --- FIM DA ALTERAÇÃO NOS BOTÕES --- */}
    </div>
  );
};