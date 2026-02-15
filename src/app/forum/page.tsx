"use client";

import Link from 'next/link';
import { SchoolCard } from '@/components/school-card';
import { spotlightSchools } from '@/lib/mock-data';
import { Users, FileText, DollarSign, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ForumCategoryCard = ({ icon, title, description, href }: { icon: React.ReactNode, title: string, description: string, href: string }) => (
    <Link href={href}>
        <Card className="bg-card/70 backdrop-blur-sm border-border hover:border-primary/50 transition-colors h-full flex flex-col shadow-lg hover:shadow-primary/20 duration-300">
            <CardHeader className="flex-row items-center gap-4 space-y-0">
                {icon}
                <CardTitle className="normal-case tracking-tight text-xl">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    </Link>
);


export default function ForumPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="flex flex-col items-center text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          The Leopardfish Bowl
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
          An anonymous professional community for international educators. Discuss salaries, compare schools, and share advice with verified peers. All posts are vetted to maintain professional standards.
        </p>
      </div>

      <div className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <ForumCategoryCard 
                  icon={<FileText className="h-6 w-6 text-primary" />}
                  title="Visas, Logistics & Vetting"
                  description="Discuss visa processing times, shipping companies, and how to vet school contracts before you sign."
                  href="#"
              />
              <ForumCategoryCard 
                  icon={<DollarSign className="h-6 w-6 text-primary" />}
                  title="Salary & Package Discussions"
                  description="Anonymously share and compare salary, benefits, and contract details from schools around the world."
                  href="#"
              />
              <ForumCategoryCard 
                  icon={<Users className="h-6 w-6 text-primary" />}
                  title="Life Abroad & Cultural Integration"
                  description="Share tips on navigating local culture, healthcare, banking, and building a professional network in your new host country."
                  href="#"
              />
          </div>
      </div>
      
      <div>
        <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-primary">
            Popular Schools
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
            Join the conversation on some of the most talked-about schools.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {spotlightSchools.map((school) => (
            <SchoolCard key={school.id} school={school} />
            ))}
        </div>
      </div>
    </div>
  );
}
