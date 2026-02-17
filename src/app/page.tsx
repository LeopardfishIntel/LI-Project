import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import Roadmap from '@/components/roadmap';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find(img => img.id === id);
  return {
    imageUrl: image?.imageUrl ?? "https://picsum.photos/seed/great-blue-sky/2070/1380",
    imageHint: image?.imageHint ?? "beach sky",
    description: image?.description ?? "A beach scene with a great blue sky."
  };
};

export default function Home() {
  const { imageUrl, imageHint, description } = getImage('homepage-hero');

  return (
    <>
      <section
        className="relative w-full h-[68vh] overflow-hidden"
        aria-label={description}
      >
        <img
          src={imageUrl}
          alt={description}
          className="absolute inset-0 w-full h-full object-cover"
          data-ai-hint={imageHint}
        />
        <div className="relative z-10 container mx-auto px-4 md:px-6 flex flex-col justify-center text-center h-full py-16">
            <div className="flex-grow flex flex-col items-center justify-center">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 normal-case [text-shadow:0_2px_4px_rgba(0,0,0,0.6)]">
                <span className="text-accent">Leopard</span><span className="text-primary">fish Intel</span>
                </h1>
                <p className="max-w-3xl mx-auto text-primary-foreground md:text-xl mb-6 [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
                Move with certainty, not just hope.
                </p>
                <Link href="/discover">
                    <Button size="lg" className="h-12 group hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-shadow">
                        Start Your Journey
                    </Button>
                </Link>
            </div>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        <KeyFactsSection />
      </section>

      <Roadmap />
    </>
  );
}
