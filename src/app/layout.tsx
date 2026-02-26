import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Leopardfish Intel | Due Diligence Systems',
  description: 'Intelligence systems for high-stakes due diligence.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>
        <nav className="fixed top-0 z-50 w-full glass">
          <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
            <span className="text-xl font-black tracking-tighter uppercase">Leopardfish <span className="text-[#007FFF]">Intel</span></span>
            <div className="hidden space-x-8 text-sm font-medium md:flex">
              <a href="#" className="hover:text-[#007FFF] transition-colors">Systems</a>
              <a href="#" className="hover:text-[#007FFF] transition-colors">Network</a>
              <a href="#" className="hover:text-[#007FFF] transition-colors">Contact</a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
