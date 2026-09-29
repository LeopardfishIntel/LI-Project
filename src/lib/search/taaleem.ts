/**
 * 🏫 TAALEEM CANONICAL RESOLVER & CAMPUS REGISTRY
 * Pure client/shared metadata and resolver for Taaleem schools
 */

export interface ResolvedTaaleemJob {
  canonicalUrl: string;
  isDirect: boolean;
  groupName: "Taaleem";
  campus?: string;
}

export interface TaaleemSchoolMeta {
  schoolId: string;
  canonicalName: string;
  city: string;
  country: string;
  tesEmployerUrl?: string;
}

/**
 * TAALEEM CAMPUS MAP
 *
 * CRITICAL: These FLIS IDs must match the canonical `schools` Firestore collection exactly.
 * Taaleem campuses are in the FLIS0102, FLIS0104, FLIS0318-0344, FLIS0418-0423 range.
 */
export const TAALEEM_CAMPUS_MAP: Record<string, TaaleemSchoolMeta> = {
  "dubai british school jumeirah park": { 
    schoolId: "FLIS0419", 
    canonicalName: "Dubai British School (Dubai Jumeirah Park)", 
    city: "Dubai Jumeirah Park", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-jumeirah-park-1081671"
  },
  "dubai british school emirates hills": { 
    schoolId: "FLIS0104", 
    canonicalName: "Dubai British School", 
    city: "Dubai Emirates Hills", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-emirates-hills-1057169"
  },
  "dubai british school - mira": { 
    schoolId: "FLIS0420", 
    canonicalName: "Dubai British School (Dubai Mira)", 
    city: "Dubai Mira", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-mira-1255316"
  },
  "dubai british school - jumeira": { 
    schoolId: "FLIS0418", 
    canonicalName: "Dubai British School (Dubai Jumeira)", 
    city: "Dubai Jumeira", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-jumeira-1265177"
  },
  "dubai british school": { 
    schoolId: "FLIS0104", 
    canonicalName: "Dubai British School", 
    city: "Dubai Emirates Hills", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-emirates-hills-1057169"
  },
  "raha international school kcc": { 
    schoolId: "FLIS0102", 
    canonicalName: "Raha International School (Khalifa City)", 
    city: "Abu Dhabi", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/raha-international-school-gardens-campus-1070644"
  },
  "raha international school gc": { 
    schoolId: "FLIS0102", 
    canonicalName: "Raha International School (Gardens Campus)", 
    city: "Abu Dhabi", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/raha-international-school-gardens-campus-1070644"
  },
  "raha international school": { 
    schoolId: "FLIS0102", 
    canonicalName: "Raha International School", 
    city: "Abu Dhabi", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/raha-international-school-gardens-campus-1070644"
  },
  "greenfield international school": { 
    schoolId: "FLIS0342", 
    canonicalName: "Greenfield International School", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "jumeira baccalaureate school": { 
    schoolId: "FLIS0423", 
    canonicalName: "Jumeira Baccalaureate School", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "uptown international school": { 
    schoolId: "FLIS0343", 
    canonicalName: "Uptown International School", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/uptown-international-school-1081669"
  },
  "jebel ali school": { 
    schoolId: "FLIS0341", 
    canonicalName: "Jebel Ali School", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "harrow international school-dubai": { 
    schoolId: "FLIS0344", 
    canonicalName: "Harrow International School Dubai", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "harrow international school abu dhabi": { 
    schoolId: "FLIS0320", 
    canonicalName: "Harrow International School Abu Dhabi", 
    city: "Abu Dhabi", 
    country: "United Arab Emirates" 
  },
  "dubai schools al barsha": { 
    schoolId: "FLIS0318", 
    canonicalName: "Dubai Schools Al Barsha", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "dubai schools al khawaneej": { 
    schoolId: "FLIS0321", 
    canonicalName: "Dubai Schools Al Khawaneej", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "dubai school nad al sheba": { 
    schoolId: "FLIS0319", 
    canonicalName: "Dubai School Nad Al Sheba", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "lycée libanais francophone privé meydan": { 
    schoolId: "FLIS0322", 
    canonicalName: "Lycée Libanais Francophone Privé Meydan", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "taaleem": { 
    schoolId: "FLIS0104", 
    canonicalName: "Taaleem Education", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  }
};

export function isTaaleemSchool(schoolId?: string | null, schoolName?: string | null, group?: string | null): boolean {
  const sId = (schoolId || "").toUpperCase().trim();
  const sName = (schoolName || "").toLowerCase();
  const gName = (group || "").toLowerCase();

  // Exclusions: never classify competitor group schools as Taaleem
  if (
    gName.includes("gems") ||
    sName.includes("gems") ||
    gName.includes("nord anglia") ||
    sName.includes("nord anglia") ||
    gName.includes("cognita") ||
    sName.includes("cognita") ||
    gName.includes("inspired") ||
    sName.includes("inspired") ||
    gName.includes("dubai college") ||
    sName.includes("sunmarke") ||
    sName.includes("dubai english speaking")
  ) {
    return false;
  }

  if (gName.includes("taaleem")) {
    return true;
  }

  if (
    sName.includes("taaleem") ||
    sName.includes("dubai british") ||
    sName.includes("raha international") ||
    sName.includes("jumeira baccalaureate") ||
    sName.includes("greenfield international") ||
    sName.includes("greenfield community") ||
    sName.includes("uptown international") ||
    sName.includes("uptown school") ||
    sName.includes("dubai heights academy") ||
    sName.includes("jebel ali school") ||
    sName.includes("dubai school") ||
    sName.includes("american academy for girls")
  ) {
    return true;
  }

  // Correct canonical Taaleem school IDs
  if (
    sId === "FLIS0102" ||
    sId === "FLIS0104" ||
    sId.startsWith("FLIS0318") ||
    sId.startsWith("FLIS0319") ||
    sId.startsWith("FLIS0320") ||
    sId.startsWith("FLIS0321") ||
    sId.startsWith("FLIS0322") ||
    sId === "FLIS0341" ||
    sId === "FLIS0342" ||
    sId === "FLIS0343" ||
    sId === "FLIS0344" ||
    sId.startsWith("FLIS0418") ||
    sId.startsWith("FLIS0419") ||
    sId.startsWith("FLIS0420") ||
    sId === "FLIS0423"
  ) {
    return true;
  }

  return false;
}

export function resolveTaaleemDirectUrl(
  _jobTitle: string,
  schoolName: string,
  fallbackUrl?: string | null
): ResolvedTaaleemJob {
  const sNameLower = (schoolName || "").toLowerCase();
  let matchedCampus: string | undefined;

  for (const [key, meta] of Object.entries(TAALEEM_CAMPUS_MAP)) {
    if (sNameLower.includes(key)) {
      matchedCampus = meta.canonicalName;
      break;
    }
  }

  if (
    fallbackUrl &&
    !fallbackUrl.includes("tes.com") &&
    fallbackUrl.startsWith("http") &&
    fallbackUrl.includes("taaleem.ae") &&
    (fallbackUrl.includes("/jobs/") || fallbackUrl.includes("/job-application/"))
  ) {
    return {
      canonicalUrl: fallbackUrl,
      isDirect: true,
      groupName: "Taaleem",
      campus: matchedCampus,
    };
  }

  return {
    canonicalUrl: "https://careers.taaleem.ae/",
    isDirect: true,
    groupName: "Taaleem",
    campus: matchedCampus,
  };
}

export interface TaaleemJobMatch {
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
  matchConfidence: "high" | "medium";
  reasons: string[];
}

interface CampusCandidate {
  key: string;
  schoolId: string;
  canonicalName: string;
  city: string;
  country: string;
}

/**
 * Sweeps all active vacancies across the Taaleem Education Network using the authenticated
 * token session from careers.taaleem.ae, grounding each role strictly to its specific campus.
 * In server contexts, delegates to taaleem-server.
 */
export async function searchTaaleemDbSchools(): Promise<TaaleemJobMatch[]> {
  if (typeof window !== "undefined") {
    throw new Error("searchTaaleemDbSchools can only be called on the server.");
  }
  // Dynamic require / eval to ensure Next.js client bundler never analyzes server deps
  const mod = await import(
    /* webpackIgnore: true */
    "./taaleem-server"
  );
  return mod.searchTaaleemDbSchools();
}



