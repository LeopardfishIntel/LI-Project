import Link from 'next/link';

export default function Roadmap() {
  const steps = [
    { id: '01', title: 'Discover', desc: 'Find your perfect destination with our AI Niche Finder.', link: '/discover' },
    { id: '02', title: 'Evaluate', desc: 'Calculate taxes and cost of living to see your real savings.', link: '/financial-forecaster' },
    { id: '03', title: 'Decide', desc: 'Compare your top school offers side-by-side.', link: '/compare' },
  ];

  return (
    <section className="w-full py-16 md:py-24 bg-background">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10">Your Path to Teaching Abroad</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.id} className="relative p-6 border rounded-xl hover:shadow-lg transition bg-card/70 backdrop-blur-sm border-border hover:border-primary/50 hover:shadow-primary/20">
              <span className="text-5xl font-black text-muted-foreground/10 absolute top-2 right-4 -z-10">{step.id}</span>
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="text-muted-foreground mb-4">{step.desc}</p>
              <Link href={step.link} className="text-sky-400 font-semibold hover:underline">
                Get Started →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
