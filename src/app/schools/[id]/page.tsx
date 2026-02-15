
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSchoolById } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Building, DollarSign, Users, BookOpen, HeartPulse, Sparkles, Home, Info } from 'lucide-react';
import { VerifiedBadge } from '@/components/verified-badge';
import { CostOfLivingCalculator } from '@/components/cost-of-living-calculator';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const intelIcons = {
    salary: <DollarSign className="w-5 h-5 text-green-400" />,
    housing: <Home className="w-5 h-5 text-blue-400" />,
    savingsPotential: <Sparkles className="w-5 h-5 text-amber-400" />,
    curriculum: <BookOpen className="w-5 h-5 text-purple-400" />,
    studentTeacherRatio: <Users className="w-5 h-5 text-rose-400" />,
    classSize: <Building className="w-5 h-5 text-sky-400" />,
    healthInsurance: <HeartPulse className="w-5 h-5 text-red-400" />,
};

type IntelKey = keyof typeof intelIcons;

const scoreColorClasses = {
  good: 'text-green-400',
  neutral: 'text-slate-400',
  bad: 'text-red-400',
};


export default function SchoolProfilePage({ params }: { params: { id: string } }) {
  const school = getSchoolById(params.id);

  if (!school) {
    notFound();
  }

  const schoolIntel = [
    { key: 'salary', label: 'Salary', value: school.intel.salary.value, score: school.intel.salary.score },
    { key: 'housing', label: 'Housing', value: school.intel.housing.value },
    { key: 'savingsPotential', label: 'Savings Potential', value: school.intel.savingsPotential.value, score: school.intel.savingsPotential.score },
    { key: 'curriculum', label: 'Curriculum', value: school.intel.curriculum },
    { key: 'studentTeacherRatio', label: 'Student-Teacher Ratio', value: school.intel.studentTeacherRatio },
    { key: 'classSize', label: 'Average Class Size', value: school.intel.classSize },
    { key: 'healthInsurance', label: 'Health Insurance', value: school.intel.healthInsurance },
  ];

  return (
    <div className="min-h-screen">
      <section className="relative h-64 md:h-96 w-full">
        <Image
          src={school.imageUrl}
          alt={`Hero image for ${school.name}`}
          layout="fill"
          objectFit="cover"
          className="brightness-50"
          data-ai-hint={school.imageHint}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-4 md:p-8 container mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-primary-foreground">{school.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
             <div className="flex items-center text-lg">
                <MapPin className="w-5 h-5 mr-2" />
                <span>{school.location}, {school.country}</span>
            </div>
            <div className="flex items-center gap-1 text-lg">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <span className="font-bold text-primary-foreground">{school.rating.toFixed(1)}</span>
                <span>({school.reviewsCount} reviews)</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Intel Section */}
                <Card className="bg-card/70 backdrop-blur-sm border-border">
                    <CardHeader><CardTitle>Core Intel</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {schoolIntel.map(item => (
                                <li key={item.key} className="flex items-start">
                                    <div className="mr-3 mt-1">{intelIcons[item.key as IntelKey]}</div>
                                    <div>
                                        <p className="font-semibold text-muted-foreground">{item.label}</p>
                                        <div className="flex items-center gap-2">
                                            <p className={cn("text-lg", item.score && scoreColorClasses[item.score])}>
                                                {item.value.toString()}
                                            </p>
                                            {item.key === 'healthInsurance' && (
                                                <Link href="/forum/health-insurance" aria-label="Learn more about health insurance tiers">
                                                    <Info className="w-4 h-4 text-sky-400 hover:text-sky-300" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Reviews Section */}
                <Card className="bg-card/70 backdrop-blur-sm border-border">
                    <CardHeader><CardTitle>Teacher Reviews</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        {school.reviews.map(review => (
                            <div key={review.id}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold">{review.author}</p>
                                        {review.isVerified && <VerifiedBadge />}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{review.timestamp}</p>
                                </div>
                                <div className="flex items-center gap-1 mb-2">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={cn("w-4 h-4", i < review.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/50")}/>
                                    ))}
                                </div>
                                <p className="text-muted-foreground">{review.text}</p>
                                {school.reviews.indexOf(review) < school.reviews.length - 1 && <Separator className="mt-6" />}
                            </div>
                        ))}
                         {school.reviews.length === 0 && <p className="text-muted-foreground text-center py-4">No reviews yet for this school.</p>}
                    </CardContent>
                </Card>
            </div>
            
            <div className="space-y-8">
                <CostOfLivingCalculator school={school} />
                <Card className="bg-card/70 backdrop-blur-sm border-border">
                    <CardHeader><CardTitle>School Video</CardTitle></CardHeader>
                    <CardContent>
                        {school.videoUrl ? (
                            <div className="aspect-video">
                                <iframe
                                    className="w-full h-full rounded-md"
                                    src={school.videoUrl}
                                    title={`School video for ${school.name}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        ) : (
                            <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                                <p className="text-muted-foreground">Video coming soon</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
