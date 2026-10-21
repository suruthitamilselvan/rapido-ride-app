import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import Navbar from '../components/Navbar';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: 'Rapido - Bike Taxi, Auto & Cabs',
  description: 'Fast, affordable, and safe ride-hailing with real-time live map tracking, 4-digit start OTP, and instant Stripe payments.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className={`${nunito.className} min-h-screen flex flex-col bg-[#FDFDFD] text-[#2D283E] antialiased selection:bg-[#F1F5D8] selection:text-[#2D283E]`}>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="bg-[#EFEFEF]/80 text-[#6E6680] text-xs py-7 border-t border-[#E5E5E5] mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-[#2D283E] font-bold">
              <span>Rapido Urban Mobility</span>
              <span>•</span>
              <span className="text-[#957DAD]">Next.js + Express + Socket.IO + Stripe</span>
            </div>
            <p className="text-[#888199]">Crafted with a gentle pastel aesthetic for safe, reliable city commuting.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
