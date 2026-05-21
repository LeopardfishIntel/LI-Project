import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { collection, getDocs } from 'firebase/firestore';
import { rateLimit } from '@/lib/rate-limit';

// In-memory cache to protect the Firestore database from excessive reads
type CachedData = {
  schools: any[];
  colData: any[];
  transportIntel: any[];
  timestamp: number;
};

let cached: CachedData | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache duration

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

  const now = Date.now();
  
  // 2. Serve from cache if still fresh
  if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
    return NextResponse.json(
      { schools: cached.schools, colData: cached.colData, transportIntel: cached.transportIntel },
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
    // 3. Query Firestore collections on the server-side
    const [schoolsSnap, colSnap, transportSnap] = await Promise.all([
      getDocs(collection(db, 'schools')),
      getDocs(collection(db, 'locations_costOfLiving')),
      getDocs(collection(db, 'transport_intel'))
    ]);

    const schools = schoolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const colData = colSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const transportIntel = transportSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Populate Cache
    cached = {
      schools,
      colData,
      transportIntel,
      timestamp: now
    };

    return NextResponse.json(
      { schools, colData, transportIntel },
      {
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-Cache': 'MISS'
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
