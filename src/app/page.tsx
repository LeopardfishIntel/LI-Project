import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans">
      {/* --- HERO SECTION --- */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop')` }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Navigation */}
        <nav className="relative z-20 flex items-center justify-between px-10 py-6">
          <div className="flex items-center gap-12">
            <span className="text-xl font-bold tracking-tighter uppercase">Leopardfish <span className="text-[#007FFF]">Intel</span></span>
            <div className="hidden gap-8 text-sm font-semibold uppercase tracking-wider opacity-80 md:flex">
              <a href="#" className="hover:text-[#007FFF]">Discover</a>
              <a href="#" className="hover:text-[#007FFF]">Evaluate</a>
              <a href="#" className="hover:text-[#007FFF]">Decide</a>
              <a href="#" className="hover:text-[#007FFF]">Directory</a>
              <a href="#" className="hover:text-[#007FFF]">Profile</a>
              <a href="#" className="hover:text-[#007FFF]">Enquiry</a>
            </div>
          </div>
          <div className="rounded-lg bg-white/10 p-2 backdrop-blur-md border border-white/20">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex h-[calc(100vh-100px)] flex-col items-center justify-center text-center px-4">
          <h1 className="text-7xl font-black tracking-tighter sm:text-9xl">
            <span className="text-[#FF4D00]">Leopard</span><span className="text-slate-400">fish</span> <span className="text-[#007FFF]">Intel</span>
          </h1>
          <p className="mt-6 text-2xl font-medium tracking-tight sm:text-4xl">
            Move with certainty, not just hope.
          </p>
          <button className="mt-12 rounded-xl bg-[#007FFF] px-14 py-5 text-xl font-bold shadow-2xl transition-all hover:scale-105 hover:bg-[#0066CC]">
            Start Your Journey
          </button>
        </div>
      </section>

      {/* --- STATS BAR --- */}
      <div className="bg-[#0f172a] border-y border-slate-800 py-8">
        <div className="mx-auto max-w-6xl grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
          <div><p className="text-3xl font-bold">8</p><p className="text-xs uppercase tracking-widest text-slate-500">Schools</p></div>
          <div><p className="text-3xl font-bold">8</p><p className="text-xs uppercase tracking-widest text-slate-500">Countries</p></div>
          <div><p className="text-3xl font-bold">101</p><p className="text-xs uppercase tracking-widest text-slate-500">Teachers</p></div>
          <div><p className="text-3xl font-bold">127</p><p className="text-xs uppercase tracking-widest text-slate-500">Comparisons</p></div>
        </div>
      </div>

      {/* --- TEACH OVERSEAS SECTIONS --- */}
      <section className="mx-auto max-w-6xl px-4 py-24 space-y-32">
        <h2 className="text-center text-4xl font-bold mb-20">Teach Overseas: Know Before You Go</h2>

        {/* Step 1 */}
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="relative w-full md:w-1/2 aspect-video rounded-3xl overflow-hidden shadow-2xl">
             <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b" className="object-cover w-full h-full" alt="Step 1" />
             <div className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="text-4xl font-black italic">STEP 1</span></div>
          </div>
          <div className="w-full md:w-1/2">
            <h3 className="text-4xl font-black uppercase mb-4">Discover</h3>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">By aligning your specific expertise and personal profile with our insider data, we identify the 'nook' where you won't just fit the brief—you'll belong to the community.</p>
            <button className="bg-[#FF4D00] px-8 py-3 rounded-lg font-bold">Discover</button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="relative w-full md:w-1/2 aspect-video rounded-3xl overflow-hidden shadow-2xl">
             <img src="https://images.unsplash.com/photo-1488459711615-de64ef5996f6" className="object-cover w-full h-full" alt="Step 2" />
             <div className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="text-4xl font-black italic">STEP 2</span></div>
          </div>
          <div className="w-full md:w-1/2">
            <h3 className="text-4xl font-black uppercase mb-4">Evaluate</h3>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">Our Contract Decoder cuts through the fluff, calculates your actual take-home pay, and maps your genuine disposable income. Focus on your real financial position.</p>
            <button className="bg-[#FF4D00] px-8 py-3 rounded-lg font-bold">Evaluate</button>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#020617] border-t border-slate-800 pt-20 pb-10 px-10">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-16">
          <div>
            <p className="font-bold mb-4">Leopardfish Intel</p>
            <p className="text-xs text-slate-500 leading-relaxed">Your international teaching journey, mapped. Find your ideal destination, calculate your real-world savings, and compare school offers side-by-side.</p>
          </div>
          <div>
            <p className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-500">Quick Links</p>
            <div className="flex flex-col gap-2 text-sm text-slate-400">
              <a href="#">Discover</a><a href="#">Evaluate</a><a href="#">Decide</a>
            </div>
          </div>
          <div>
            <p className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-500">Connect</p>
            <p className="text-sm text-slate-400">Contact | Data Admin | Terms of Service</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
