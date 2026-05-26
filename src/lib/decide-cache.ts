// In-memory cache manager for the /api/decide-data route
type CachedData = {
  schools: any[];
  colData: any[];
  transportIntel: any[];
  timestamp: number;
};

let cached: CachedData | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache duration

export function getCachedDecideData() {
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
    return cached;
  }
  return null;
}

export function setCachedDecideData(schools: any[], colData: any[], transportIntel: any[]) {
  cached = {
    schools,
    colData,
    transportIntel,
    timestamp: Date.now()
  };
  console.log("🛰️ DECIDE DATA CACHE POPULATED:", {
    schools: schools.length,
    colData: colData.length,
    transportIntel: transportIntel.length
  });
}

export function invalidateDecideCache() {
  cached = null;
  console.log("🧹 DECIDE DATA CACHE SUCCESSFULLY PURGED");
}
