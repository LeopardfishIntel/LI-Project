import * as fs from 'fs';

const filePath = '/Users/roger.keen/Antigravity LI Project/LI-Project/src/app/featured-jobs/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `cacheData.forEach((cacheDoc: FeaturedJobCacheDoc) => {`;
const replacement = `cacheData.forEach((cacheDoc: FeaturedJobCacheDoc) => {
        // STRICT TES-ONLY FILTER
        const sourceUpper = String(cacheDoc.source || '').toUpperCase();
        const applyUrlLower = String(cacheDoc.applyUrl || '').toLowerCase();
        if (sourceUpper !== 'TES' || !applyUrlLower.includes('tes.com/jobs/vacancy/')) return;`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Added strict TES-only filter to page.tsx');
} else {
  console.log('⚠️ Target string not found in page.tsx');
}
