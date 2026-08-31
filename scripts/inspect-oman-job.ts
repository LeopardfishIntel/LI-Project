import { extractJobPostingsFromHtml } from '../src/lib/crawler/adaptors/tes-adaptor';

async function inspectOmanJob() {
  const url = 'https://www.tes.com/jobs/vacancy/teacher-of-maths-august-2026-oman-2340364';
  console.log(`Inspecting TES job page: ${url}...\n`);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
    }
  });

  const html = await res.text();
  console.log(`HTTP Status: ${res.status}`);

  const postings = extractJobPostingsFromHtml(html);
  console.log(`Discovered ${postings.length} JSON-LD postings on page:`);
  console.dir(postings, { depth: null });
}

inspectOmanJob().catch(console.error);
