import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main>
      <section className="relative w-full h-screen">
        <div className="absolute inset-0 bg-background">
          <Image
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
            alt="Scenic view of a lake with mountains"
            fill
            priority
            className="object-cover brightness-50"
            data-ai-hint="travel lake"
          />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-primary-foreground px-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 [text-shadow:0_2px_4px_rgba(0,0,0,0.7)]">
            Leopardfish Intel (Live)
          </h1>
          <p className="max-w-2xl text-lg md:text-xl mb-8 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">
            This is the homepage in the correct 'leopardfish-project-live' directory.
          </p>
          <Link href="#">
            <Button size="lg" variant="default">Azure Button</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
