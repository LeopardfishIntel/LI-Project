import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MoveRight, Wallet, BarChart3, Lightbulb } from 'lucide-react';
import { SchoolCard } from '@/components/school-card';
import { spotlightSchools } from '@/lib/mock-data';

const FeatureCard = ({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) => (
  <Link href={href}>
    <div className="bg-card/70 backdrop-blur-sm border-border p-6 rounded-lg h-full text-center hover:border-primary/50 transition-colors flex flex-col items-center shadow-lg hover:shadow-primary/20 duration-300">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm flex-grow">{description}</p>
    </div>
  </Link>
);


export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <section className="w-full py-20 md:py-32 lg:py-40 text-center bg-cover bg-center" style={{backgroundImage: "url('https://picsum.photos/seed/hero/1200/800')"}}>
        <div className="container mx-auto px-4 md:px-6 z-10">
          <div className="bg-black/50 backdrop-blur-sm p-8 rounded-lg">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-primary-foreground mb-4">
              Leopardfish Intel
            </h1>
            <p className="max-w-2xl mx-auto text-muted-foreground md:text-xl mb-8">
              Compare salaries, benefits, and living costs at international schools worldwide. Make informed decisions about your next teaching adventure.
            </p>
            <form action="/search" className="max-w-xl mx-auto flex gap-2">
              <Input
                name="q"
                type="search"
                placeholder="Search for a school, city, or country..."
                className="flex-grow h-12 text-lg"
              />
              <Button type="submit" size="lg" className="h-12 group hover:shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-shadow">
                <Search className="mr-2 h-5 w-5" />
                Search
              </Button>
            </form>
          </div>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
                icon={<Search className="w-8 h-8 text-primary" />}
                title="Find a School"
                description="Search our database of hundreds of international schools."
                href="/search"
            />
            <FeatureCard
                icon={<Wallet className="w-8 h-8 text-primary" />}
                title="See True Costs"
                description="Calculate your estimated monthly expenses in different cities."
                href="/true-costs"
            />
            <FeatureCard
                icon={<BarChart3 className="w-8 h-8 text-primary" />}
                title="Compare Savings"
                description="Compare salary and savings potential side-by-side."
                href="/compare"
            />
            <FeatureCard
                icon={<Lightbulb className="w-8 h-8 text-primary" />}
                title="Find Your Niche"
                description="Get AI-powered recommendations for your next destination."
                href="/find-your-niche"
            />
          </div>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 bg-accent/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
              School Spotlight
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
              Check out these highly-rated schools from our community.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {spotlightSchools.map((school) => (
              <SchoolCard key={school.id} school={school} />
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/search">
              <Button variant="link" className="text-lg text-primary">
                Explore All Schools <MoveRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
