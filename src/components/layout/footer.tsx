import Link from "next/link";
import { Linkedin, Facebook } from "lucide-react";
import { Binoculars } from "@/components/icons/Binoculars";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-16 bg-[#020617] print:hidden">
      <div className="container mx-auto px-4 md:px-6 flex flex-col items-center text-center">
        
        {/* Brand Signature */}
        <div className="flex items-center mb-10">
          <Binoculars className="h-6 w-6 mr-2 text-[#f97316]" />
          <span className="font-bold text-lg tracking-tighter text-white">
            <span className="text-[#f97316]">Leopardfish</span> <span className="text-[#007FFF]">Intel</span>
          </span>
        </div>

        {/* Sovereign Liability Shield */}
        <div className="bg-[#0e1628] border-l-4 border-[#d6a65d] p-6 rounded-lg max-w-lg mx-auto shadow-xl text-left mb-8">
          <h4 className="text-white font-semibold flex items-center gap-2 mb-2">
            <span>⚖️</span> Important disclosure
          </h4>
          <p className="text-white/80 text-sm leading-relaxed antialiased font-medium">
            Leopardfish Intel provides data-driven insights for informational purposes only and does not offer financial, legal, or immigration advice. Final decisions and due diligence are the responsibility of each teacher. International postings carry risks; teachers should ensure adequate personal financial reserves before relocating.
          </p>
        </div>

        {/* Inline Legal Nodes */}
        <div className="flex flex-wrap justify-center gap-6 mb-10">
          <Link href="#" className="text-xs font-bold text-gray-500 hover:text-white transition-colors">
            Privacy policy
          </Link>
          <Link href="#" className="text-xs font-bold text-gray-500 hover:text-white transition-colors">
            Terms of service
          </Link>
          <Link href="/admin/seed-data" className="text-xs font-bold text-gray-500/40 hover:text-white transition-colors">
            Data hub
          </Link>
        </div>

        {/* Social Connectivity Row */}
        <div className="flex gap-8 mb-8">
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

        {/* Bottom Metadata */}
        <div className="pt-8 border-t border-white/5 w-full max-w-xs">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            &copy; 2026 Leopardfish Intel. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
