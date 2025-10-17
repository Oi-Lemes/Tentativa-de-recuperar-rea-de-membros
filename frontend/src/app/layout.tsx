import './globals.css';
import { Inter, Great_Vibes } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-great-vibes',
});

export const metadata = {
  title: 'Área de Membros',
  description: 'Acesso exclusivo para membros do curso.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${greatVibes.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}