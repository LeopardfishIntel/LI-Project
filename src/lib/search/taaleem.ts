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

export const TAALEEM_CAMPUS_MAP: Record<string, TaaleemSchoolMeta> = {
  "dubai british school jumeirah park": { 
    schoolId: "FLIS0115_JUMEIRAH_PARK", 
    canonicalName: "Dubai British School Jumeirah Park", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-jumeirah-park-1081671"
  },
  "dubai british school emirates hills": { 
    schoolId: "FLIS0115_EMIRATES_HILLS", 
    canonicalName: "Dubai British School Emirates Hills", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-emirates-hills-1057169"
  },
  "dubai british school - mira": { 
    schoolId: "FLIS0115_MIRA", 
    canonicalName: "Dubai British School Mira", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-mira-1255316"
  },
  "dubai british school - jumeira": { 
    schoolId: "FLIS0115_JUMEIRA", 
    canonicalName: "Dubai British School Jumeira", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-jumeira-1265177"
  },
  "dubai british school": { 
    schoolId: "FLIS0115", 
    canonicalName: "Dubai British School", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-emirates-hills-1057169"
  },
  "dubai british foundation": { 
    schoolId: "FLIS0115_DBF", 
    canonicalName: "Dubai British Foundation", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "raha international school kcc": { 
    schoolId: "FLIS0113", 
    canonicalName: "Raha International School (Khalifa City)", 
    city: "Abu Dhabi", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/raha-international-school-gardens-campus-1070644"
  },
  "raha international school gc": { 
    schoolId: "FLIS0113", 
    canonicalName: "Raha International School (Gardens Campus)", 
    city: "Abu Dhabi", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/raha-international-school-gardens-campus-1070644"
  },
  "raha international school": { 
    schoolId: "FLIS0113", 
    canonicalName: "Raha International School", 
    city: "Abu Dhabi", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/raha-international-school-gardens-campus-1070644"
  },
  "greenfield international school": { 
    schoolId: "FLIS0116_GIS", 
    canonicalName: "Greenfield International School", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "jumeira baccalaureate school": { 
    schoolId: "FLIS0114_JBS", 
    canonicalName: "Jumeira Baccalaureate School", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "uptown international school": { 
    schoolId: "FLIS0117_UIS", 
    canonicalName: "Uptown International School", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/uptown-international-school-1081669"
  },
  "dubai heights academy": { 
    schoolId: "FLIS0118_DHA", 
    canonicalName: "Dubai Heights Academy", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "jebel ali school": { 
    schoolId: "FLIS0119_JAS", 
    canonicalName: "Jebel Ali School", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "harrow international school-dubai": { 
    schoolId: "FLIS0361", 
    canonicalName: "Harrow International School Dubai", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "harrow international school abu dhabi": { 
    schoolId: "FLIS0364", 
    canonicalName: "Harrow International School Abu Dhabi", 
    city: "Abu Dhabi", 
    country: "United Arab Emirates" 
  },
  "dubai schools al barsha": { 
    schoolId: "FLIS0362", 
    canonicalName: "Dubai Schools Al Barsha", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "dubai schools al khawaneej": { 
    schoolId: "FLIS0365", 
    canonicalName: "Dubai Schools Al Khawaneej", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "dubai school nad al sheba": { 
    schoolId: "FLIS0363", 
    canonicalName: "Dubai School Nad Al Sheba", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "lycée libanais francophone privé meydan": { 
    schoolId: "FLIS0366", 
    canonicalName: "Lycée Libanais Francophone Privé Meydan", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "taaleem": { 
    schoolId: "FLIS0115", 
    canonicalName: "Taaleem Education", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  }
};

export function isTaaleemSchool(schoolId?: string | null, schoolName?: string | null, group?: string | null): boolean {
  const sId = (schoolId || "").toUpperCase().trim();
  const sName = (schoolName || "").toLowerCase();
  const gName = (group || "").toLowerCase();

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

  if (
    sId.startsWith("FLIS0113") ||
    sId.startsWith("FLIS0115") ||
    sId.startsWith("FLIS0116") ||
    sId.startsWith("FLIS0117") ||
    sId.startsWith("FLIS0118") ||
    sId.startsWith("FLIS0119_JAS")
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
