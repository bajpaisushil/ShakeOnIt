import './globals.css';
import type { Metadata } from 'next';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'ShakeOnIt — make casual promises stick',
  description:
    'Turn informal promises into friendly micro-contracts. Free pinky-promise mode, or upgrade to Aadhaar-eSigned court-acceptable contracts.',
  openGraph: {
    title: 'ShakeOnIt 🤝',
    description: 'Pinky promises, made to stick. Court-acceptable when you need them.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Header />
        {children}
      </body>
    </html>
  );
}
