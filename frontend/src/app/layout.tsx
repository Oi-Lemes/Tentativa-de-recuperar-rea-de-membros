import type { Metadata } from "next";
import { Great_Vibes } from "next/font/google";
import "./globals.css";

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  weight: "400",
  subsets: ["latin"],
  display: 'swap',
});

// METADATA ATUALIZADO PARA INCLUIR CONFIGURAÇÕES DE PWA
export const metadata: Metadata = {
  title: "Área de Membros",
  description: "Acesso exclusivo para membros",
  manifest: "/manifest.json",
  themeColor: "#b9d7a1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Membros",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body
        className={`${greatVibes.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}