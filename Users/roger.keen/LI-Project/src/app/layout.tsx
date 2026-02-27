import type {Metadata} from 'next';
import './globals.css';
import { cn } from "@/lib/utils";
import { Inter, Montserrat } from 'next/font/google';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Providers } from './providers';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const montserrat = Montserrat({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-montserrat' })

export const metadata: Metadata = {
  title: 'Leopardfish Intel | Professional Educator Due Diligence',
  description: 'Military-grade precision intel for international educators. Move with certainty, not just hope.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(
          "min-h-screen bg-background antialiased font-body",
          inter.variable,
          montserrat.variable
        )}>
        <Providers>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset className="bg-background">
                    <div className="relative flex min-h-screen flex-col">
                        <Header />
                        <main className="flex-1">{children}</main>
                        <Footer />
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}