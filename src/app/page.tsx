import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import Roadmap from '@/components/roadmap';
import { Button } from '@/components/ui/button';

export default function Home() {
  const imageUrl = "https://images.unsplash.com/photo-1495954484750-af469f2f9be5?q=80&w=2070&auto=format&fit=crop";
  const imageHint = "sandy beach";

  return (
    <>
      <section className="relative w-full h-[80vh]">
        <Image
          src={imageUrl}
          alt="Calm beach with blue sky"
          fill
          className="object-cover"
          data-ai-hint={imageHint}
          priority
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative container mx-auto px-4 md:px-6 flex flex-col justify-center text-center h-full py-16">
          <div className="flex-grow flex flex-col items-center justify-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 normal-case [text-shadow:0_2px_4px_rgba(0,0,0,0.6)]">
              <span className="text-accent">Leopard</span><span className="text-primary">fish Intel</span>
            </h1>
            <p className="max-w-3xl mx-auto text-primary-foreground md:text-xl mb-8 [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
              Move with certainty, not just hope.
            </p>
            <Link href="/discover">
                <Button size="lg" className="h-12 group hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-shadow">
                    Start Your Journey
                </Button>
            </Link>
            <div className="mt-16">
              <KeyFactsSection />
            </div>
          </div>
        </div>
      </section>

      <Roadmap />
    </>
  );
}
