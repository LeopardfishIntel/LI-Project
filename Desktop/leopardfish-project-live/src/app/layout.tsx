import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Leopardfish Live",
  description: "Live preview for the Leopardfish project.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
