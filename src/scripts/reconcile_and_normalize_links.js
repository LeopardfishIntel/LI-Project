const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const exportPath = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
const rootExportPath = path.resolve(process.cwd(), 'complete_school_fields_export.json');
const schools = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

async function testUrl(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.trim() === '') {
    return { ok: false, status: 'MISSING', code: null };
  }
  let formatted = targetUrl.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = 'https://' + formatted;
  }
  try {
    const res = await fetch(formatted, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(3000),
      redirect: 'follow'
    });
    return { ok: res.status >= 200 && res.status < 400, code: res.status };
  } catch (err) {
    return { ok: false, code: null, error: err.name || err.message };
  }
}

async function reconcileAndFix() {
  console.log('================================================================');
  console.log('🚀 STEP 1: ENTITY RECONCILIATION & ORPHAN JOB NORMALIZATION');
  console.log('================================================================\n');

  // 1. Link Prague leadership vacancy to FLIS0049
  const pragueDocRef = db.collection('featured_jobs_cache').doc('sa_lead_upper-school-principal-international-school-of-prague-czech-republic-2026');
  const pragueDoc = await pragueDocRef.get();
  if (pragueDoc.exists) {
    await pragueDocRef.update({
      schoolId: 'FLIS0049',
      schoolName: 'International School of Prague',
      country: 'Czechia',
      city: 'Prague'
    });
    console.log('✅ Successfully linked Upper School Principal vacancy to FLIS0049 (International School of Prague).');
  }

  // 2. Clean up schoolName on other SEARCH_ASSOCIATES_HUB leadership jobs so they do not show job title as school name
  const orphanTitlesMap = {
    'sa_lead_lower-school-principal-international-community-school-of-abidjan-cote-d-ivoire-2026': { school: 'International Community School of Abidjan', country: "Côte d'Ivoire", city: 'Abidjan' },
    'sa_lead_primary-school-principal-berlin-brandenburg-international-school-germany-2026': { school: 'Berlin Brandenburg International School', country: 'Germany', city: 'Kleinmachnow / Berlin' },
    'sa_lead_secondary-principal-igb-international-school-malaysia-2026': { school: 'IGB International School', country: 'Malaysia', city: 'Kuala Lumpur' },
    'sa_lead_superintendent-american-cooperative-school-of-tunis-tunisia-2026-2': { school: 'American Cooperative School of Tunis', country: 'Tunisia', city: 'Tunis' },
    'sa_lead_upper-school-principal-casablanca-american-school-morocco-2026': { school: 'Casablanca American School', country: 'Morocco', city: 'Casablanca' },
    'sa_lead_elementary-school-principal-the-walworth-barbour-american-international-school-in-israel-israel-2026': { school: 'Walworth Barbour American International School', country: 'Israel', city: 'Even Yehuda' },
    'sa_lead_head-of-university-guidance-lawrence-s-ting-school-vietnam-2026': { school: 'Lawrence S. Ting School', country: 'Vietnam', city: 'Ho Chi Minh City' }
  };

  for (const [docId, meta] of Object.entries(orphanTitlesMap)) {
    const docRef = db.collection('featured_jobs_cache').doc(docId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      await docRef.update({
        schoolName: meta.school,
        country: meta.country,
        city: meta.city
      });
      console.log(`✅ Normalized entity metadata for [${docId}] -> ${meta.school} (${meta.city}, ${meta.country})`);
    }
  }

  console.log('\n================================================================');
  console.log('🌐 STEP 2: WEBSITE & CAREERS PORTAL ROOT NORMALIZATION');
  console.log('================================================================\n');

  // Specific fixes for known school homepages
  const knownFixes = {
    'FLIS0003': { website: 'https://www.kist.ed.jp', careers: 'https://www.kist.ed.jp/careers' },
    'FLIS0009': { website: 'https://www.tts.edu.sg', careers: 'https://www.tts.edu.sg/working-with-us/current-vacancies' },
    'FLIS0010': { website: 'https://www.gtcollege.edu.hk', careers: 'https://www.gtcollege.edu.hk/recruitment' },
    'FLIS0011': { website: 'https://www.bgy.gd.cn', careers: 'https://www.bgy.gd.cn' },
    'FLIS0015': { website: 'https://singapore.nps-international.com', careers: 'https://singapore.nps-international.com' },
    'FLIS0016': { website: 'https://academy.isf.edu.hk', careers: 'https://academy.isf.edu.hk/en/join-us/careers/' },
    'FLIS0018': { website: 'https://www.singapore.edu.hk', careers: 'https://www.singapore.edu.hk/join-us/' },
    'FLIS0019': { website: 'http://www.cky.edu.hk', careers: 'http://www.cky.edu.hk' },
    'FLIS0020': { website: 'https://www.ykpaoschool.cn', careers: 'https://www.ykpaoschool.cn/join-us' },
    'FLIS0026': { website: 'https://www.gemsworldacademy-dubai.com', careers: 'https://www.gemseducation.com/careers' },
    'FLIS0033': { website: 'https://shanghai.wellingtoncollege.cn', careers: 'https://shanghai.wellingtoncollege.cn/join-us' },
    'FLIS0037': { website: 'https://www.ecolejeanninemanuel.org', careers: 'https://www.ecolejeanninemanuel.org/en/work-with-us/' },
    'FLIS0050': { website: 'https://www.fis.edu', careers: 'https://www.fis.edu/careers' },
    'FLIS0054': { website: 'https://www.isl.ch', careers: 'https://www.isl.ch/join-us/employment-opportunities' },
    'FLIS0055': { website: 'https://www.nordangliaeducation.com/beau-soleil', careers: 'https://www.nordangliaeducation.com/careers' },
    'FLIS0057': { website: 'https://www.asmilan.org', careers: 'https://www.asmilan.org/work-with-us' },
    'FLIS0060': { website: 'https://www.zis.ch', careers: 'https://www.zis.ch/careers' },
    'FLIS0061': { website: 'https://www.britishschool.be', careers: 'https://www.britishschool.be/our-school/work-with-us/' },
    'FLIS0072': { website: 'https://www.nordangliaeducation.com/cdl-geneva', careers: 'https://www.nordangliaeducation.com/careers' },
    'FLIS0073': { website: 'https://www.isb.be', careers: 'https://www.isb.be/join-our-team' },
    'FLIS0078': { website: 'https://www.iszl.ch', careers: 'https://www.iszl.ch/join-our-team' },
    'FLIS0080': { website: 'https://www.ermitage.fr', careers: 'https://www.ermitage.fr/en/join-our-team' },
    'FLIS0082': { website: 'https://www.stjulians.com', careers: 'https://www.stjulians.com/work-with-us' },
    'FLIS0083': { website: 'https://www.asmadrid.org', careers: 'https://www.asmadrid.org/careers' },
    'FLIS0135': { website: 'https://www.shrewsbury.ac.th', careers: 'https://www.shrewsbury.ac.th/riverside/careers' },
    'FLIS0136': { website: 'https://www.patana.ac.th', careers: 'https://www.patana.ac.th/employment/' },
    'FLIS0139': { website: 'https://www.kingsbangkok.ac.th', careers: 'https://www.kingsbangkok.ac.th/en/work-with-us' },
    'FLIS0144': { website: 'https://www.bsj.sch.id', careers: 'https://www.bsj.sch.id/work-at-bsj' },
    'FLIS0145': { website: 'https://www.jisedu.or.id', careers: 'https://www.jisedu.or.id/work-with-us' },
    'FLIS0148': { website: 'https://www.britishschoolmanila.org', careers: 'https://www.britishschoolmanila.org/work-with-us' },
    'FLIS0149': { website: 'https://www.ismanila.org', careers: 'https://www.ismanila.org/work-at-ism' },
    'FLIS0150': { website: 'https://www.bst.ac.jp', careers: 'https://www.bst.ac.jp/work-at-bst' },
    'FLIS0154': { website: 'https://www.stmaur.ac.jp', careers: 'https://www.stmaur.ac.jp/employment' },
    'FLIS0155': { website: 'https://www.yis.ac.jp', careers: 'https://www.yis.ac.jp/careers' },
    'FLIS0157': { website: 'https://www.seoulforeign.org', careers: 'https://www.seoulforeign.org/employment' },
    'FLIS0162': { website: 'https://www.wab.edu', careers: 'https://www.wab.edu/work-at-wab' },
    'FLIS0193': { website: 'https://www.innsbruck-iis.at', careers: 'https://www.innsbruck-iis.at' },
    'FLIS0194': { website: 'https://www.lais.at', careers: 'https://www.lais.at' },
    'FLIS0196': { website: 'https://salis.salzburg.at', careers: 'https://salis.salzburg.at' },
    'FLIS0250': { website: 'https://www.iskl.edu.my', careers: 'https://www.iskl.edu.my/careers' }
  };

  let websiteFixedCount = 0;
  const toUpdate = [];

  // Map concurrent worker
  let index = 0;
  async function worker() {
    while (index < schools.length) {
      const s = schools[index++];
      let modified = false;

      // Check if website has /careers or similar path
      if (s.website && (s.website.includes('/careers') || s.website.includes('/recruitment') || s.website.includes('/employment') || s.website.includes('/job'))) {
        try {
          const u = new URL(s.website.startsWith('http') ? s.website : 'https://' + s.website);
          const rootDomain = u.origin;
          const oldWeb = s.website;
          s.website = rootDomain;
          if (!s.careersPageUrl) s.careersPageUrl = oldWeb;
          if (!s.careersUrl) s.careersUrl = oldWeb;
          modified = true;
          websiteFixedCount++;
          console.log(`[${s.id}] ${s.name}: Normalized website from ${oldWeb} -> ${rootDomain}`);
        } catch (e) {}
      }

      if (knownFixes[s.id]) {
        s.website = knownFixes[s.id].website;
        s.careersPageUrl = knownFixes[s.id].careers;
        s.careersUrl = knownFixes[s.id].careers;
        modified = true;
      }

      if (modified) {
        toUpdate.push(s);
      }
    }
  }

  await Promise.all(Array.from({ length: 40 }, () => worker()));

  // Commit updates in batches of 400
  for (let i = 0; i < toUpdate.length; i += 400) {
    const chunk = toUpdate.slice(i, i + 400);
    const batch = db.batch();
    for (const s of chunk) {
      const docRef = db.collection('schools').doc(s.id);
      batch.update(docRef, {
        website: s.website,
        careersPageUrl: s.careersPageUrl,
        careersUrl: s.careersUrl
      });
    }
    await batch.commit();
  }

  // Save back to JSON files
  fs.writeFileSync(exportPath, JSON.stringify(schools, null, 2));
  fs.writeFileSync(rootExportPath, JSON.stringify(schools, null, 2));

  console.log(`\n🎉 Completed Link Normalization & Reconciliation!`);
  console.log(`   - Normalized ${websiteFixedCount} school website URLs to pristine canonical root domains.`);
  console.log(`   - Synchronized updates across Firestore 'schools', 'featured_jobs_cache', and local JSON exports.`);
}

reconcileAndFix().catch(console.error);

