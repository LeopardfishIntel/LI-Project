'use server';

import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import {
  getCollectionDocs,
  getDocument,
  setDocument,
  updateDocument,
  DatabaseBatch
} from '@/firebase/admin';
import { invalidateDecideCache } from '@/lib/decide-cache';
import { canonicalCountry } from '@/lib/calculations';

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
    const docId = locationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const existing = await getDocument('locations_costOfLiving', docId);
    const dataToSave = {
      ...res,
      city: locationName,
      country: countryName,
      lastSync: new Date().toISOString()
    };

    if (existing.exists()) {
      await updateDocument('locations_costOfLiving', docId, dataToSave);
    } else {
      await setDocument('locations_costOfLiving', docId, {
        ...dataToSave,
        id: docId
      });
    }

    // Invalidate Decide comparison page cache for instant updates
    invalidateDecideCache();

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
    const [telemetryDocs, pageViewsDocs, schoolsDocs, colDocs, enquiriesDocs] = await Promise.all([
      getCollectionDocs('telemetry').catch(err => {
        console.warn("Telemetry collection read failed:", err.message || err);
        return null;
      }),
      getCollectionDocs('app_metrics').catch(err => {
        console.warn("App metrics collection read failed:", err.message || err);
        return null;
      }),
      getCollectionDocs('schools').catch(err => {
        console.warn("Schools collection read failed:", err.message || err);
        return null;
      }),
      getCollectionDocs('locations_costOfLiving').catch(err => {
        console.warn("Locations cost of living collection read failed:", err.message || err);
        return null;
      }),
      getCollectionDocs('enquiries').catch(err => {
        console.warn("Enquiries collection read failed:", err.message || err);
        return null;
      })
    ]);

    const legacyTelemetry: any = {};
    const events: any[] = [];

    if (telemetryDocs) {
      telemetryDocs.forEach((doc: any) => {
        const dData = doc.data();
        if (dData.event_name) {
          events.push({ id: doc.id, ...dData });
        } else {
          // Merge legacy fields
          Object.assign(legacyTelemetry, dData);
        }
      });
    }

    const pageViewsDoc = pageViewsDocs ? pageViewsDocs.find((d: any) => d.id === 'page_views') : null;
    const pageViews = pageViewsDoc ? pageViewsDoc.data() : {};

    // Calculate unique countries
    const schoolCountries = (schoolsDocs && schoolsDocs.length > 0) ? schoolsDocs.map((d: any) => d.data().country).filter(Boolean) : [];
    const colCountries = (colDocs && colDocs.length > 0) ? colDocs.map((d: any) => d.data().country || d.data().country_name).filter(Boolean) : [];
    const uniqueCountries = new Set([...schoolCountries, ...colCountries]).size;

    // Calculate pending enquiries count
    let pendingEnquiries = 0;
    if (enquiriesDocs) {
      pendingEnquiries = enquiriesDocs.filter((d: any) => d.data().status === 'pending').length;
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

    const schoolStats: Record<string, { raw: number; visitors: Set<string> }> = {};
    const countryStats: Record<string, { raw: number; visitors: Set<string> }> = {};
    const clientCountryStats: Record<string, { raw: number; visitors: Set<string> }> = {};
    const regionStats: Record<string, { raw: number; visitors: Set<string> }> = {};
    const redFlagCounts: Record<string, number> = {};

    let authVisits = 0;
    let guestVisits = 0;

    const dailyVisits: Record<string, number> = {};

    // 👥 Unique Visitor Analysis & Grouping Engine (Pre-mapped)
    const sessionToVisitor: Record<string, string> = {};
    events.forEach((evt: any) => {
      const visitorId = evt.visitor_id || evt.metadata?.visitor_id;
      const sessionId = evt.session_id;
      if (visitorId && sessionId) {
        sessionToVisitor[sessionId] = visitorId;
      }
    });

    // Map country names to regions from costOfLiving docs
    const countryToRegionMap: Record<string, string> = {};
    if (colDocs) {
      colDocs.forEach((doc: any) => {
        const data = doc.data();
        if (data.country) {
          const cName = data.country.toLowerCase().trim();
          if (data.region) {
            countryToRegionMap[cName] = data.region.trim();
          }
        }
      });
    }

    // Map school names to countries & regions
    const schoolToCountryAndRegion: Record<string, { country: string; region: string }> = {};
    if (schoolsDocs) {
      schoolsDocs.forEach((doc: any) => {
        const data = doc.data();
        const sName = (data.schoolname || data.name || '').toLowerCase().trim();
        const sCountry = (data.country || '').trim();
        const sRegion = countryToRegionMap[sCountry.toLowerCase().trim()] || '';
        if (sName) {
          schoolToCountryAndRegion[sName] = { country: sCountry, region: sRegion };
        }
      });
    }

    events.forEach((evt) => {
      const timestamp = evt.timestamp;
      const meta = evt.metadata || {};
      const sessionId = evt.session_id || 'unknown';
      const visitorId = 
        evt.visitor_id || 
        evt.metadata?.visitor_id || 
        sessionToVisitor[sessionId] || 
        sessionId || 
        'unknown';

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

      // Count client country access
      const clientCountry = evt.client_country || 'unknown';
      if (clientCountry !== 'unknown') {
        if (!clientCountryStats[clientCountry]) {
          clientCountryStats[clientCountry] = { raw: 0, visitors: new Set() };
        }
        clientCountryStats[clientCountry].raw++;
        if (visitorId !== 'unknown') {
          clientCountryStats[clientCountry].visitors.add(visitorId);
        }
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
        if (school !== 'unknown') {
          if (!schoolStats[school]) {
            schoolStats[school] = { raw: 0, visitors: new Set() };
          }
          schoolStats[school].raw++;
          if (visitorId !== 'unknown') {
            schoolStats[school].visitors.add(visitorId);
          }

          // Attribute country and region
          const mapping = schoolToCountryAndRegion[school.toLowerCase().trim()];
          if (mapping) {
            const { country, region } = mapping;
            if (country) {
              const cKey = country;
              if (!countryStats[cKey]) {
                countryStats[cKey] = { raw: 0, visitors: new Set() };
              }
              countryStats[cKey].raw++;
              if (visitorId !== 'unknown') {
                countryStats[cKey].visitors.add(visitorId);
              }
            }
            if (region) {
              const rKey = region;
              if (!regionStats[rKey]) {
                regionStats[rKey] = { raw: 0, visitors: new Set() };
              }
              regionStats[rKey].raw++;
              if (visitorId !== 'unknown') {
                regionStats[rKey].visitors.add(visitorId);
              }
            }
          }
        }
      }

      if (evt.event_name === 'country_query_executed') {
        const country = meta.country_name || 'unknown';
        if (country !== 'unknown') {
          const cKey = country;
          if (!countryStats[cKey]) {
            countryStats[cKey] = { raw: 0, visitors: new Set() };
          }
          countryStats[cKey].raw++;
          if (visitorId !== 'unknown') {
            countryStats[cKey].visitors.add(visitorId);
          }

          const region = countryToRegionMap[country.toLowerCase().trim()];
          if (region) {
            if (!regionStats[region]) {
              regionStats[region] = { raw: 0, visitors: new Set() };
            }
            regionStats[region].raw++;
            if (visitorId !== 'unknown') {
              regionStats[region].visitors.add(visitorId);
            }
          }
        }
      }

      if (evt.event_name === 'page_view') {
        const path = meta.path || '';
        if (path.startsWith('/discover/') && !path.startsWith('/discover/matrix')) {
          const slug = path.split('/discover/')[1]?.split('?')[0];
          if (slug) {
            const cleanSlug = slug.replace(/-/g, ' ');
            const matchedCOL = colDocs?.find((d: any) => canonicalCountry(d.data().country) === canonicalCountry(cleanSlug));
            const countryName = matchedCOL ? matchedCOL.data().country : cleanSlug;
            if (countryName) {
              const countryKey = countryName;
              if (!countryStats[countryKey]) {
                countryStats[countryKey] = { raw: 0, visitors: new Set() };
              }
              countryStats[countryKey].raw++;
              if (visitorId !== 'unknown') {
                countryStats[countryKey].visitors.add(visitorId);
              }

              const region = countryToRegionMap[countryKey.toLowerCase().trim()];
              if (region) {
                if (!regionStats[region]) {
                  regionStats[region] = { raw: 0, visitors: new Set() };
                }
                regionStats[region].raw++;
                if (visitorId !== 'unknown') {
                  regionStats[region].visitors.add(visitorId);
                }
              }
            }
          }
        }
      }

      if (evt.event_name === 'contract_red_flag_hovered') {
        const flag = meta.flag_name || 'unknown';
        redFlagCounts[flag] = (redFlagCounts[flag] || 0) + 1;
      }
    });

    avgNetSalary = netSalaryCount > 0 ? Math.round(netSalarySum / netSalaryCount) : 0;

    const visitorSessions: Record<string, Set<string>> = {};
    const visitorPageViews: Record<string, number> = {};

    events.forEach((evt: any) => {
      const sessionId = evt.session_id || 'unknown';
      const visitorId = 
        evt.visitor_id || 
        evt.metadata?.visitor_id || 
        sessionToVisitor[sessionId] || 
        sessionId || 
        'unknown';

      if (visitorId !== 'unknown') {
        if (!visitorSessions[visitorId]) {
          visitorSessions[visitorId] = new Set();
        }
        if (sessionId !== 'unknown') {
          visitorSessions[visitorId].add(sessionId);
        }

        if (evt.event_name === 'page_view') {
          visitorPageViews[visitorId] = (visitorPageViews[visitorId] || 0) + 1;
        }
      }
    });

    const uniqueVisitors = Object.keys(visitorSessions).length;
    let repeatVisitorsCount = 0;
    let totalSessionsSum = 0;

    Object.entries(visitorSessions).forEach(([visId, sessions]) => {
      const sessionCount = sessions.size;
      const pageViewCount = visitorPageViews[visId] || 0;
      totalSessionsSum += sessionCount;

      if (sessionCount > 1 || pageViewCount > 1) {
        repeatVisitorsCount++;
      }
    });

    const repeatVisitorRate = uniqueVisitors > 0 
      ? Math.round((repeatVisitorsCount / uniqueVisitors) * 100) 
      : 0;

    const avgVisitsPerUser = uniqueVisitors > 0 
      ? (totalSessionsSum / uniqueVisitors).toFixed(1) 
      : '0.0';

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
      totalSchools: schoolsDocs ? schoolsDocs.length : 0,
      totalLocations: colDocs ? colDocs.length : 0,
      uniqueCountries: uniqueCountries,
      pendingEnquiries: pendingEnquiries,
      uniqueVisitors,
      repeatVisitorRate,
      avgVisitsPerUser,
      
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
      userTypeBreakdown: {
        authenticated: authVisits,
        guest: guestVisits
      },
      visitsTrend
    };

    const mapStatsList = (statsRecord: Record<string, { raw: number; visitors: Set<string> }>) => {
      return Object.entries(statsRecord)
        .map(([name, val]) => ({
          name,
          raw: val.raw,
          unique: val.visitors.size
        }))
        .sort((a, b) => b.raw - a.raw);
    };

    const topSchools = mapStatsList(schoolStats).slice(0, 20);
    const topCountries = mapStatsList(countryStats).slice(0, 20);
    const topRegions = mapStatsList(regionStats).slice(0, 20);
    const topClientCountries = Object.entries(clientCountryStats)
      .map(([name, val]) => ({
        name: name.toUpperCase(),
        raw: val.raw,
        unique: val.visitors.size
      }))
      .sort((a, b) => b.raw - a.raw)
      .slice(0, 20);

    const redFlagHovers = Object.entries(redFlagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Ensure all schools in database are included in full list
    const allSchoolsMap: Record<string, { name: string; raw: number; unique: number }> = {};
    if (schoolsDocs) {
      schoolsDocs.forEach((doc: any) => {
        const sName = doc.data().schoolname || doc.data().name || 'Unknown';
        allSchoolsMap[sName.toLowerCase().trim()] = { name: sName, raw: 0, unique: 0 };
      });
    }
    Object.entries(schoolStats).forEach(([name, val]) => {
      allSchoolsMap[name.toLowerCase().trim()] = {
        name,
        raw: val.raw,
        unique: val.visitors.size
      };
    });
    const allSchools = Object.values(allSchoolsMap).sort((a, b) => b.raw - a.raw);

    // Ensure all countries in database are included
    const allCountriesMap: Record<string, { name: string; raw: number; unique: number }> = {};
    if (colDocs) {
      colDocs.forEach((doc: any) => {
        const cName = doc.data().country;
        if (cName) {
          allCountriesMap[cName.toLowerCase().trim()] = { name: cName, raw: 0, unique: 0 };
        }
      });
    }
    Object.entries(countryStats).forEach(([name, val]) => {
      allCountriesMap[name.toLowerCase().trim()] = {
        name,
        raw: val.raw,
        unique: val.visitors.size
      };
    });
    const allCountries = Object.values(allCountriesMap).sort((a, b) => b.raw - a.raw);

    // Ensure all regions are included
    const allRegionsMap: Record<string, { name: string; raw: number; unique: number }> = {};
    if (colDocs) {
      colDocs.forEach((doc: any) => {
        const rName = doc.data().region;
        if (rName) {
          allRegionsMap[rName.toLowerCase().trim()] = { name: rName, raw: 0, unique: 0 };
        }
      });
    }
    Object.entries(regionStats).forEach(([name, val]) => {
      allRegionsMap[name.toLowerCase().trim()] = {
        name,
        raw: val.raw,
        unique: val.visitors.size
      };
    });
    const allRegions = Object.values(allRegionsMap).sort((a, b) => b.raw - a.raw);

    const finalData = {
      ...data,
      topSchools,
      topCountries,
      topRegions,
      topClientCountries,
      redFlagHovers,
      allSchools,
      allCountries,
      allRegions
    };

    return { success: true, data: finalData };
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
    const batch = new DatabaseBatch();
    const col = 'locations_costOfLiving';

    if (!data?.length) return { success: false, error: "Zero records detected in payload" };

    const isTransport = 'carHire' in data[0] || 'transport' in data[0] || 'publicTransport' in data[0];
    const isLifestyle = 'lifestyle' in data[0] || 'ikea' in data[0];

    if (isTransport || isLifestyle) {
      const snapDocs = await getCollectionDocs(col);

      data.forEach(item => {
        // 🛰️ Key Normalization
        const intel: any = {};
        Object.keys(item).forEach(k => { intel[k.toLowerCase().trim()] = item[k]; });

        // ✅ Zero-Doubt Filter Logic
        const targetDocs = snapDocs.filter((d: any) =>
          d.data().country?.toLowerCase() === intel.country?.toLowerCase()
        );

        targetDocs.forEach((d: any) => {
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

          batch.set(col, d.id, update, { merge: true });
        });
      });

      await batch.commit();
      invalidateDecideCache();
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

      let id = normalized.id;
      if (!id) {
        const base = normalized.schoolname || normalized.city || 'entry';
        id = base
          .toLowerCase()
          .trim()
          .replace(/&/g, 'and')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/[\s-]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      batch.set(targetCol, String(id), {
        ...normalized,
        lastSync: new Date().toISOString()
      }, { merge: true });
    });

    await batch.commit();
    invalidateDecideCache();
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
    const batch = new DatabaseBatch();
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
      const docId = countryName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s-]+/g, '-')
        .replace(/^-+|-+$/g, '');
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

      batch.set(colName, docId, docData, { merge: true });
      count++;
    }

    await batch.commit();
    invalidateDecideCache();
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
    const batch = new DatabaseBatch();
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
    const publicTransportIdx = findIndex(['public transport', 'bus']);
    const bestOptionDriverIdx = findIndex(['best option driver']);
    const bestOptionNoDriverIdx = findIndex(['best option no driver']);
    const slugify = (str: string) => str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '');

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

      const field1Raw = getField(['field1', 'country', 'Country']);
      if (!field1Raw || String(field1Raw).toLowerCase() === 'country') return;

      const parts = String(field1Raw).split('-');
      const countryRaw = parts[0]?.trim() || '';
      const cityRaw = parts[1]?.trim() || '';

      const countrySlug = slugify(canonicalCountry(countryRaw));
      const citySlug = slugify(cityRaw);

      const docId = citySlug ? `${countrySlug}-${citySlug}` : countrySlug;

      // 🛰️ INDEX-OFFSET PROTOCOL
      const extractGroup = (startIdx: number) => {
        if (startIdx === -1) return { single: 0, marriedDualIncome: 0, family1Child: 0, family2Children: 0, family3PlusChildren: 0 };
        return {
          single: safeInt(row[allKeys[startIdx]]),
          marriedDualIncome: safeInt(row[allKeys[startIdx + 1]]),
          family1Child: safeInt(row[allKeys[startIdx + 2]]),
          family2Children: safeInt(row[allKeys[startIdx + 3]]),
          family3PlusChildren: safeInt(row[allKeys[startIdx + 4]]),
        };
      };

      const intel = {
        country: countryRaw,
        city: cityRaw,
        carHire: extractGroup(carHireIdx),
        publicTransport: extractGroup(publicTransportIdx),
        bestOptionDriver: getField(['field12', 'field22', 'best option driver']) || (bestOptionDriverIdx !== -1 ? row[allKeys[bestOptionDriverIdx]] : "") || "",
        bestOptionNoDriver: getField(['field13', 'field23', 'best option no driver']) || (bestOptionNoDriverIdx !== -1 ? row[allKeys[bestOptionNoDriverIdx]] : "") || "",
        lastUpdated: new Date().toISOString()
      };
      batch.set(col, docId, intel, { merge: true });
      updateCount++;
    });

    await batch.commit();
    invalidateDecideCache();
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
    const snapDocs = await getCollectionDocs('schools');
    const schools = snapDocs.map((d: any) => ({
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

          await updateDocument('schools', school.id, {
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

    const existing = await getDocument('locations_costOfLiving', countryId);
    const dataToSave = {
      adventureScore: res.adventureScore,
      cultureScore: res.cultureScore,
      careerScore: res.careerScore,
      indexesLastUpdated: new Date().toISOString()
    };

    if (existing.exists()) {
      await updateDocument('locations_costOfLiving', countryId, dataToSave);
    } else {
      await setDocument('locations_costOfLiving', countryId, {
        ...dataToSave,
        country: countryName,
        id: countryId
      });
    }

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
    await updateDocument('locations_costOfLiving', countryId, {
      adventureScore: null,
      cultureScore: null,
      indexesLastUpdated: null
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * 🛰️ Action: Get School Telemetry Stats
 * Aggregates views and evaluation stats for a single school from Firestore.
 */
export async function getSchoolTelemetryStatsAction(schoolName: string) {
  try {
    const telemetryDocs = await getCollectionDocs('telemetry');
    if (!telemetryDocs) {
      return { success: true, views: 0, evaluations: 0 };
    }

    let views = 0;
    let evaluations = 0;

    telemetryDocs.forEach((doc: any) => {
      const data = doc.data();
      if (data.event_name === 'school_profile_viewed' && data.metadata?.school_name === schoolName) {
        views++;
      }
      if (data.event_name === 'briefing_generated' && data.metadata?.school_name === schoolName) {
        evaluations++;
      }
    });

    return { success: true, views, evaluations };
  } catch (err: any) {
    console.error("Failed to query school telemetry stats:", err.message || err);
    return { success: false, error: err.message, views: 0, evaluations: 0 };
  }
}
export interface CrawlLogItem {
  id: string;
  engine: string;
  addedCount: number;
  removedCount: number;
  totalFound: number;
  dbMatched: number;
  durationMs: number;
  createdAt: string;
}

/**
 * 🛰️ Action: Get Crawl Logs Data
 * Retrieves recent differential crawl logs for the Data Command Telemetry Dashboard.
 */
export async function getCrawlLogsAction(): Promise<{ success: boolean; data: CrawlLogItem[]; error: string | null }> {
  try {
    const { getAdminDb } = await import("@/firebase/admin");
    const db = getAdminDb();
    if (!db) return { success: false, data: [], error: "Admin DB unavailable" };

    const snap = await db.collection("crawllogs").orderBy("createdAt", "desc").limit(100).get();
    const logs: CrawlLogItem[] = snap.docs.map((doc: any) => {
      const d = doc.data();
      return {
        id: doc.id,
        engine: d.engine || "UNKNOWN",
        addedCount: Number(d.addedCount || 0),
        removedCount: Number(d.removedCount || 0),
        totalFound: Number(d.totalFound || 0),
        dbMatched: Number(d.dbMatched || 0),
        durationMs: Number(d.durationMs || 0),
        createdAt: String(d.createdAt || new Date().toISOString())
      };
    });

    return { success: true, data: logs, error: null };
  } catch (err: any) {
    console.warn("⚠️ Failed to fetch crawl logs:", err?.message || err);
    return { success: false, data: [], error: err?.message || String(err) };
  }
}


export interface EngineCoolingItem {
  engineKey: string;
  isCooling: boolean;
  coolingUntilMillis: number;
  reason?: string;
  statusCode?: number;
  lastTripAt?: string;
}

/**
 * 🧊 Action: Get Circuit Breaker Cooling Statuses
 */
export async function getCoolingStatusesAction(): Promise<{ success: boolean; data: Record<string, EngineCoolingItem>; error: string | null }> {
  try {
    const { getAdminDb } = await import("@/firebase/admin");
    const db = getAdminDb();
    if (!db) return { success: false, data: {}, error: "Admin DB unavailable" };

    const snap = await db.collection("crawler_engine_status").get();
    const result: Record<string, EngineCoolingItem> = {};

    snap.docs.forEach((doc: any) => {
      const data = doc.data();
      const keyUpper = String(doc.id).toUpperCase();
      result[keyUpper] = {
        engineKey: keyUpper,
        isCooling: Boolean(data.coolingUntilMillis && data.coolingUntilMillis > Date.now()),
        coolingUntilMillis: Number(data.coolingUntilMillis || 0),
        reason: data.reason ? String(data.reason) : undefined,
        statusCode: data.statusCode ? Number(data.statusCode) : undefined,
        lastTripAt: data.lastTripAt ? String(data.lastTripAt) : undefined
      };
    });

    return { success: true, data: result, error: null };
  } catch (err: any) {
    return { success: false, data: {}, error: err?.message || String(err) };
  }
}
