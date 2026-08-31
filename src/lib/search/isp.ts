import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";

export interface IspJobMatch {
  jobId: string;
  title: string;
  applyUrl: string;
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  source: string;
  datePosted?: string | null;
  closingDate?: string | null;
}

export async function searchIspDbSchools(query: string = ""): Promise<IspJobMatch[]> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      console.warn("⚠️ Admin SDK Firestore unavailable for ISP DB search.");
      return [];
    }

    // 1. Fetch active schools from DB
    const snap = await db.collection("schools").get();
    const dbSchools = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (dbSchools.length === 0) {
      console.log("ℹ️ No schools found in DB for ISP matching.");
      return [];
    }

    // 2. Fetch live vacancies directly from Workday JSON CXS API
    const url = "https://internationalschools.wd3.myworkdayjobs.com/wday/cxs/internationalschools/ISPCareers/jobs";
    const allPostings: any[] = [];
    const seenPaths = new Set<string>();

    let offset = 0;
    let totalCount = 1000;

    while (offset < totalCount) {
      const payload = {
        appliedFacets: {
          CF_LRV_Job_Category__From_Job_Profile__Extended: ["2d491c2214bf1000c1f6c9eeac980001"]
        },
        limit: 20,
        offset: offset,
        searchText: query || ""
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (res.status !== 200) {
        console.warn(`⚠️ Workday CXS API returned HTTP status ${res.status} at offset ${offset}`);
        break;
      }

      const data = await res.json();
      if (offset === 0 && typeof data.total === "number" && data.total > 0) {
        totalCount = data.total;
      }

      const list: any[] = data.jobPostings || [];
      if (list.length === 0) break;

      for (const item of list) {
        if (item.externalPath && !seenPaths.has(item.externalPath)) {
          seenPaths.add(item.externalPath);
          allPostings.push(item);
        }
      }

      offset += 20;
    }

    console.log(`🛸 [ISP WORKDAY ENGINE] Fetched ${allPostings.length} unique postings across ${totalCount} total positions.`);

    // 3. Ground strictly against DB schools
    const matches: IspJobMatch[] = [];

    for (const job of allPostings) {
      const title = job.title || "";
      if (!title || isSupportOrNonTeachingRole(title)) continue;

      const locationsText = job.locationsText || "";
      const bulletFields = Array.isArray(job.bulletFields) ? job.bulletFields.join(" ") : "";
      const fullText = `${title} ${locationsText} ${bulletFields}`.toLowerCase();

      const matchedSchool = dbSchools.find((s: any) => {
        const sName = (s.name || s.schoolname || "").toLowerCase().trim();
        if (!sName || sName.length < 3) return false;

        if (fullText.includes(sName)) return true;

        const aliases: string[] = Array.isArray(s.aliases) ? s.aliases : [];
        if (aliases.some((a) => a && a.length >= 3 && fullText.includes(String(a).toLowerCase().trim()))) {
          return true;
        }

        return false;
      });

      if (matchedSchool) {
        const extPath = job.externalPath || "";
        const slugMatch = extPath.split("/").pop();
        const jobId = slugMatch ? `isp_${slugMatch}` : `isp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const applyUrl = `https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers${extPath}`;

        matches.push({
          jobId,
          title,
          applyUrl,
          schoolId: matchedSchool.id,
          schoolName: matchedSchool.name || matchedSchool.schoolname,
          city: matchedSchool.city || "",
          country: matchedSchool.country || "",
          source: "ISP",
          datePosted: new Date().toISOString(),
          closingDate: null
        });
      }
    }

    console.log(`🛸 [ISP WORKDAY ENGINE] Found ${matches.length} DB-grounded vacancies across ISP schools.`);
    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchIspDbSchools:", err?.message || err);
    return [];
  }
}
