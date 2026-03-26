import type { Metadata } from "next";
import { Inter, Montserrat } from 'next/font/google';
import { Providers } from "./providers"; 
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { FloatingIntelButton } from "@/components/floating-intel-button";
import "./globals.css";

// 🛠️ Typography: Force font-black and tracking-tighter via CSS variables
const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter', 
  display: 'swap' 
});

const montserrat = Montserrat({ 
  subsets: ['latin'], 
  weight: ['700', '800', '900'], 
  variable: '--font-montserrat', 
  display: 'swap' 
});

export const metadata: Metadata = {
  title: 'Leopardfish Intel | Tactical Educator Intelligence',
  description: 'Military-grade precision intel for international educators.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body 
        className={`
          ${inter.variable} 
          ${montserrat.variable} 
          font-sans antialiased min-h-screen 
          bg-background text-white 
          selection:bg-primary selection:text-white
          overflow-x-hidden
        `}
      >
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            
            {/* 🛰️ Main Content Area: flex-1 keeps footer at bottom */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            
            <Footer />
            <FloatingIntelButton />
          </div>
        </Providers>
      </body>
    </html>
  );
}