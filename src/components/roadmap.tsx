import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find(img => img.id === id);
  return {
    imageUrl: image?.imageUrl ?? "https://picsum.photos/seed/placeholder/600/400",
    imageHint: image?.imageHint ?? "placeholder"
  };
};

export default function Roadmap() {
  const steps = [
    {
      id: '01',
      title: 'Discover',
      desc: "Forget the broad strokes of a standard job search. We use our specialist intelligence and years in the field to navigate the complexities of the international circuit for you. By aligning your specific expertise with our insider data, we identify the 'nook' where you won't just fit the brief—you'll belong to the community.",
      link: '/discover',
      imageId: 'discover-step'
    },
    {
      id: '02',
      title: 'Evaluate',
      desc: "See the full financial picture before you even apply. Our forecaster goes beyond salary, modeling your true take-home pay after local taxes, and calculating your estimated monthly expenses to reveal your real savings potential. Move forward with confidence.",
      link: '/financial-forecaster',
      imageId: 'evaluate-step'
    },
    {
      id: '03',
      title: 'Decide',
      desc: "Making the final choice can be tough. Our side-by-side comparison tool lays out all the critical data points from your top school offers—from salary and housing to class size and health insurance—so you can make a clear, informed decision.",
      link: '/compare',
      imageId: 'decide-step'
    },
  ];

  return (
    <section className="w-full py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-16">Your Path to Teaching Abroad</h2>
        <div className="space-y-24">
          {steps.map((step, index) => {
            const { imageUrl, imageHint } = getImage(step.imageId);
            return (
              <div key={step.id} className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
                <div className={cn("relative", index % 2 === 1 && "md:order-last")}>
                    <Image 
                      src={imageUrl}
                      alt={step.desc}
                      width={600}
                      height={450}
                      className="rounded-xl shadow-2xl object-cover w-full h-auto"
                      data-ai-hint={imageHint}
                    />
                </div>
                <div className={cn("flex flex-col", index % 2 === 1 ? "md:items-end md:text-right" : "md:items-start")}>
                  <span className="text-sm font-bold text-accent uppercase tracking-widest">Step {parseInt(step.id)}</span>
                  <h3 className="text-4xl font-bold mt-2 mb-4">{step.title}</h3>
                  <p className="text-muted-foreground text-lg mb-6 max-w-md">{step.desc}</p>
                  <Link href={step.link} passHref>
                    <Button size="lg">
                      {step.title}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
