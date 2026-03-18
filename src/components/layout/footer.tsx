import Link from "next/link";
import { Linkedin, Facebook } from "lucide-react";
import BrandLogo from "@/components/branding/BrandLogo";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-10 bg-[#020617] print:hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          
          {/* Left Column: Brand & Social */}
          <div className="md:col-span-1 flex flex-col items-start gap-6">
            <Link href="/" prefetch={false}>
              <BrandLogo />
            </Link>
            
            <div className="flex gap-5">
              <Link 
                href="https://www.linkedin.com/in/leopardfish-travels-24b28267/" 
                target="_blank" 
                rel="noopener noreferrer"
                prefetch={false}
                className="text-gray-500 hover:text-[#f97316] transition-colors"
                aria-label="Visit our LinkedIn"
              >
                <Linkedin className="size-5" />
              </Link>
              <Link 
                href="https://www.facebook.com/leopardfish" 
                target="_blank" 
                rel="noopener noreferrer"
                prefetch={false}
                className="text-gray-500 hover:text-[#f97316] transition-colors"
                aria-label="Visit our Facebook"
              >
                <Facebook className="size-5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Disclosure */}
          <div className="md:col-span-2 border-l border-[#d6a65d]/40 pl-6 py-1">
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-medium antialiased">
              Leopardfish Intel provides data-driven insights for informational purposes only and does not offer financial, legal, or immigration advice. Final decisions and due diligence are the responsibility of each teacher. International postings carry risks; teachers should ensure adequate personal financial reserves before relocating.
            </p>
          </div>
        </div>

        {/* Bottom Bar: Horizontal Legal Nodes */}
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap justify-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            <Link href="#" prefetch={false} className="hover:text-white transition-colors">Privacy policy</Link>
            <span className="text-gray-800/40 select-none">•</span>
            <Link href="#" prefetch={false} className="hover:text-white transition-colors">Terms of service</Link>
            <span className="text-gray-800/40 select-none">•</span>
            <Link href="/admin/seed-data" prefetch={false} className="hover:text-white transition-colors">Data hub</Link>
          </div>
          
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
            &copy; 2026 Leopardfish Intel
          </p>
        </div>
      </div>
    </footer>
  );
}
