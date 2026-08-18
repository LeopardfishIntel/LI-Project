import { NextResponse } from 'next/server';
import { getCollectionDocs, updateDocument } from '@/firebase/admin';
import { getSchoolStabilityReport } from '@/app/financial-forecaster/actions';

export async function GET() {
  try {
    const schools = await getCollectionDocs('schools');
    
    // Parse and sort by lastScrapedAt (null/oldest first)
    const sorted = schools.map((s: any) => {
      const data = s.data();
      let lastScraped = null;
      if (data.lastScrapedAt) {
        if (data.lastScrapedAt.seconds) {
          lastScraped = data.lastScrapedAt.seconds * 1000;
        } else {
          lastScraped = new Date(data.lastScrapedAt).getTime();
        }
      }
      return {
        id: s.id,
        name: data.schoolname || "",
        city: data.city || "",
        country: data.country || "",
        lastScraped
      };
    }).sort((a: any, b: any) => {
      if (a.lastScraped === null) return -1;
      if (b.lastScraped === null) return 1;
      return a.lastScraped - b.lastScraped;
    });

    // Select the 15 oldest schools
    const targets = sorted.slice(0, 15);

    // Trigger sweeps in background
    for (const target of targets) {
      // Wring out cache immediately in Firestore
      await updateDocument('schools', target.id, {
        scrapedJobsList: [],
        scrapedJobsCount: null,
        isRevalidating: true
      });

      getSchoolStabilityReport({
        schoolId: target.id,
        schoolName: target.name,
        estimatedStaffBase: 0,
        city: target.city,
        country: target.country
      }).catch(err => console.error("Background daily sweep failed for:", target.name, err));
    }

    return NextResponse.json({
      success: true,
      triggered: targets.length,
      schools: targets.map((t: any) => t.name)
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
