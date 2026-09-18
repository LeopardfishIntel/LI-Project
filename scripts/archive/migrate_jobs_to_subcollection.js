const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-2840117705-12faa'
  });
}

const db = admin.firestore();

async function migrate() {
  console.log("🚀 Starting database migration...");
  const schoolsCol = db.collection('schools');
  const snap = await schoolsCol.get();
  
  let totalSchools = 0;
  let totalJobs = 0;

  for (const schoolDoc of snap.docs) {
    const data = schoolDoc.data();
    const scrapedList = data.scrapedJobsList;
    if (Array.isArray(scrapedList) && scrapedList.length > 0) {
      console.log(`Migrating jobs for school: ${data.schoolname || schoolDoc.id}`);
      
      const jobsSubcol = schoolDoc.ref.collection('jobs');
      
      for (const jobStr of scrapedList) {
        if (!jobStr) continue;

        // Parse deep-link URL
        let jobUrl = "";
        let workingStr = jobStr;
        const urlParts = jobStr.split(" || ");
        if (urlParts.length > 1) {
          workingStr = urlParts[0].trim();
          jobUrl = urlParts[1].trim();
        }

        // Parse source
        const lastDashIdx = workingStr.lastIndexOf(' - ');
        let main = workingStr;
        let source = 'Web';
        if (lastDashIdx !== -1) {
          main = workingStr.substring(0, lastDashIdx).trim();
          source = workingStr.substring(lastDashIdx + 3).trim();
        }

        // Parse title
        const parenIdx = main.indexOf('(');
        const rawTitle = parenIdx !== -1 ? main.substring(0, parenIdx).trim() : main.trim();
        let title = rawTitle.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (title.length > 80) title = title.substring(0, 80).trim();

        // Parse closesDate
        let closesDateStr = "";
        const parentheticalMatches = [...jobStr.matchAll(/\(([^)]+)\)/g)];
        if (parentheticalMatches.length > 0) {
          const dateParenthetical = parentheticalMatches.find(m => {
            const text = m[1].toLowerCase();
            return text.includes('posted:') || text.includes('closes:') || /202[4-7]|cycle/i.test(text);
          }) || parentheticalMatches[parentheticalMatches.length - 1];
          
          const content = dateParenthetical[1];
          const parts = content.split(';').map(s => s.trim());
          const closesPart = parts.find(p => p.toLowerCase().includes('closes:'));
          if (closesPart) {
            closesDateStr = closesPart.replace(/closes:\s*/i, '').trim();
          }
        }

        let closesDate = new Date();
        if (closesDateStr) {
          const parsed = new Date(closesDateStr);
          if (!isNaN(parsed.getTime())) {
            closesDate = parsed;
          } else {
            // Default 30 days out for unparsed but present closing dates
            closesDate.setDate(closesDate.getDate() + 30);
          }
        } else {
          // Default 45 days out for rolling
          closesDate.setDate(closesDate.getDate() + 45);
        }

        const jobId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);
        
        const scrapedJob = {
          id: jobId,
          title: title,
          sourceName: source,
          applyUrl: jobUrl || data.website || "",
          closingDate: admin.firestore.Timestamp.fromDate(closesDate),
          scrapedAt: admin.firestore.Timestamp.now(),
          status: 'active'
        };

        await jobsSubcol.doc(jobId).set(scrapedJob);
        totalJobs++;
      }

      // Remove legacy list and count
      await schoolDoc.ref.update({
        scrapedJobsList: admin.firestore.FieldValue.delete(),
        scrapedJobsCount: admin.firestore.FieldValue.delete()
      });
      totalSchools++;
    }
  }

  console.log(`✅ Migration complete! Processed ${totalJobs} jobs across ${totalSchools} schools.`);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
