import Link from "next/link";
import { Linkedin, Facebook } from "lucide-react";
import { Binoculars } from "@/components/icons/Binoculars";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-16 bg-[#020617] print:hidden">
      <div className="container mx-auto px-4 md:px-6">
        
        {/* Sovereign Liability Shield: Premium Minimalist Aesthetic */}
        <div className="bg-[#0e1628] border-l-4 border-[#d6a65d] p-6 rounded-lg max-w-lg mx-auto shadow-xl mb-12">
          <h4 className="text-white font-semibold flex items-center gap-2 mb-2">
            <span>⚖️</span> Important disclosure
          </h4>
          <p className="text-white/80 text-sm leading-relaxed antialiased font-medium">
            Leopardfish Intel provides data-driven insights and benchmarks for informational purposes only. We do not offer financial, legal, or immigration advice. Final contractual decisions and due diligence remain the responsibility of the individual teacher. International postings carry inherent risks; teachers should maintain appropriate personal financial reserves before relocating.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            {/* Brand Intelligence Column */}
            <div className="space-y-4">
                <div className="flex items-center">
                    <Binoculars className="h-6 w-6 mr-2 text-[#f97316]" />
                    <span className="font-bold text-lg tracking-tighter text-white">
                      <span className="text-[#f97316]">Leopardfish</span> <span className="text-[#007FFF]">Intel</span>
                    </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xs font-medium">
                    Tactical intelligence for international educators. Move with certainty, not just hope.
                </p>
            </div>
            
            {/* Quick Links Column */}
            <div className="text-left">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f97316] mb-6">Quick links</h4>
                <nav className="flex flex-col gap-3">
                    <Link href="/discover" className="text-sm font-bold text-gray-500 hover:text-white transition-colors">Discover</Link>
                    <Link href="/financial-forecaster" className="text-sm font-bold text-gray-500 hover:text-white transition-colors">Evaluate</Link>
                    <Link href="/compare" className="text-sm font-bold text-gray-500 hover:text-white transition-colors">Decide</Link>
                    <Link href="/prepare" className="text-sm font-bold text-gray-500 hover:text-white transition-colors">Prepare</Link>
                </nav>
            </div>

            {/* Legal Column */}
            <div className="text-left">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f97316] mb-6">Legal</h4>
                <nav className="flex flex-col gap-3">
                    <Link href="#" className="text-sm font-bold text-gray-500 hover:text-white transition-colors">Terms and conditions</Link>
                    <Link href="#" className="text-sm font-bold text-gray-500 hover:text-white transition-colors">Privacy policy</Link>
                    <Link href="#" className="text-sm font-bold text-gray-500 hover:text-white transition-colors">Cookie policy</Link>
                    <Link href="#" className="text-sm font-bold text-gray-500 hover:text-white transition-colors">Data attribution</Link>
                </nav>
            </div>

            {/* Connect Column */}
            <div className="text-left">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f97316] mb-6">Connect</h4>
                <div className="flex gap-4">
                    <Link 
                        href="https://www.linkedin.com/in/leopardfish-travels-24b28267/" 
                        aria-label="Visit our LinkedIn" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-[#f97316] transition-colors"
                    >
                        <Linkedin className="size-5" />
                    </Link>
                    <Link 
                        href="https://www.facebook.com/leopardfish" 
                        aria-label="Visit our Facebook" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-[#f97316] transition-colors"
                    >
                        <Facebook className="size-5" />
                    </Link>
                </div>
            </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                &copy; 2026 Leopardfish Intel. All rights reserved.
            </p>
            <div className="flex gap-6">
                <Link href="/admin/seed-data" className="text-[10px] font-black text-gray-500/40 uppercase tracking-widest hover:text-white transition-colors">Data hub</Link>
                <Link href="/enquiry" className="text-[10px] font-black text-gray-500/40 uppercase tracking-widest hover:text-white transition-colors">Contact</Link>
            </div>
        </div>
      </div>
    </footer>
  );
}
