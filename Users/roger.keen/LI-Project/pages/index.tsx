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
    <div className="flex flex-col min-h-screen">
      <section
        className="relative w-full h-[83.232vh] overflow-hidden"
        aria-label={description}
      >
        <Image
          src={imageUrl}
          alt={description}
          fill
          priority
          className="absolute inset-0 w-full h-full object-cover"
          data-ai-hint={imageHint}
        />
        <div className="relative z-10 container mx-auto px-4 md:px-6 flex flex-col justify-between text-center h-full py-16">
            <div className="flex flex-col items-center">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 normal-case [text-shadow:0_2px_4px_rgba(0,0,0,0.6)]">
                    <span className="text-accent">Leopard</span><span className="text-white">fish Intel</span>
                </h1>
                <p className="max-w-3xl mx-auto text-2xl md:text-3xl [text-shadow:0_2px_10px_rgba(0,0,0,0.9)] text-white">
                Move with certainty, not just hope. 
                </p>
            </div>
            <div className="flex flex-col items-center pb-8">
                <Link href="/discover">
                    <Button size="lg" className="h-12 bg-accent hover:bg-accent/90 text-accent-foreground group hover:shadow-[0_0_15px_hsl(var(--accent))] transition-shadow">
                        Start Your Journey
                    </Button>
                </Link>
            </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center mb-12">
                <h2 className="text-3xl font-bold mb-6 normal-case">Teach Overseas: Know Before You Go</h2>
                <p className="text-muted-foreground md:text-xl leading-relaxed">
                  We assist international educators in conducting proper due diligence. By reviewing the real-world impact of your contract and your future living environment, we help you replace uncertainty with evidence-led insight.
                </p>
            </div>
            <KeyFactsSection />
        </div>
      </section>

      <Roadmap />
    </div>
  );
}
