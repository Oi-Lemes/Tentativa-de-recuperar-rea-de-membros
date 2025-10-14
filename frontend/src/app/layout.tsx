import type { Metadata } from "next";
// Importa apenas a fonte correta do Google Fonts
import { Great_Vibes } from "next/font/google";
import "./globals.css";

// Configura a fonte Great Vibes para ser usada no projeto
const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  weight: "400",
  subsets: ["latin"],
  display: 'swap', // Melhora a performance de carregamento da fonte
});

export const metadata: Metadata = {
  title: "Área de Membros",
  description: "Acesso exclusivo para membros",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body
        // Adiciona a variável da fonte Great Vibes e uma classe para garantir a aparência
        className={`${greatVibes.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}