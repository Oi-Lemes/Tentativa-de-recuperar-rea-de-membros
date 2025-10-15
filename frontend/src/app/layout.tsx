import type { Metadata, Viewport } from "next"; // Importa o Viewport
import { Great_Vibes } from "next/font/google";
import "./globals.css";

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  weight: "400",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Área de Membros",
  description: "Acesso exclusivo para membros",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Membros",
  },
};

// --- ALTERAÇÃO AQUI: themeColor movido para viewport ---
export const viewport: Viewport = {
  themeColor: "#b9d7a1",
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