import { scrapePage } from '../src/lib/crawler/scraperEngine';

async function inspectUwcseaLinks() {
  console.log('Inspecting links on UWCSEA careers page...');
  const res = await scrapePage('https://www.uwcsea.edu.sg/uwcsea-careers');
  console.log(`Discovered ${res.links.length} total links on page:`);

  res.links.forEach((l, idx) => {
    const text = l.text.trim();
    if (text || l.href.includes('job') || l.href.includes('career') || l.href.includes('work') || l.href.includes('apply')) {
      console.log(`  ${idx + 1}. [${text}] -> ${l.href}`);
    }
  });
}

inspectUwcseaLinks().catch(console.error);
