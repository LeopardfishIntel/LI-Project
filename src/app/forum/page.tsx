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
          <Users className="h-8 w-8 text-primary" />
          Community Forum
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
          A professional resource for international educators. All posts are anonymized and moderated.
        </p>
      </div>

      <div className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <ForumCategoryCard 
                  icon={<FileText className="h-6 w-6 text-primary" />}
                  title="Global Compliance & Logistics"
                  description="Verified technical data for international relocation. Visa timelines, fiscal planning, and shipping logistics."
                  href="#"
              />
              <ForumCategoryCard 
                  icon={<DollarSign className="h-6 w-6 text-primary" />}
                  title="Anonymous Package Reporting"
                  description="Clean, anonymized data for market benchmarking. Compare verified salaries, benefits, and contract clauses."
                  href="#"
              />
              <ForumCategoryCard 
                  icon={<Users className="h-6 w-6 text-primary" />}
                  title="Host Country Integration"
                  description="Professional navigation of workplace etiquette, local culture, healthcare systems, and insurance."
                  href="#"
              />
          </div>
      </div>
      
      <Card className="mb-16 bg-card/70 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            The "Ghost Author" Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>This forum operates under a strict Ghost Author policy to maintain professional standards and prevent drama. There are no user profiles or avatars. All contributions are anonymised, and every post is vetted by an administrator to ensure professional utility and the removal of school-specific identifiers before publication.</p>
        </CardContent>
      </Card>

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
