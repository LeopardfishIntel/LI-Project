import { Linkedin, Facebook, Binoculars } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 bg-background print:hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12">
            <div className="flex flex-col items-center md:items-start space-y-4">
                <div className="flex items-center">
                    <Binoculars className="h-6 w-6 mr-2 text-primary" />
                    <span className="font-bold font-headline text-lg tracking-tighter text-white">
                      <span className="text-primary">Leopard</span><span className="text-accent">fish Intel</span>
                    </span>
                </div>
                <p className="text-xs text-muted-foreground text-center md:text-left leading-relaxed max-w-xs font-medium">
                    Your international teaching journey, mapped. Find your ideal destination, calculate your real-world savings, and compare school offers side-by-side.
                </p>
            </div>
            
             <div className="text-center md:text-right flex flex-col items-center md:items-end space-y-6">
                <div className="flex gap-4">
                     <Link href="https://www.linkedin.com/in/leopardfish-travels-24b28267/" aria-label="LinkedIn profile" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-sm bg-white/5 hover:bg-primary/10 transition-colors group">
                        <Linkedin className="h-5.5 w-5.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                     <Link href="https://www.facebook.com/leopardfish" aria-label="Facebook page" target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-sm bg-white/5 hover:bg-primary/10 transition-colors group">
                        <Facebook className="h-5.5 w-5.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                </div>
                <nav className="flex flex-col gap-2 items-center md:items-end">
                    <Link href="/discover" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Discover</Link>
                    <Link href="/financial-forecaster" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Evaluate</Link>
                    <Link href="/compare" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Decide</Link>
                    <Link href="/prepare" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Prepare</Link>
                    <Link href="/enquiry" className="text-sm font-bold text-muted-foreground/50 hover:text-white transition-colors">Contact</Link>
                    <Link href="/admin/seed-data" className="text-sm font-bold text-muted-foreground/50 hover:text-white transition-colors">Data hub</Link>
                </nav>
            </div>
        </div>
        
        <div className="text-center text-[10px] text-muted-foreground/40 border-t border-white/5 pt-8 mt-12 space-y-4">
            <p className="font-bold uppercase tracking-widest text-white/60">&copy; {new Date().getFullYear()} <Link href="https://www.leopardfishintel.com" className="hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">Leopardfish Intel</Link>. All rights reserved.</p>
            <p className="max-w-4xl mx-auto leading-relaxed font-medium"><strong>Disclaimer:</strong> Leopardfish Intel is a platform for information and comparison purposes only. We do not act as a recruitment agency and are not affiliated with any school. All data is provided for guidance and should be verified with official sources. Your career decisions are your own.</p>
        </div>
      </div>
    </footer>
  );
}