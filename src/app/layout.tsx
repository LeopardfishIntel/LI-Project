import './globals.css';

export const metadata = {
  title: 'Leopardfish Intel',
  description: 'Evidence-led insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#020617] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
