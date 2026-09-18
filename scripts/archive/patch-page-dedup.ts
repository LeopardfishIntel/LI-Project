import * as fs from 'fs';

const filePath = '/Users/roger.keen/Antigravity LI Project/LI-Project/src/app/featured-jobs/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'const seenJobKeys = new Set<string>();',
  'const seenJobKeys = new Set<string>();\n    const seenUrls = new Set<string>();'
);

const target = `// Deduplication by title + schoolId
        const jobKey = \`\${cacheDoc.schoolId}_\${(cacheDoc.title || '').toLowerCase().trim()}\`;
        if (seenJobKeys.has(jobKey)) return;
        seenJobKeys.add(jobKey);`;

const replacement = `// Deduplication by unique applyUrl & title + schoolId
        if (applyUrlLower && seenUrls.has(applyUrlLower)) return;
        if (applyUrlLower) seenUrls.add(applyUrlLower);

        const jobKey = \`\${cacheDoc.schoolId}_\${(cacheDoc.title || '').toLowerCase().trim()}\`;
        if (seenJobKeys.has(jobKey)) return;
        seenJobKeys.add(jobKey);`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Added URL deduplication to page.tsx');
} else {
  console.log('⚠️ Target string not found in page.tsx');
}
