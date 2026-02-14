import type {Metadata} from 'next';
import './globals.css';
import { cn } from "@/lib/utils";
import { Inter, Montserrat } from 'next/font/google';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const montserrat = Montserrat({ subsets: ['latin'], weight: ['700'], variable: '--font-montserrat' })

export const metadata: Metadata = {
  title: 'Know Before You Go',
  description: 'Find your next teaching job abroad with confidence.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(
          "min-h-screen bg-background font-body antialiased",
          inter.variable,
          montserrat.variable
        )}>
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
