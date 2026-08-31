import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspectNaeCareers() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const targetUrl = 'https://careers.nordangliaeducation.com/search/?q=&locationsearch=';
  console.log(`🌐 [INSPECT SAP SUCCESSFACTORS] Navigating to: ${targetUrl}\n`);

  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 25000 });
  console.log(`• Final URL: ${page.url()}`);
  console.log(`• Title: "${await page.title()}"`);

  // Extract all forms, search inputs, select options, and job link anchors
  const inspectData = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select')).map(el => ({
      name: (el as HTMLInputElement).name || el.id,
      type: (el as HTMLInputElement).type || el.tagName,
      placeholder: (el as HTMLInputElement).placeholder || '',
      value: (el as HTMLInputElement).value || ''
    }));

    const links = Array.from(document.querySelectorAll('a[href*="/job/"], a[href*="/job-invite/"], table.searchResults a, .jobTitle a')).map(a => ({
      title: (a.textContent || '').trim(),
      href: (a as HTMLAnchorElement).href
    }));

    const tableRows = Array.from(document.querySelectorAll('tr.data-row, table tbody tr')).map(tr => (tr.textContent || '').trim().replace(/\s+/g, ' '));

    return { inputs, links, tableRows };
  });

  await browser.close();

  console.log(`\n📌 Search Inputs / Dropdowns Found (${inspectData.inputs.length}):`);
  inspectData.inputs.forEach((inp, i) => {
    console.log(`  [${i + 1}] Name/ID: "${inp.name}" | Type: ${inp.type} | Placeholder: "${inp.placeholder}"`);
  });

  console.log(`\n📌 Job Links Found (${inspectData.links.length}):`);
  inspectData.links.slice(0, 15).forEach((l, i) => {
    console.log(`  [${i + 1}] "${l.title}" => ${l.href}`);
  });

  if (inspectData.tableRows.length > 0) {
    console.log(`\n📌 Sample Table Rows (${inspectData.tableRows.length}):`);
    inspectData.tableRows.slice(0, 5).forEach((r, i) => {
      console.log(`  [${i + 1}] ${r}`);
    });
  }
}

inspectNaeCareers().catch(console.error);
