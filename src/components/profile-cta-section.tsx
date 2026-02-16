import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find(img => img.id === id);
  return {
    imageUrl: image?.imageUrl ?? "https://picsum.photos/seed/placeholder/1200/400",
    imageHint: image?.imageHint ?? "planning"
  };
};


export function ProfileCTASection() {
    const { imageUrl, imageHint } = getImage('profile-cta-background');
    
  return (
    <section className="relative w-full py-20 md:py-32">
      <div className="absolute inset-0">
         <Image 
            src={imageUrl} 
            alt="Person planning a trip on a map" 
            fill
            className="object-cover brightness-50"
            data-ai-hint={imageHint}
        />
      </div>
      <div className="relative container mx-auto px-4 md:px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4 [text-shadow:0_2px_4px_rgba(0,0,0,0.6)]">
          Streamline Your Search
        </h2>
        <p className="max-w-3xl mx-auto text-primary-foreground md:text-xl mb-8 [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
          Keep your profile up-to-date and let Leopardfish Intel pre-fill applications and personalize your results. Spend less time on forms and more time discovering your next great opportunity.
        </p>
        <Link href="/profile">
          <Button size="lg" className="h-12 group hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-shadow">
            Update Your Profile
          </Button>
        </Link>
      </div>
    </section>
  );
}
