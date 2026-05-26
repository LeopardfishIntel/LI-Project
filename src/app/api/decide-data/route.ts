import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { collection, getDocs } from 'firebase/firestore';
import { rateLimit } from '@/lib/rate-limit';
import { getCachedDecideData, setCachedDecideData, invalidateDecideCache } from '@/lib/decide-cache';

export async function GET(request: Request) {
  // 1. IP Rate Limiter (30 requests per minute)
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const { success, limit, remaining } = rateLimit(ip, 30, 60000);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining)
        }
      }
    );
  }

  // 2. Parse URL for bypass/clear parameters
  const { searchParams } = new URL(request.url);
  const bypass = searchParams.get('bypass') === 'true' || searchParams.get('clear') === 'true';

  if (searchParams.get('clear') === 'true') {
    invalidateDecideCache();
  }

  // 3. Serve from cache if still fresh and not bypassed
  const cachedData = bypass ? null : getCachedDecideData();
  if (cachedData) {
    return NextResponse.json(
      { schools: cachedData.schools, colData: cachedData.colData, transportIntel: cachedData.transportIntel },
      {
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-Cache': 'HIT'
        }
      }
    );
  }

  try {
    // 4. Query Firestore collections on the server-side
    const [schoolsSnap, colSnap, transportSnap] = await Promise.all([
      getDocs(collection(db, 'schools')),
      getDocs(collection(db, 'locations_costOfLiving')),
      getDocs(collection(db, 'transport_intel'))
    ]);

    const schools = schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const colData = colSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const transportIntel = transportSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Populate Cache
    setCachedDecideData(schools, colData, transportIntel);

    return NextResponse.json(
      { schools, colData, transportIntel },
      {
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-Cache': bypass ? 'BYPASS' : 'MISS'
        }
      }
    );
  } catch (error: any) {
    console.error('Error in decide-data API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
