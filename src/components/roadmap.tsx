import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight } from 'lucide-react';

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
      desc: "By aligning your specific expertise and personal profile with our insider data, we identify the 'nook' where you won't just fit the brief—you'll belong to the community.",
      link: '/discover',
      imageId: 'discover-step',
      label: 'Find Your Nook'
    },
    {
      id: '02',
      title: 'Evaluate',
      desc: "Our Contract Decoder cuts through the fluff, calculate your actual take-home pay, and map your genuine disposable income. Focus on your real financial position.",
      link: '/financial-forecaster',
      imageId: 'evaluate-step',
      label: 'Decode Offer'
    },
    {
      id: '03',
      title: 'Decide',
      desc: "Weighing up multiple offers can be a challenge. Our comparison tool breaks down the finer details of your potential contracts from salary to housing allowances.",
      link: '/compare',
      imageId: 'decide-step',
      label: 'Final Verdict'
    },
  ];

  return (
    <section className="w-full py-24 bg-background/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="space-y-24">
          {steps.map((step, index) => {
            const { imageUrl, imageHint } = getImage(step.imageId);
            return (
              <div key={step.id} className="grid md:grid-cols-2 gap-12 items-center">
                <div className={cn("relative aspect-video rounded-sm overflow-hidden border border-white/10", index % 2 === 1 && "md:order-last")}>
                    <Image 
                      src={imageUrl}
                      alt={step.desc}
                      fill
                      className="object-cover brightness-50"
                      data-ai-hint={imageHint}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl font-black text-white/10 uppercase tracking-widest">Step {step.id}</span>
                    </div>
                </div>
                <div className={cn("flex flex-col space-y-6", index % 2 === 1 ? "md:items-end md:text-right" : "md:items-start")}>
                  <h3 className="text-3xl font-bold tracking-widest uppercase">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-md">{step.desc}</p>
                  <Link href={step.link} className="inline-flex items-center text-primary hover:translate-x-2 transition-transform font-bold text-xs uppercase tracking-widest">
                    {step.label} <ArrowRight className="ml-2 w-4 h-4" />
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