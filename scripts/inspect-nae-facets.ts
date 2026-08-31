import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspectNaeFacets() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const url = 'https://careers.nordangliaeducation.com/search/?q=&locationsearch=';
  console.log(`🌐 Reading SAP SuccessFactors facet dropdowns from: ${url}\n`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

  const facilities = await page.$$eval('#optionsFacetsDD_facility option', opts =>
    opts.map(o => ({ text: (o.textContent || '').trim(), value: (o as HTMLOptionElement).value })).filter(o => (o as HTMLOptionElement).value)
  );

  const cities = await page.$$eval('#optionsFacetsDD_city option', opts =>
    opts.map(o => ({ text: (o.textContent || '').trim(), value: (o as HTMLOptionElement).value })).filter(o => (o as HTMLOptionElement).value)
  );

  await browser.close();

  console.log(`📌 School Facilities Options (${facilities.length}):`);
  facilities.forEach((f, i) => console.log(`  [${i + 1}] "${f.text}" => value: "${f.value}"`));

  console.log(`\n📌 Cities Options (${cities.length}):`);
  cities.forEach((c, i) => console.log(`  [${i + 1}] "${c.text}" => value: "${c.value}"`));
}

inspectNaeFacets().catch(console.error);
