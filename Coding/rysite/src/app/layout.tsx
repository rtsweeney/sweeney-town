import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import './toolbox.css';
import Navigation from '@/components/Navigation';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-plex-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sweeney Town — Useful tools by Ryan Sweeney',
  description:
    'Practical web apps, engineering calculators, sports models, and experiments built by Ryan Sweeney.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/toolbox.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#282c20',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${plexMono.variable}`}>
      <body>
        <ServiceWorkerRegistration />
        <Navigation />
        {children}
      </body>
    </html>
  );
}
