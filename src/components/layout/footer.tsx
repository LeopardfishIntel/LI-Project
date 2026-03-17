import Link from "next/link";
import { Binoculars } from "@/components/icons/Binoculars";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 bg-[#020617] print:hidden">
      <div className="container mx-auto px-4 md:px-6">
        
        {/* Liability Shield: High-Visibility Disclaimer */}
        <div className="mb-12 p-6 md:p-8 bg-white/[0.02] border-l-4 border-[#f97316] rounded-sm shadow-2xl">
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
            <span className="text-white font-bold uppercase tracking-widest text-xs block mb-2">Liability shield</span>
            Leopardfish Intel provides data-driven insights and benchmarks for informational purposes only. We do not provide financial, legal, or migration advice. All final contractual decisions and due diligence remain the sole responsibility of the individual teacher. International postings involve inherent risks; establish your own prudent financial reserves before relocating.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand Intelligence Column */}
            <div className="md:col-span-2 flex flex-col items-center md:items-start space-y-4">
                <div className="flex items-center">
                    <Binoculars className="h-6 w-6 mr-2 text-[#f97316]" />
                    <span className="font-bold text-lg tracking-tighter text-white">
                      <span className="text-[#f97316]">Leopardfish</span> <span className="text-[#007FFF]">Intel</span>
                    </span>
                </div>
                <p className="text-xs text-muted-foreground text-center md:text-left leading-relaxed max-w-xs font-medium">
                    Tactical intelligence for international educators. Calculate your real-world savings and compare school offers with military-grade precision.
                </p>
            </div>
            
            {/* Quick Links Column */}
            <div className="text-center md:text-left">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f97316] mb-6">Quick links</h4>
                <nav className="flex flex-col gap-3">
                    <Link href="/discover" className="text-sm font-bold text-muted-foreground hover:text-white transition-colors">Discover</Link>
                    <Link href="/financial-forecaster" className="text-sm font-bold text-muted-foreground hover:text-white transition-colors">Evaluate</Link>
                    <Link href="/compare" className="text-sm font-bold text-muted-foreground hover:text-white transition-colors">Decide</Link>
                    <Link href="/prepare" className="text-sm font-bold text-muted-foreground hover:text-white transition-colors">Prepare</Link>
                </nav>
            </div>

            {/* Legal Column */}
            <div className="text-center md:text-left">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f97316] mb-6">Legal</h4>
                <nav className="flex flex-col gap-3">
                    <Link href="#" className="text-sm font-bold text-muted-foreground hover:text-white transition-colors">Terms and conditions</Link>
                    <Link href="#" className="text-sm font-bold text-muted-foreground hover:text-white transition-colors">Privacy policy</Link>
                    <Link href="#" className="text-sm font-bold text-muted-foreground hover:text-white transition-colors">Cookie policy</Link>
                    <Link href="#" className="text-sm font-bold text-muted-foreground hover:text-white transition-colors">Data attribution</Link>
                </nav>
            </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
                &copy; 2026 Leopardfish Intel. All rights reserved.
            </p>
            <div className="flex gap-6">
                <Link href="/admin/seed-data" className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest hover:text-white transition-colors">Data hub</Link>
                <Link href="/enquiry" className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest hover:text-white transition-colors">Contact</Link>
            </div>
        </div>
      </div>
    </footer>
  );
}
