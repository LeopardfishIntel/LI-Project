import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight, Target, Calculator, GitCompare } from 'lucide-react';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find(img => img.id === id);
  return {
    imageUrl: image?.imageUrl ?? "https://picsum.photos/seed/placeholder/600/400",
    imageHint: image?.imageHint ?? "placeholder"
  };
};

export function Roadmap() {
  const steps = [
    {
      id: '01',
      title: 'Discover',
      icon: <Target className="w-8 h-8 text-primary" />,
      desc: "By aligning your specific expertise and personal profile with our insider data, we identify the 'fit' where you won't just meet the brief—you'll belong to the community.",
      link: '/discover',
      imageId: 'discover-step',
      label: 'Find Your Fit'
    },
    {
      id: '02',
      title: 'Evaluate',
      icon: <Calculator className="w-8 h-8 text-primary" />,
      desc: "Our Contract Decoder cuts through the fluff, calculate your actual take-home pay, and map your genuine disposable income. Focus on your real financial position.",
      link: '/financial-forecaster',
      imageId: 'evaluate-step',
      label: 'Decode Offer'
    },
    {
      id: '03',
      title: 'Decide',
      icon: <GitCompare className="w-8 h-8 text-primary" />,
      desc: "Weighing up multiple offers can be a challenge. Our comparison tool breaks down the finer details of your potential contracts from salary to housing allowances.",
      link: '/decide',
      imageId: 'decide-step',
      label: 'Final Verdict'
    },
  ];

  return (
    <section className="py-24 bg-background/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.id} className="glass p-8 space-y-6 flex flex-col justify-between group transition-all hover:border-primary/50 rounded-sm">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-primary/10 rounded-sm">{step.icon}</div>
                  <span className="text-4xl font-black text-white/5 group-hover:text-primary/20 transition-colors">{step.id}</span>
                </div>
                <h3 className="text-2xl stamped-dossier">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{step.desc}</p>
              </div>
              <Link href={step.link} className="inline-flex items-center text-primary group-hover:translate-x-2 transition-transform self-start font-bold text-xs uppercase tracking-widest">
                {step.label} <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
