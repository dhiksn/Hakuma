import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/query-provider';
import { LenisProvider } from '@/components/providers/lenis-provider';
import { Navbar } from '@/components/anime/navbar';
import { Footer } from '@/components/anime/footer';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Hakuma — Streaming Anime & Arsip Editorial',
    template: '%s | Hakuma',
  },
  description:
    'Platform streaming dan katalog anime dewasa dengan estetika editorial monokrom dan pemutar resolusi tinggi.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon0.svg', type: 'image/svg+xml' },
      { url: '/icon1.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`dark ${spaceGrotesk.variable}`}>
      <head>
        {/* Apple Mobile Web App Title */}
        <meta name="apple-mobile-web-app-title" content="Hakuma" />
        {/* Google Fonts: Momo Trust Display */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Momo+Trust+Display:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --font-momo-display: 'Momo Trust Display', var(--font-sans), sans-serif;
            }
          `
        }} />
      </head>
      <body className="min-h-screen bg-black text-white antialiased flex flex-col font-sans selection:bg-white selection:text-black">
        <QueryProvider>
          <LenisProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </LenisProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
