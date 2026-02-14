import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border/40 py-6 md:py-8">
      <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <GraduationCap className="h-6 w-6 text-primary mr-2" />
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Know Before You Go. All rights reserved.
          </p>
        </div>
        <nav className="flex gap-4 sm:gap-6">
          <Link href="#" className="text-sm hover:underline underline-offset-4 text-muted-foreground">
            Terms of Service
          </Link>
          <Link href="#" className="text-sm hover:underline underline-offset-4 text-muted-foreground">
            Privacy Policy
          </Link>
          <Link href="#" className="text-sm hover:underline underline-offset-4 text-muted-foreground">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
