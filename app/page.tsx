export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-primary mb-8 text-center uppercase font-headline">
          Leopardfish Intel
        </h1>
        <div className="bg-card p-6 rounded-lg border border-border mb-8 text-center">
          <p className="text-xl font-semibold">Due Diligence Row</p>
        </div>
        <div className="flex justify-center">
          <button className="rounded-lg bg-primary px-8 py-4 text-white font-bold text-lg">
            Azure Blue Button
          </button>
        </div>
      </div>
    </main>
  );
}
