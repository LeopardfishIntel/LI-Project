import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plane, FileText, Globe, Pencil } from 'lucide-react';

const forumCategories = [
  {
    icon: <Plane className="h-8 w-8 text-primary" />,
    title: 'Visas & Immigration',
    description: 'Discuss requirements, timelines, and experiences with visas.',
    threads: 128,
    posts: 1532,
  },
  {
    icon: <FileText className="h-8 w-8 text-primary" />,
    title: 'Contract Analysis',
    description: 'Share and get feedback on employment contracts and benefits.',
    threads: 97,
    posts: 1102,
  },
  {
    icon: <Globe className="h-8 w-8 text-primary" />,
    title: 'Lifestyle & Culture',
    description: 'From daily life to travel, share your adaptation stories.',
    threads: 254,
    posts: 3489,
  },
  {
    icon: <MessageSquare className="h-8 w-8 text-primary" />,
    title: 'General Discussion',
    description: 'A place for anything else related to teaching abroad.',
    threads: 411,
    posts: 5012,
  },
];

export default function ForumPage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Community Forum</h1>
            <p className="text-muted-foreground mt-2">Connect with fellow international educators.</p>
        </div>
        <Button className="mt-4 md:mt-0">
            <Pencil className="mr-2 h-4 w-4" />
            Start a New Discussion
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {forumCategories.map((category) => (
          <Card key={category.title} className="bg-card/70 backdrop-blur-sm border-border hover:border-primary/50 transition-colors">
            <Link href="#" className="block h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                {category.icon}
                <div>
                  <CardTitle className="normal-case tracking-tight">{category.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{category.description}</p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{category.threads} threads</span>
                  <span>&bull;</span>
                  <span>{category.posts} posts</span>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
