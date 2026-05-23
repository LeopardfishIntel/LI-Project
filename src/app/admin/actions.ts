'use server';

import {
  collection,
  getDocs,
  doc,
  writeBatch,
  updateDoc,
  QueryDocumentSnapshot,
  DocumentData,
  getDoc,
  setDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '@/firebase/server';

// 🏷️ Explicit Interfaces for Admin Intelligence
export type BulkEnrichState = {
  message: string | null;
  error: string | null;
  summary: { total: number; enriched: number; failed: number } | null;
};

export type EcoActionState = {
  message: string | null;
  error: string | null;
  success: boolean;
  data: any | null;
};

/**
 * 🛰️ Action: Log Telemetry Event
 * Persists user interaction telemetry without storing PII.
 */
import { logTelemetryEventAction } from '../telemetry/actions';
export { logTelemetryEventAction };

/**
 * 🛰️ Action: Update Location Cost of Living
 * Triggers the AI Drone to scan and update city-level telemetry.
 */
export async function updateLocationCostOfLivingAction(prevState: any, formData: FormData): Promise<EcoActionState> {
  try {
    const locationName = formData.get('locationName') as string;
    const countryName = formData.get('countryName') as string;

    if (!locationName) {
      return { error: "Location Name is required", success: false, message: null, data: null };
    }

    const { updateCostOfLiving } = await import('@/ai/flows/update-cost-of-living-flow');
    const res = await updateCostOfLiving({ locationName, countryName } as any);

    // 🛰️ COMMIT TO REGISTRY: Actually save the data to Firestore
    const docId = locationName.toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(db, 'locations_costOfLiving', docId);

    await updateDoc(docRef, {
      ...res,
      city: locationName,
      country: countryName,
      lastSync: new Date().toISOString()
    }).catch(async (e) => {
      // If doc doesn't exist, create it
      await setDoc(docRef, {
        ...res,
        city: locationName,
        country: countryName,
        id: docId,
        lastSync: new Date().toISOString()
      });
    });

    return {
      message: `Updated telemetry for ${locationName} successfully`,
      success: true,
      error: null,
      data: res
    };
  } catch (e: any) {
    return {
      error: e.message || "AI Operational Flow Failed",
      success: false,
      message: null,
      data: null
    };
  }
}

/**
 * 🛰️ Action: Get Telemetry Data
 * Pulls the raw node data and aggregates dynamic event telemetry for the Admin Dashboard.
 */
export async function getTelemetryData() {
  try {
    const [telemetrySnap, pageViewsSnap, schoolsSnap, colSnap, enquiriesSnap] = await Promise.all([
      getDocs(collection(db, 'telemetry')).catch(err => {
        console.warn("Telemetry collection read failed:", err.message || err);
        return null;
      }),
      getDocs(collection(db, 'app_metrics')).catch(err => {
        console.warn("App metrics collection read failed:", err.message || err);
        return null;
      }),
      getDocs(collection(db, 'schools')).catch(err => {
        console.warn("Schools collection read failed:", err.message || err);
        return null;
      }),
      getDocs(collection(db, 'locations_costOfLiving')).catch(err => {
        console.warn("Locations cost of living collection read failed:", err.message || err);
        return null;
      }),
      getDocs(collection(db, 'enquiries')).catch(err => {
        console.warn("Enquiries collection read failed:", err.message || err);
        return null;
      })
    ]);

    const legacyTelemetry: any = {};
    const events: any[] = [];

    if (telemetrySnap) {
      telemetrySnap.docs.forEach((doc) => {
        const dData = doc.data();
        if (dData.event_name) {
          events.push({ id: doc.id, ...dData });
        } else {
          // Merge legacy fields
          Object.assign(legacyTelemetry, dData);
        }
      });
    }

    const pageViewsDoc = pageViewsSnap ? pageViewsSnap.docs.find(d => d.id === 'page_views') : null;
    const pageViews = pageViewsDoc ? pageViewsDoc.data() : {};

    // Calculate unique countries
    const schoolCountries = (schoolsSnap && schoolsSnap.size > 0) ? schoolsSnap.docs.map((d: any) => d.data().country).filter(Boolean) : [];
    const colCountries = (colSnap && colSnap.size > 0) ? colSnap.docs.map((d: any) => d.data().country || d.data().country_name).filter(Boolean) : [];
    const uniqueCountries = new Set([...schoolCountries, ...colCountries]).size;

    // Calculate pending enquiries count
    let pendingEnquiries = 0;
    if (enquiriesSnap) {
      pendingEnquiries = enquiriesSnap.docs.filter((d: any) => d.data().status === 'pending').length;
    } else if (legacyTelemetry.pendingEnquiries !== undefined) {
      pendingEnquiries = legacyTelemetry.pendingEnquiries;
    }

    // --- 📊 Advanced Telemetry Aggregation Engine ---
    let avgNetSalary = 0;
    let netSalarySum = 0;
    let netSalaryCount = 0;
    let housingDowngrades = 0;
    let partnerSalaryAdditions = 0;

    let surplusThriving = 0;
    let surplusLimited = 0;
    let surplusNegative = 0;

    const checklistCounts: Record<string, number> = {};
    let emailCopiesCount = 0;
    let uninsuredWarningsCount = 0;

    const schoolCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const redFlagCounts: Record<string, number> = {};

    let authVisits = 0;
    let guestVisits = 0;

    const dailyVisits: Record<string, number> = {};

    events.forEach((evt) => {
      const timestamp = evt.timestamp;
      const meta = evt.metadata || {};

      // Daily Visits Trend
      if (timestamp) {
        const dateStr = timestamp.split('T')[0];
        dailyVisits[dateStr] = (dailyVisits[dateStr] || 0) + 1;
      }

      // User type breakdown
      if (meta.user_type === 'authenticated' || meta.isAuthenticated) {
        authVisits++;
      } else if (meta.user_type === 'guest' || meta.isAuthenticated === false) {
        guestVisits++;
      } else if (evt.event_name === 'page_view') {
        guestVisits++;
      }

      if (evt.event_name === 'simulator_dial_adjusted') {
        if (meta.dial_modified === 'net_salary' && typeof meta.new_value === 'number') {
          netSalarySum += meta.new_value;
          netSalaryCount++;
        }
        if (meta.dial_modified === 'housing_allowance' && typeof meta.new_value === 'number' && typeof meta.previous_value === 'number' && meta.new_value < meta.previous_value) {
          housingDowngrades++;
        }
        if (meta.dial_modified === 'partner_salary' && typeof meta.new_value === 'number' && meta.new_value > 0) {
          partnerSalaryAdditions++;
        }
        if (meta.resulting_status) {
          const status = String(meta.resulting_status).toLowerCase();
          if (status.includes('thriving') || status.includes('green') || status.includes('surplus')) {
            surplusThriving++;
          } else if (status.includes('limited') || status.includes('tight')) {
            surplusLimited++;
          } else if (status.includes('negative') || status.includes('grim')) {
            surplusNegative++;
          }
        }
      }

      if (evt.event_name === 'checklist_toggled') {
        const item = meta.checklist_item || 'unknown';
        if (meta.checked) {
          checklistCounts[item] = (checklistCounts[item] || 0) + 1;
        }
      }

      if (evt.event_name === 'email_template_copied') {
        emailCopiesCount++;
      }

      if (evt.event_name === 'uninsured_warning_viewed') {
        uninsuredWarningsCount++;
      }

      if (evt.event_name === 'school_profile_viewed') {
        const school = meta.school_name || 'unknown';
        schoolCounts[school] = (schoolCounts[school] || 0) + 1;
      }

      if (evt.event_name === 'country_query_executed') {
        const country = meta.country_name || 'unknown';
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      }

      if (evt.event_name === 'contract_red_flag_hovered') {
        const flag = meta.flag_name || 'unknown';
        redFlagCounts[flag] = (redFlagCounts[flag] || 0) + 1;
      }
    });

    avgNetSalary = netSalaryCount > 0 ? Math.round(netSalarySum / netSalaryCount) : 0;

    // Get 7-day sparkline format
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const visitsTrend = last7Days.map(date => ({
      date: date.substring(5), // MM-DD
      count: dailyVisits[date] || 0
    }));

    const data = {
      ...legacyTelemetry,
      totalVisits: pageViews.site_visits || 0,
      comparisons: pageViews.comparisons_made || legacyTelemetry.comparisons || 0,
      totalSchools: schoolsSnap ? schoolsSnap.size : 0,
      totalLocations: colSnap ? colSnap.size : 0,
      uniqueCountries: uniqueCountries,
      pendingEnquiries: pendingEnquiries,
      
      // Dynamic calculations
      avgNetSalary,
      housingDowngrades,
      partnerSalaryAdditions,
      surplusBreakdown: {
        thriving: surplusThriving,
        limited: surplusLimited,
        negative: surplusNegative
      },
      checklistFriction: Object.entries(checklistCounts).map(([item, count]) => ({ item, count })).sort((a,b) => b.count - a.count),
      emailCopies: emailCopiesCount,
      uninsuredWarnings: uninsuredWarningsCount,
      topSchools: Object.entries(schoolCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5),
      topCountries: Object.entries(countryCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5),
      redFlagHovers: Object.entries(redFlagCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5),
      userTypeBreakdown: {
        authenticated: authVisits,
        guest: guestVisits
      },
      visitsTrend
    };

    return { success: true, data };
  } catch (e: any) {
    console.error("Telemetry uplink failed:", e.message || e);
    return { success: false, data: null };
  }
}

/**
 * 🛰️ Action: Upload Registry JSON
 * Handles bulk injection of School or Cost of Living data.
 */
export async function uploadRegistryJsonAction(data: any[]) {
  try {
    const batch = writeBatch(db);
    const col = 'locations_costOfLiving';

    if (!data?.length) return { success: false, error: "Zero records detected in payload" };

    const isTransport = 'carHire' in data[0] || 'transport' in data[0] || 'publicTransport' in data[0];
    const isLifestyle = 'lifestyle' in data[0] || 'ikea' in data[0];

    if (isTransport || isLifestyle) {
      const snap = await getDocs(collection(db, col));

      data.forEach(item => {
        // 🛰️ Key Normalization
        const intel: any = {};
        Object.keys(item).forEach(k => { intel[k.toLowerCase().trim()] = item[k]; });

        // ✅ Zero-Doubt Filter Logic
        const targetDocs = snap.docs.filter((d: QueryDocumentSnapshot<DocumentData>) =>
          d.data().country?.toLowerCase() === intel.country?.toLowerCase()
        );

        targetDocs.forEach((d) => {
          const ref = doc(db, col, d.id);
          const update: any = {};

          if (isTransport) {
            update.transport = intel.transport || null;
            update.publicTransport = intel.publicTransport || null;
            update.carHire = intel.carHire || null;
            update.lastTransportSync = new Date().toISOString();
          }

          if (isLifestyle) {
            update.ikea = intel.ikea || null;
            update.lifestyle = intel.lifestyle || null;
            update.lastLifestyleSync = new Date().toISOString();

            // Map common scalar fields
            ['rent1br', 'rent2br', 'rent3br', 'groceries', 'utilities', 'mobilePhone', 'internet', 'diningSocial'].forEach(field => {
              if (intel[field]) update[field] = Number(intel[field]);
            });
          }

          batch.set(ref, update, { merge: true });
        });
      });

      await batch.commit();
      return { success: true, count: data.length };
    }

    // Default: Simple document set for schools or locations
    const targetCol = data.some(item => Object.keys(item).some(k => k.toLowerCase().includes('school'))) ? 'schools' : col;

    data.forEach(item => {
      // 🛰️ Key Normalization Engine
      const normalized: any = {};
      Object.keys(item).forEach(k => {
        const cleanKey = k.toLowerCase().trim();
        // Map common synonyms to standard internal keys
        if (['schoolname', 'school name', 'name', 'school'].includes(cleanKey)) normalized.schoolname = item[k];
        else if (['city', 'town', 'location'].includes(cleanKey)) normalized.city = item[k];
        else if (['country', 'region'].includes(cleanKey)) normalized.country = item[k];
        else if (['salaryrange', 'salary', 'netbase'].includes(cleanKey)) normalized.salaryRange = item[k];
        else if (['housingprovision', 'housing', 'accommodation'].includes(cleanKey)) normalized.housingprovision = item[k];
        else normalized[cleanKey] = item[k]; // Default: lowercase the key
      });

      const id = normalized.id || (normalized.schoolname || normalized.city || 'entry').toLowerCase().replace(/\s+/g, '-');
      batch.set(doc(db, targetCol, String(id)), {
        ...normalized,
        lastSync: new Date().toISOString()
      }, { merge: true });
    });

    await batch.commit();
    return { success: true, count: data.length };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * 🛰️ Action: Upload IKEA Intel (Transposed JSON)
 * Converts column-based JSON into country documents and saves to 'ikea_intel'.
 */
export async function uploadIkeaIntelAction(data: any[]) {
  try {
    const batch = writeBatch(db);
    const colName = 'ikea_intel';

    if (!data?.length) return { success: false, error: "Zero records detected in payload" };

    // 🛡️ STRATEGY: Use the "Currency" row as the source of truth for valid country names.
    // This prevents row labels from being mistaken for countries.
    const currencyRow = data.find(row => row.Field === 'Currency');
    if (!currencyRow) {
      return { success: false, error: "FATAL: Could not find 'Currency' row to identify countries." };
    }

    const countries = Object.keys(currencyRow).filter(key =>
      key !== 'Field' && key !== 'Scalars' && key !== 'Field_1'
    );

    if (countries.length === 0) {
      return { success: false, error: "No countries detected in the Currency row." };
    }

    let count = 0;
    for (const countryName of countries) {
      const docId = countryName.toLowerCase().replace(/\s+/g, '-').trim();
      if (!docId) continue;

      const docData: any = {
        country: countryName,
        id: docId,
        lastSync: new Date().toISOString()
      };

      // Loop through all rows to build the country object
      data.forEach(row => {
        const fieldName = row.Field;
        if (fieldName && row[countryName] !== undefined && row[countryName] !== null) {
          let value = row[countryName];

          // Try to convert to number if it looks like a currency or pure number
          if (typeof value === 'string') {
            // Strip $ and commas, but keep the value if it's not a number (like "Has Ikea")
            const cleaned = value.replace(/[\$,]/g, '').trim();
            if (cleaned !== '' && !isNaN(Number(cleaned))) {
              value = Number(cleaned);
            }
          }

          docData[fieldName] = value;
        }
      });

      batch.set(doc(db, colName, docId), docData, { merge: true });
      count++;
    }

    await batch.commit();
    return { success: true, count };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * 🛰️ Action: Upload Transport Intel
 * Merges transport-specific telemetry into the 'locations_costOfLiving' collection.
 */
export async function uploadTransportIntelAction(payload: any[]) {
  console.log("🛰️ TRANSPORT UPLOAD INITIATED. Payload length:", payload?.length);
  try {
    const { canonicalCountry } = await import('@/lib/calculations');
    const batch = writeBatch(db);
    const col = 'transport_intel';

    if (!Array.isArray(payload) || payload.length < 2) {
      console.error("❌ INVALID PAYLOAD: Not an array or too short.");
      return { success: false, error: "Invalid format: Payload must be an array with a header and data rows." };
    }

    // Skip the header row (index 0)
    const headerRow = payload[0];
    const dataRows = payload.slice(1);
    const allKeys = Object.keys(headerRow);
    let updateCount = 0;

    // 🕵️ INDEX-BASED DISCOVERY
    const findIndex = (searchTerms: string[]) => {
      return allKeys.findIndex(key => {
        const keyLower = key.toLowerCase();
        return searchTerms.some(term => keyLower.includes(term.toLowerCase()));
      });
    };

    const carHireIdx = findIndex(['car hire']);
    const taxiIdx = findIndex(['taxi']);
    const publicTransportIdx = findIndex(['public transport', 'bus']);
    const carPurchaseIdx = findIndex(['car purchase']);

    dataRows.forEach((row, idx) => {
      const rowKeys = Object.keys(row);

      const getField = (keys: string[]) => {
        const foundKey = rowKeys.find(k => keys.includes(k.trim().toLowerCase()) || keys.includes(k.trim()));
        return foundKey ? row[foundKey] : null;
      };

      const safeInt = (val: any) => {
        if (val === null || val === undefined) return 0;
        const str = String(val).replace(/[^0-9.]/g, '');
        const parsed = Math.round(parseFloat(str));
        return isNaN(parsed) ? 0 : parsed;
      };

      const countryRaw = getField(['field1', 'country', 'Country']);
      if (!countryRaw || String(countryRaw).toLowerCase() === 'country') return;

      const countryId = canonicalCountry(String(countryRaw)).replace(/\s+/g, '-');
      const ref = doc(db, col, countryId);

      // 🛰️ INDEX-OFFSET PROTOCOL
      const extractGroup = (startIdx: number) => {
        if (startIdx === -1) return { single: 0, marriedDualIncome: 0, family1Child: 0, family2Children: 0, family3PlusChildren: 0 };
        return {
          single: safeInt(row[rowKeys[startIdx]]),
          marriedDualIncome: safeInt(row[rowKeys[startIdx + 1]]),
          family1Child: safeInt(row[rowKeys[startIdx + 2]]),
          family2Children: safeInt(row[rowKeys[startIdx + 3]]),
          family3PlusChildren: safeInt(row[rowKeys[startIdx + 4]]),
        };
      };

      const intel = {
        country: String(countryRaw),
        carHire: extractGroup(carHireIdx),
        taxi: extractGroup(taxiIdx),
        publicTransport: extractGroup(publicTransportIdx),
        carPurchase: extractGroup(carPurchaseIdx),
        bestOptionDriver: getField(['field22', 'best option driver']) || row[rowKeys[21]] || "",
        bestOptionNoDriver: getField(['field23', 'best option no driver']) || row[rowKeys[22]] || "",
        lastUpdated: new Date().toISOString()
      };

      if (idx < 2 || countryId.includes('argentina') || countryId.includes('czech')) {
        console.log(`🛰️ DATA TRACE [${countryId}]:`, {
          bus_single: intel.publicTransport.single,
          bus_married: intel.publicTransport.marriedDualIncome,
          car_single: intel.carHire.single
        });
      }

      batch.set(ref, intel, { merge: true });
      updateCount++;
    });

    await batch.commit();
    console.log(`✅ TRANSPORT UPLOAD COMPLETE: ${updateCount} documents synchronized.`);
    return { success: true, count: updateCount };
  } catch (error: any) {
    console.error('❌ TRANSPORT UPLOAD ERROR:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🛰️ Action: Enrich All Schools
 * Triggers the AI to populate missing descriptions and imagery for the registry.
 */
export async function enrichAllSchoolsAction(prevState: any): Promise<BulkEnrichState> {
  const summary = { total: 0, enriched: 0, failed: 0 };
  try {
    const snap = await getDocs(collection(db, 'schools'));
    const schools = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
      id: d.id,
      ...d.data()
    }));

    summary.total = schools.length;

    for (const school of schools as any) {
      if (!school.summary || !school.imageUrl) {
        try {
          const { enrichSchoolData } = await import('@/ai/flows/enrich-school-data-flow');
          const res = await enrichSchoolData({
            name: school.schoolname || school.name,
            location: school.city,
            country: school.country
          });

          await updateDoc(doc(db, 'schools', school.id), {
            summary: res.description,
            description: res.description,
            imageUrl: res.imageUrl || school.imageUrl,
            websiteUrl: res.websiteUrl || school.website
          });
          summary.enriched++;
        } catch {
          summary.failed++;
        }
      }
    }
    return { message: "Tactical enrichment complete", error: null, summary };
  } catch (e: any) {
    return { message: null, error: e.message, summary };
  }
}

/**
 * 🛰️ Action: Update Country Indexes (Matrix)
 * Uses Genkit to calculate Adventure and Culture formulas based on macro data.
 */
export async function updateCountryIndexesAction(countryId: string, countryName: string) {
  try {
    const { generateCountryIndexesFlow } = await import('@/ai/flows/generate-country-indexes-flow');
    const res = await generateCountryIndexesFlow({ country: countryName });

    const docRef = doc(db, 'locations_costOfLiving', countryId);

    // We update rather than set, as the base cost of living doc should exist
    await updateDoc(docRef, {
      adventureScore: res.adventureScore,
      cultureScore: res.cultureScore,
      careerScore: res.careerScore,
      indexesLastUpdated: new Date().toISOString()
    }).catch(async (e) => {
      // If doc doesn't exist, create it with bare minimum
      await setDoc(docRef, {
        country: countryName,
        id: countryId,
        adventureScore: res.adventureScore,
        cultureScore: res.cultureScore,
        careerScore: res.careerScore,
        indexesLastUpdated: new Date().toISOString()
      });
    });

    return { success: true, data: res };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * 🛰️ Action: Clear Country Indexes (Matrix)
 * Removes the AI-generated indexes from a country.
 */
export async function clearCountryIndexesAction(countryId: string) {
  try {
    const docRef = doc(db, 'locations_costOfLiving', countryId);
    await updateDoc(docRef, {
      adventureScore: null,
      cultureScore: null,
      indexesLastUpdated: null
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}