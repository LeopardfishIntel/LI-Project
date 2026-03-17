import Link from "next/link";
import { Binoculars } from "@/components/icons/Binoculars";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 bg-[#020617] print:hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12">
            <div className="flex flex-col items-center md:items-start space-y-4">
                <div className="flex items-center">
                    <Binoculars className="h-6 w-6 mr-2 text-[#f97316]" />
                    <span className="font-bold text-lg tracking-tighter text-white uppercase">
                      <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
                    </span>
                </div>
                <p className="text-xs text-muted-foreground text-center md:text-left leading-relaxed max-w-xs font-medium">
                    Tactical intelligence for international educators. Calculate your real-world savings and compare school offers with precision.
                </p>
            </div>
            
             <div className="text-center md:text-right flex flex-col items-center md:items-end space-y-6">
                <nav className="flex flex-wrap justify-center md:justify-end gap-6">
                    <Link href="/discover" className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Discover</Link>
                    <Link href="/financial-forecaster" className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Evaluate</Link>
                    <Link href="/compare" className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Decide</Link>
                    <Link href="/prepare" className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Prepare</Link>
                </nav>
                <nav className="flex flex-wrap justify-center md:justify-end gap-4 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                    <Link href="/admin/seed-data" className="hover:text-white transition-colors">Data hub</Link>
                    <span>&copy; {new Date().getFullYear()} Leopardfish Intel</span>
                </nav>
            </div>
        </div>
      </div>
    </footer>
  );
}
