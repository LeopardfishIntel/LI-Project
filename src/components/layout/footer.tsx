import { GraduationCap, Linkedin, Facebook } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border/40 py-8 bg-card/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center mb-4">
                    <GraduationCap className="h-6 w-6 text-primary mr-2" />
                    <span className="font-bold font-headline">Leopardfish Intel</span>
                </div>
                <p className="text-xs text-muted-foreground text-center md:text-left">
                    Your international teaching journey, mapped. Find your ideal destination, calculate your real-world savings, and compare school offers side-by-side.
                </p>
            </div>
            
            <div className="text-center">
                <h4 className="font-semibold mb-4 uppercase tracking-wider">Quick Links</h4>
                <nav className="flex flex-col gap-2">
                    <Link href="/discover" className="text-sm hover:underline underline-offset-4 text-muted-foreground">Discover</Link>
                    <Link href="/evaluate" className="text-sm hover:underline underline-offset-4 text-muted-foreground">Evaluate</Link>
                    <Link href="/compare" className="text-sm hover:underline underline-offset-4 text-muted-foreground">Decide</Link>
                     <Link href="/directory" className="text-sm hover:underline underline-offset-4 text-muted-foreground">Directory</Link>
                     <Link href="/partners" className="text-sm hover:underline underline-offset-4 text-muted-foreground">Partners</Link>
                </nav>
            </div>

             <div className="text-center md:text-right">
                <h4 className="font-semibold mb-4 uppercase tracking-wider">Connect</h4>
                 <div className="flex justify-center md:justify-end gap-4 mb-4">
                     <Link href="https://www.linkedin.com/in/leopardfish-travels-24b28267/" aria-label="LinkedIn profile" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-primary/10 transition-colors group">
                        <Linkedin className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                     <Link href="https://www.facebook.com/leopardfish" aria-label="Facebook page" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-primary/10 transition-colors group">
                        <Facebook className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                </div>
                <nav className="flex flex-col gap-2 items-center md:items-end">
                    <Link href="#" className="text-sm hover:underline underline-offset-4 text-muted-foreground">Contact</Link>
                    <Link href="#" className="text-sm hover:underline underline-offset-4 text-muted-foreground">Terms of Service</Link>
                    <Link href="#" className="text-sm hover:underline underline-offset-4 text-muted-foreground">Privacy Policy</Link>
                </nav>
            </div>
        </div>
        
        <div className="text-center text-xs text-muted-foreground/80 border-t border-border/40 pt-6 mt-8">
            <p className="mb-2">&copy; {new Date().getFullYear()} <Link href="https://www.leopardfishintel.com" className="hover:text-primary" target="_blank" rel="noopener noreferrer">Leopardfish Intel</Link>. All rights reserved.</p>
            <p><strong>Disclaimer:</strong> Leopardfish Intel is a platform for information and comparison purposes only. We do not act as a recruitment agency and are not affiliated with any school. All data is provided for guidance and should be verified with official sources. Your career decisions are your own.</p>
        </div>
      </div>
    </footer>
  );
}
