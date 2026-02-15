import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MoveRight } from 'lucide-react';
import { SchoolCard } from '@/components/school-card';
import { spotlightSchools } from '@/lib/mock-data';
import { KeyFactsSection } from '@/components/key-facts-section';
import Roadmap from '@/components/roadmap';

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <section className="w-full py-20 md:py-32 lg:py-40 text-center bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop')"}}>
        <div className="container mx-auto px-4 md:px-6 z-10">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 normal-case [text-shadow:0_2px_4px_rgba(0,0,0,0.6)]">
              <span className="text-accent">Leopard</span><span className="text-primary">fish Intel</span>
            </h1>
            <p className="max-w-2xl mx-auto text-primary-foreground md:text-xl mb-8 [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
              Your international teaching journey, mapped. Find your ideal destination, calculate your real-world savings, and compare school offers side-by-side. Stop guessing—start planning with precision.
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
      </section>

      <KeyFactsSection />

      <Roadmap />

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
