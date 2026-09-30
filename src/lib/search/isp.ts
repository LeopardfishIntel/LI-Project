import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { matchSchoolEntity, SchoolEntity } from "@/lib/crawler/entityMatcher";
import { extractJobPostingsFromHtml } from "@/lib/crawler/adaptors/tes-adaptor";

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

const STEALTH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

const BATCH_SIZE = 5;
const REQUEST_TIMEOUT_MS = 10000;

async function fetchVacancyJsonLd(applyUrl: string): Promise<{
  hiringOrgName: string | null;
  datePosted: string | null;
  validThrough: string | null;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(applyUrl, { headers: STEALTH_HEADERS, signal: controller.signal });
    if (!res.ok) {
      return { hiringOrgName: null, datePosted: null, validThrough: null };
    }
    const html = await res.text();
    const postings = extractJobPostingsFromHtml(html);
    if (!postings || postings.length === 0) {
      return { hiringOrgName: null, datePosted: null, validThrough: null };
    }
    const posting = postings[0];
    const org = posting.hiringOrganization;
    const hiringOrgName = typeof org === "string" ? org : org?.name || null;
    const datePosted = posting.datePosted ? String(posting.datePosted) : null;
    const validThrough = posting.validThrough ? String(posting.validThrough) : null;

    return { hiringOrgName, datePosted, validThrough };
  } catch {
    return { hiringOrgName: null, datePosted: null, validThrough: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchIspDbSchools(query: string = ""): Promise<IspJobMatch[]> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      console.warn("⚠️ Admin SDK Firestore unavailable for ISP DB search.");
      return [];
    }

    // 1. Fetch active schools from DB & map to SchoolEntity
    const snap = await db.collection("schools").get();
    const dbSchools: SchoolEntity[] = snap.docs.map((d: any) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || data.schoolname || "",
        schoolname: data.schoolname || data.name || "",
        city: data.city || "",
        country: data.country || "",
        aliases: Array.isArray(data.aliases) ? data.aliases : [],
        legalNames: Array.isArray(data.legalNames) ? data.legalNames : (Array.isArray(data.legal_names) ? data.legal_names : []),
        group: data.group || data.schoolGroup || data.ownership || "",
      } as any;
    });

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

    // 3. Filter teaching roles
    const teachingJobs = allPostings.filter((job) => {
      const title = job.title || "";
      return title && !isSupportOrNonTeachingRole(title);
    });

    console.log(`🛸 [ISP WORKDAY ENGINE] Inspecting ${teachingJobs.length} teaching roles with verified hiringOrganization & dates...`);

    // 4. Inspect vacancy pages in batches to extract verified hiringOrganization & dates
    const matches: IspJobMatch[] = [];

    for (let i = 0; i < teachingJobs.length; i += BATCH_SIZE) {
      const chunk = teachingJobs.slice(i, i + BATCH_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (job) => {
          const title = job.title || "";
          const extPath = job.externalPath || "";
          const slugMatch = extPath.split("/").pop();
          const jobId = slugMatch ? `isp_${slugMatch}` : `isp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const applyUrl = `https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers${extPath}`;

          const { hiringOrgName, datePosted, validThrough } = await fetchVacancyJsonLd(applyUrl);
          if (!hiringOrgName || !hiringOrgName.trim()) {
            return null;
          }

          // Cross-check hiringOrganization against all DB schools
          let bestSchool: SchoolEntity | null = null;
          let bestScore = 0;

          for (const school of dbSchools) {
            const matchRes = matchSchoolEntity(
              school,
              {
                candidateText: hiringOrgName,
              },
              0.85
            );

            if (matchRes.isMatch && matchRes.score > bestScore) {
              bestScore = matchRes.score;
              bestSchool = school;
            }
          }

          if (bestSchool && bestScore >= 0.85) {
            return {
              jobId,
              title,
              applyUrl,
              schoolId: bestSchool.id || "",
              schoolName: bestSchool.name || bestSchool.schoolname || "",
              city: bestSchool.city || "",
              country: bestSchool.country || "",
              source: "ISP",
              datePosted: datePosted || null,
              closingDate: validThrough || null,
            };
          }

          return null;
        })
      );

      for (const m of chunkResults) {
        if (m) matches.push(m);
      }
    }

    console.log(`🛸 [ISP WORKDAY ENGINE] Grounded ${matches.length} strictly verified vacancies across DB schools.`);
    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchIspDbSchools:", err?.message || err);
    return [];
  }
}
