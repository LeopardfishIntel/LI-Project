import type { Metadata } from "next";
import { Inter, Montserrat } from 'next/font/google';
import { ClientShield } from "@/components/ClientShield";
// ✅ CORRECTED: Pulling from the unified firebase alias
import { FirebaseClientProvider } from "@firebase/index"; 
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { FloatingIntelButton } from "@/components/floating-intel-button";
import "./globals.css";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const montserrat = Montserrat({ subsets: ['latin'], weight: ['700', '800', '900'], variable: '--font-montserrat' });

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
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${montserrat.variable} font-sans bg-[#020617] text-white antialiased`}>
        <FirebaseClientProvider>
          <ClientShield>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <FloatingIntelButton />
            </div>
          </ClientShield>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
