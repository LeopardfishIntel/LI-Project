import type { Metadata } from "next";
import { Inter, Montserrat } from 'next/font/google';
import { ClientShield } from "@/components/ClientShield";
// FIXED: Direct path to your Firebase provider
import { FirebaseClientProvider } from "@/firebase";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { FloatingIntelButton } from "@/components/floating-intel-button";
import "./globals.css";

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap',
});

const montserrat = Montserrat({ 
  subsets: ['latin'], 
  weight: ['700', '800', '900'], 
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Leopardfish Intel | Tactical Educator Intelligence',
  description: 'Military-grade precision intel for international educators.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <body 
        className={`
          ${inter.variable} 
          ${montserrat.variable} 
          antialiased 
          min-h-screen 
          bg-[#020617] 
          text-white 
          font-sans
          selection:bg-[#f97316] selection:text-white
        `}
      >
        {/* Protocol 2: Hydration Guard via Firebase Provider */}
        <FirebaseClientProvider>
          <ClientShield>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </main>
              <Footer />
              <FloatingIntelButton />
            </div>
          </ClientShield>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}