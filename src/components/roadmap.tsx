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
      desc: "By aligning your specific expertise and personal profile with our insider data, we identify the 'nook' where you won't just fit the brief—you'll belong to the community.",
      link: '/discover',
      imageId: 'discover-step'
    },
    {
      id: '02',
      title: 'Evaluate',
      desc: "Our Contract Decoder hacks through the fluff, we calculate your actual take-home pay, and map out your genuine disposable income. Focus on your real financial position and see if you’ll actually grow a savings pot or just treading water.",
      link: '/financial-forecaster',
      imageId: 'evaluate-step'
    },
    {
      id: '03',
      title: 'Decide',
      desc: "Weighing up multiple offers can be a challenge. Our side-by-side comparison tool breaks down the finer details of your potential contracts—from headline salary and housing allowances to class sizes and medical cover. You can even input your specific offer numbers to see the bottom line clearly. We lay out the data, so you can make your final call with total peace of mind",
      link: '/compare',
      imageId: 'decide-step'
    },
  ];

  return (
    <section className="w-full py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 normal-case">Teach Overseas: Know Before You Go</h2>
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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[2.45rem] font-bold text-white uppercase tracking-widest [text-shadow:0_2px_6px_rgba(0,0,0,0.9)]">Step {parseInt(step.id)}</span>
                    </div>
                </div>
                <div className={cn("flex flex-col", index % 2 === 1 ? "md:items-end md:text-right" : "md:items-start")}>
                  <h3 className="text-4xl font-bold mb-4">{step.title}</h3>
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
