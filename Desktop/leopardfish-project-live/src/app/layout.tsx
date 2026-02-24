import type { Metadata } from "next";
import { Inter, Montserrat } from 'next/font/google';
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Leopardfish Live",
  description: "Live preview for the Leopardfish project.",
};

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const montserrat = Montserrat({ subsets: ['latin'], weight: ['700'], variable: '--font-montserrat' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        inter.variable,
        montserrat.variable
      )}>
        {children}
      </body>
    </html>
  );
}
