import type { Metadata } from "next";
import { ClientShield } from "@/components/ClientShield";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leopardfish Tactical App",
  description: "Next.js 15 + Firebase App Hosting",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#020617] text-white antialiased">
        <ClientShield>
          {children}
        </ClientShield>
      </body>
    </html>
  );
}
