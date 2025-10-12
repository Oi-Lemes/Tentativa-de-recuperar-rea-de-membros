import { Suspense } from 'react';
import CallbackClientComponent from './CallbackClientComponent';

// Componente de Fallback que mostra a mensagem "A carregar..."
function LoadingFallback() {
    return (
        <div className="text-center">
            <h1 className="text-3xl font-bold">A carregar...</h1>
            <div className="mt-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <Suspense fallback={<LoadingFallback />}>
        <CallbackClientComponent />
      </Suspense>
    </main>
  );
}