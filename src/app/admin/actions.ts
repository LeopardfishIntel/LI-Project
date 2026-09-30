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
    const [telemetryDocs, pageViewsDocs, schoolsDocs, colDocs, enquiriesDocs, teachersDocs] = await Promise.all([
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
      }),
      getCollectionDocs('teachers').catch(err => {
        console.warn("Teachers collection read failed:", err.message || err);
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

    // 🏛️ 3-Tier Conversion Funnel & 10 Key Event Trackers
    const allVisitorIds = new Set<string>();
    const allSessionIds = new Set<string>();
    const returnVisitorIds = new Set<string>();
    const engagedVisitorIds = new Set<string>();
    const engagedSessionIds = new Set<string>();
    const convertedVisitorIds = new Set<string>();

    const kpiTrackers = {
      forecaster_opened: { count: 0, visitors: new Set<string>() },
      school_selected: { count: 0, visitors: new Set<string>() },
      salary_changed: { count: 0, visitors: new Set<string>() },
      surplus_viewed: { count: 0, visitors: new Set<string>() },
      compare_started: { count: 0, visitors: new Set<string>() },
      evaluation_completed: { count: 0, visitors: new Set<string>() },
      briefing_generated: { count: 0, visitors: new Set<string>() },
      job_application_link_clicked: { count: 0, visitors: new Set<string>() },
      registration: { count: 0, visitors: new Set<string>() },
      return_visit: { count: 0, visitors: new Set<string>() }
    };

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

    // ─── 24H DELTAS: WHAT CHANGED SINCE YESTERDAY ───
    const now = new Date();
    const window24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const window48hStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const visitors24h = new Set<string>();
    const visitorsPrev24h = new Set<string>();

    const forecasterUsers24h = new Set<string>();
    const forecasterUsersPrev24h = new Set<string>();

    const schoolsEvaluated24h = new Set<string>();
    const schoolsEvaluatedPrev24h = new Set<string>();

    let salaryAdjusters24h = new Set<string>();
    let salaryAdjustersPrev24h = new Set<string>();

    let briefings24hCount = 0;
    let briefingsPrev24hCount = 0;

    let registrations24hCount = 0;
    let registrationsPrev24hCount = 0;

    let surplusModelled24h = 0;
    let surplusModelledPrev24h = 0;

    let jobClicks24h = 0;
    let jobClicksPrev24h = 0;

    // High Intent Educator Journeys Mapping
    const highIntentEducatorsMap: Record<string, {
      visitorId: string;
      email?: string;
      isAuthenticated: boolean;
      country?: string;
      schools: Set<string>;
      actions: string[];
      modelledSurplus: boolean;
      salaryAdjusted: boolean;
      completedEvaluation: boolean;
      generatedBriefing: boolean;
      jobClicked: boolean;
      returnVisits: number;
      lastActive: string;
    }> = {};

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

      const evtDate = timestamp ? new Date(timestamp) : null;
      const in24h = evtDate && evtDate >= window24hStart;
      const inPrev24h = evtDate && evtDate >= window48hStart && evtDate < window24hStart;

      if (visitorId !== 'unknown') {
        allVisitorIds.add(visitorId);
        if (in24h) visitors24h.add(visitorId);
        if (inPrev24h) visitorsPrev24h.add(visitorId);

        // High intent aggregator entry
        if (!highIntentEducatorsMap[visitorId]) {
          highIntentEducatorsMap[visitorId] = {
            visitorId,
            email: meta.user_email || meta.email || (meta.isAuthenticated ? 'Auth User' : undefined),
            isAuthenticated: !!(meta.isAuthenticated || meta.user_email),
            country: evt.client_country || 'Unknown',
            schools: new Set<string>(),
            actions: [],
            modelledSurplus: false,
            salaryAdjusted: false,
            completedEvaluation: false,
            generatedBriefing: false,
            jobClicked: false,
            returnVisits: 0,
            lastActive: timestamp || ''
          };
        }
        if (meta.user_email) highIntentEducatorsMap[visitorId].email = meta.user_email;
        if (timestamp && timestamp > highIntentEducatorsMap[visitorId].lastActive) {
          highIntentEducatorsMap[visitorId].lastActive = timestamp;
        }
      }
      if (sessionId !== 'unknown') allSessionIds.add(sessionId);

      // Return visitor detection
      if (evt.event_name === 'return_visit' || meta.is_return_visitor) {
        if (visitorId !== 'unknown') {
          returnVisitorIds.add(visitorId);
          if (highIntentEducatorsMap[visitorId]) {
            highIntentEducatorsMap[visitorId].returnVisits++;
          }
        }
        kpiTrackers.return_visit.count++;
        if (visitorId !== 'unknown') kpiTrackers.return_visit.visitors.add(visitorId);
      }

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

      // --- 10 Specific KPIs and 3-Tier Classification ---
      const markEngaged = () => {
        if (visitorId !== 'unknown') engagedVisitorIds.add(visitorId);
        if (sessionId !== 'unknown') engagedSessionIds.add(sessionId);
      };

      const markConverted = () => {
        if (visitorId !== 'unknown') {
          engagedVisitorIds.add(visitorId);
          convertedVisitorIds.add(visitorId);
        }
        if (sessionId !== 'unknown') {
          engagedSessionIds.add(sessionId);
        }
      };

      // 1. Forecaster Opened
      if (evt.event_name === 'forecaster_opened' || (evt.event_name === 'page_view' && (meta.path === '/financial-forecaster/' || meta.path === '/financial-forecaster'))) {
        kpiTrackers.forecaster_opened.count++;
        if (visitorId !== 'unknown') {
          kpiTrackers.forecaster_opened.visitors.add(visitorId);
          if (in24h) forecasterUsers24h.add(visitorId);
          if (inPrev24h) forecasterUsersPrev24h.add(visitorId);
          if (highIntentEducatorsMap[visitorId]) highIntentEducatorsMap[visitorId].actions.push('Opened Forecaster');
        }
        markEngaged();
      }

      // 2. School Selected
      if (evt.event_name === 'school_selected' || evt.event_name === 'school_profile_viewed') {
        kpiTrackers.school_selected.count++;
        const sName = meta.school_name || meta.target_school;
        if (visitorId !== 'unknown') {
          kpiTrackers.school_selected.visitors.add(visitorId);
          if (sName && highIntentEducatorsMap[visitorId]) {
            highIntentEducatorsMap[visitorId].schools.add(sName);
            highIntentEducatorsMap[visitorId].actions.push(`Viewed ${sName}`);
          }
        }
        if (sName) {
          if (in24h) schoolsEvaluated24h.add(sName);
          if (inPrev24h) schoolsEvaluatedPrev24h.add(sName);
        }
        markEngaged();
      }

      // 3. Salary Changed
      if (evt.event_name === 'salary_changed' || (evt.event_name === 'simulator_dial_adjusted' && meta.dial_modified === 'net_salary')) {
        kpiTrackers.salary_changed.count++;
        if (visitorId !== 'unknown') {
          kpiTrackers.salary_changed.visitors.add(visitorId);
          if (in24h) salaryAdjusters24h.add(visitorId);
          if (inPrev24h) salaryAdjustersPrev24h.add(visitorId);
          if (highIntentEducatorsMap[visitorId]) {
            highIntentEducatorsMap[visitorId].salaryAdjusted = true;
            highIntentEducatorsMap[visitorId].actions.push('Adjusted Salary Dial');
          }
        }
        markEngaged();
      }

      // 4. Surplus Modelled / Viewed
      if (evt.event_name === 'surplus_modelled' || evt.event_name === 'surplus_viewed') {
        kpiTrackers.surplus_viewed.count++;
        if (visitorId !== 'unknown') {
          kpiTrackers.surplus_viewed.visitors.add(visitorId);
          if (highIntentEducatorsMap[visitorId]) {
            highIntentEducatorsMap[visitorId].modelledSurplus = true;
            highIntentEducatorsMap[visitorId].actions.push('Modelled Disposable Surplus');
          }
        }
        if (in24h) surplusModelled24h++;
        if (inPrev24h) surplusModelledPrev24h++;
        markEngaged();
      }

      // 5. Compare Started
      if (evt.event_name === 'compare_started' || evt.event_name === 'comparison_made' || (evt.event_name === 'page_view' && meta.path?.startsWith('/decide'))) {
        kpiTrackers.compare_started.count++;
        if (visitorId !== 'unknown') {
          kpiTrackers.compare_started.visitors.add(visitorId);
          if (highIntentEducatorsMap[visitorId]) highIntentEducatorsMap[visitorId].actions.push('Compared Schools');
        }
        markEngaged();
      }

      // 6. Evaluation Completed
      if (evt.event_name === 'evaluation_completed') {
        kpiTrackers.evaluation_completed.count++;
        if (visitorId !== 'unknown') {
          kpiTrackers.evaluation_completed.visitors.add(visitorId);
          if (highIntentEducatorsMap[visitorId]) {
            highIntentEducatorsMap[visitorId].completedEvaluation = true;
            highIntentEducatorsMap[visitorId].actions.push('Completed School Shootout');
          }
        }
        markEngaged();
      }

      // 7. Briefing Generated
      if (evt.event_name === 'briefing_generated') {
        kpiTrackers.briefing_generated.count++;
        if (visitorId !== 'unknown') {
          kpiTrackers.briefing_generated.visitors.add(visitorId);
          if (highIntentEducatorsMap[visitorId]) {
            highIntentEducatorsMap[visitorId].generatedBriefing = true;
            highIntentEducatorsMap[visitorId].actions.push('Generated Tactical Briefing');
          }
        }
        if (in24h) briefings24hCount++;
        if (inPrev24h) briefingsPrev24hCount++;
        markConverted();
      }

      // 8. Job Application Link Clicked
      if (evt.event_name === 'job_application_link_clicked') {
        kpiTrackers.job_application_link_clicked.count++;
        if (visitorId !== 'unknown') {
          kpiTrackers.job_application_link_clicked.visitors.add(visitorId);
          if (highIntentEducatorsMap[visitorId]) {
            highIntentEducatorsMap[visitorId].jobClicked = true;
            highIntentEducatorsMap[visitorId].actions.push('Clicked Apply Link');
          }
        }
        if (in24h) jobClicks24h++;
        if (inPrev24h) jobClicksPrev24h++;
        markConverted();
      }

      // 9. Registration
      if (evt.event_name === 'registration') {
        kpiTrackers.registration.count++;
        if (visitorId !== 'unknown') {
          kpiTrackers.registration.visitors.add(visitorId);
          if (highIntentEducatorsMap[visitorId]) {
            highIntentEducatorsMap[visitorId].actions.push('Completed Registration');
          }
        }
        if (in24h) registrations24hCount++;
        if (inPrev24h) registrationsPrev24hCount++;
        markConverted();
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
        returnVisitorIds.add(visId);
      }
    });

    const repeatVisitorRate = uniqueVisitors > 0 
      ? Math.round((repeatVisitorsCount / uniqueVisitors) * 100) 
      : 0;

    const avgVisitsPerUser = uniqueVisitors > 0 
      ? (totalSessionsSum / uniqueVisitors).toFixed(1) 
      : '0.0';

    // Total registered educators from database
    const registeredTeachersCount = teachersDocs ? teachersDocs.length : kpiTrackers.registration.count;

    // 🏛️ 3-Tier Conversion Funnel Construction
    const totalSessions = Math.max(allSessionIds.size, uniqueVisitors, 1);
    const totalEngagedVisitors = engagedVisitorIds.size;
    const totalEngagedSessions = engagedSessionIds.size;
    const totalConvertedVisitors = Math.max(convertedVisitorIds.size, registeredTeachersCount);

    const engagementRate = uniqueVisitors > 0 ? Math.round((totalEngagedVisitors / uniqueVisitors) * 100) : 0;
    const conversionRate = uniqueVisitors > 0 ? Math.round((totalConvertedVisitors / uniqueVisitors) * 100) : 0;
    const engagedToConversionRate = totalEngagedVisitors > 0 ? Math.round((totalConvertedVisitors / totalEngagedVisitors) * 100) : 0;

    const funnelReadout = `${totalSessions} visitor sessions → ${totalEngagedVisitors} engaged prospects (${engagementRate}%) → ${registeredTeachersCount} registered educators → ${kpiTrackers.briefing_generated.count + kpiTrackers.job_application_link_clicked.count} intelligence products & applications`;

    // ─── 24H DELTAS CALCULATION ───
    const formatDelta = (curr: number, prev: number) => {
      if (prev === 0) {
        return curr > 0 ? `${curr} (+100%)` : `0 (0%)`;
      }
      const pct = Math.round(((curr - prev) / prev) * 100);
      const sign = pct >= 0 ? `+${pct}%` : `${pct}%`;
      return `${curr} (${sign})`;
    };

    const whatChangedSinceYesterday = {
      visitorsDelta: formatDelta(visitors24h.size, visitorsPrev24h.size),
      forecasterDelta: formatDelta(forecasterUsers24h.size, forecasterUsersPrev24h.size),
      schoolsEvaluatedDelta: formatDelta(schoolsEvaluated24h.size, schoolsEvaluatedPrev24h.size),
      salaryAdjustersDelta: formatDelta(salaryAdjusters24h.size, salaryAdjustersPrev24h.size),
      registrationsDelta: formatDelta(registrations24hCount, registrationsPrev24hCount),
      briefingsDelta: formatDelta(briefings24hCount, briefingsPrev24hCount),
      jobClicksDelta: formatDelta(jobClicks24h, jobClicksPrev24h),
    };

    // Filter High-Intent Educators (who performed meaningful actions)
    const highIntentEducators = Object.values(highIntentEducatorsMap)
      .filter(p => p.modelledSurplus || p.salaryAdjusted || p.completedEvaluation || p.generatedBriefing || p.jobClicked || p.schools.size > 0)
      .map(p => ({
        visitorId: p.visitorId,
        email: p.email,
        isAuthenticated: p.isAuthenticated,
        country: p.country,
        schools: Array.from(p.schools),
        actionsCount: p.actions.length,
        modelledSurplus: p.modelledSurplus,
        salaryAdjusted: p.salaryAdjusted,
        completedEvaluation: p.completedEvaluation,
        generatedBriefing: p.generatedBriefing,
        jobClicked: p.jobClicked,
        returnVisits: p.returnVisits,
        lastActiveFormatted: p.lastActive ? new Date(p.lastActive).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }) + ' UTC' : 'Recent'
      }))
      .sort((a, b) => b.actionsCount - a.actionsCount)
      .slice(0, 10);

    const funnel = {
      readout: funnelReadout,
      whatChanged: whatChangedSinceYesterday,
      highIntentEducators,
      tier1: {
        title: "Visitors",
        description: "Total people who arrived on the platform",
        totalSessions: totalSessions,
        uniqueVisitors: uniqueVisitors,
        returnVisitors: returnVisitorIds.size,
        returnVisitorRate: repeatVisitorRate,
        bounceRate: uniqueVisitors > 0 ? Math.max(0, 100 - engagementRate) : 0,
      },
      tier2: {
        title: "Engaged Educators",
        description: "Unique educators using Forecaster, Compare, or School Evaluations",
        totalEngagedSessions: totalEngagedSessions,
        uniqueEngagedVisitors: totalEngagedVisitors,
        engagementRate: engagementRate,
      },
      tier3: {
        title: "Conversions",
        description: "Registered educators, verified profiles, briefings generated, or job applications",
        totalConversions: totalConvertedVisitors,
        registeredEducators: registeredTeachersCount,
        briefingsGenerated: kpiTrackers.briefing_generated.count,
        jobApplicationsClicked: kpiTrackers.job_application_link_clicked.count,
        conversionRate: conversionRate,
        engagedToConversionRate: engagedToConversionRate,
      },
      kpis: [
        {
          id: "forecaster_opened",
          title: "Forecaster Opened",
          category: "Tier 2: Engaged",
          description: "Opened the Financial Forecaster simulation",
          events: kpiTrackers.forecaster_opened.count,
          educators: kpiTrackers.forecaster_opened.visitors.size
        },
        {
          id: "school_selected",
          title: "School Selected",
          category: "Tier 2: Engaged",
          description: "Picked a school from dropdown, search, or dossier",
          events: kpiTrackers.school_selected.count,
          educators: kpiTrackers.school_selected.visitors.size
        },
        {
          id: "salary_changed",
          title: "Salary Changed",
          category: "Tier 2: Engaged",
          description: "Adjusted net salary slider or entered compensation",
          events: kpiTrackers.salary_changed.count,
          educators: kpiTrackers.salary_changed.visitors.size
        },
        {
          id: "surplus_modelled",
          title: "Surplus Modelled",
          category: "Tier 2: Engaged",
          description: "Produced valid surplus after input interaction",
          events: Math.max(kpiTrackers.surplus_viewed.count, kpiTrackers.salary_changed.count),
          educators: Math.max(kpiTrackers.surplus_viewed.visitors.size, kpiTrackers.salary_changed.visitors.size)
        },
        {
          id: "compare_started",
          title: "Compare Started",
          category: "Tier 2: Engaged",
          description: "Initiated a side-by-side school comparison shootout",
          events: kpiTrackers.compare_started.count,
          educators: kpiTrackers.compare_started.visitors.size
        },
        {
          id: "evaluation_completed",
          title: "Evaluation Completed",
          category: "Tier 2: Engaged",
          description: "Unlocked school decision matrix or full evaluation",
          events: kpiTrackers.evaluation_completed.count,
          educators: kpiTrackers.evaluation_completed.visitors.size
        },
        {
          id: "briefing_generated",
          title: "Briefing Generated",
          category: "Tier 3: Conversion",
          description: "Created custom tactical intelligence PDF/report",
          events: kpiTrackers.briefing_generated.count,
          educators: kpiTrackers.briefing_generated.visitors.size
        },
        {
          id: "job_application_link_clicked",
          title: "Job Application Link Clicked",
          category: "Tier 3: Conversion",
          description: "Outbound click to direct ATS / recruiter application",
          events: kpiTrackers.job_application_link_clicked.count,
          educators: kpiTrackers.job_application_link_clicked.visitors.size
        },
        {
          id: "registration",
          title: "Registration",
          category: "Tier 3: Conversion",
          description: "Created verified educator membership account",
          events: registeredTeachersCount,
          educators: registeredTeachersCount
        },
        {
          id: "return_visit",
          title: "Return Visit",
          category: "Tier 1: Visitor",
          description: "Educators returning for subsequent research sessions",
          events: Math.max(kpiTrackers.return_visit.count, returnVisitorIds.size),
          educators: returnVisitorIds.size
        }
      ]
    };

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
      funnel, // 🏛️ 3-Tier Funnel & 10 KPIs
      
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

/**
 * 🚨 Action: Fetch Unresolved Data Ingestion Conflict Alerts
 */
export async function getIngestionConflictAlertsAction(): Promise<{
  success: boolean;
  alerts: import('@/firebase/admin').IngestionConflictAlert[];
  error: string | null;
}> {
  try {
    const { getIngestionConflictAlerts } = await import('@/firebase/admin');
    const alerts = await getIngestionConflictAlerts();
    return { success: true, alerts, error: null };
  } catch (err: any) {
    return { success: false, alerts: [], error: err?.message || String(err) };
  }
}

/**
 * ⚡ Action: Resolve Data Ingestion Conflict Alert
 */
export async function resolveIngestionConflictAction(
  alertId: string,
  action: 'accept_dom' | 'keep_db'
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { resolveIngestionConflictAlert } = await import('@/firebase/admin');
    const res = await resolveIngestionConflictAlert(alertId, action, 'admin');
    return { success: res.success, error: res.error || null };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export type MemberAccountItem = {
  uid: string;
  email: string;
  teacherId: string;
  name: string;
  curriculum: string;
  city: string;
  tier: string;
  hasLicense: boolean;
  evaluationsAllowance: number;
  evaluationsUsed: number;
  createdAt: string;
  createdAtFormatted: string;
  lastSignInFormatted: string;
};

/**
 * 👥 Action: Get All Registered Members Data
 * Aggregates Auth users with Firestore teachers and users profiles.
 */
export async function getMembersDataAction(): Promise<{ success: boolean; members?: MemberAccountItem[]; error?: string }> {
  try {
    const admin = await import('firebase-admin');
    let authUsers: any[] = [];
    try {
      if (admin.default.apps.length) {
        const listRes = await admin.default.auth().listUsers(1000);
        authUsers = listRes.users;
      }
    } catch (e: any) {
      console.warn("Auth listUsers failed, falling back to Firestore teachers collection:", e.message || e);
    }

    const [teachersDocs, usersDocs] = await Promise.all([
      getCollectionDocs('teachers').catch(() => null),
      getCollectionDocs('users').catch(() => null)
    ]);

    const teachersMap: Record<string, any> = {};
    if (teachersDocs) {
      teachersDocs.forEach((doc: any) => {
        const d = doc.data();
        teachersMap[doc.id] = d;
        if (d.email) teachersMap[d.email.toLowerCase().trim()] = d;
      });
    }

    const usersMap: Record<string, any> = {};
    if (usersDocs) {
      usersDocs.forEach((doc: any) => {
        const d = doc.data();
        usersMap[doc.id] = d;
        if (d.email) usersMap[d.email.toLowerCase().trim()] = d;
      });
    }

    const combinedMembers: MemberAccountItem[] = [];
    const seenUids = new Set<string>();

    authUsers.forEach((u) => {
      seenUids.add(u.uid);
      const emailLower = (u.email || '').toLowerCase().trim();
      const t = teachersMap[u.uid] || teachersMap[emailLower] || {};
      const usr = usersMap[u.uid] || usersMap[emailLower] || {};

      const created = u.metadata.creationTime ? new Date(u.metadata.creationTime).toISOString() : (t.createdAt || '');
      const lastSignIn = u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime) : null;

      combinedMembers.push({
        uid: u.uid,
        email: u.email || 'N/A',
        teacherId: t.teacherId || usr.teacherId || '—',
        name: t.name || u.displayName || (u.email ? u.email.split('@')[0].toUpperCase() : 'N/A'),
        curriculum: (t.curriculum_framework || t.curriculum || 'International').toUpperCase(),
        city: t.current_city || t.city || '—',
        tier: t.tier || usr.role || (u.email?.includes('admin') || u.email?.includes('roger@') ? 'admin' : 'free'),
        hasLicense: t.has_k12_license ?? true,
        evaluationsAllowance: t.evaluations_allowance ?? 20,
        evaluationsUsed: t.evaluations_used ?? 0,
        createdAt: created,
        createdAtFormatted: created ? new Date(created).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC' : 'N/A',
        lastSignInFormatted: lastSignIn ? lastSignIn.toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC' : 'Never'
      });
    });

    if (teachersDocs) {
      teachersDocs.forEach((doc: any) => {
        if (!seenUids.has(doc.id)) {
          const t = doc.data();
          seenUids.add(doc.id);
          const created = t.createdAt || '';
          combinedMembers.push({
            uid: doc.id,
            email: t.email || 'N/A',
            teacherId: t.teacherId || '—',
            name: t.name || (t.email ? t.email.split('@')[0].toUpperCase() : 'N/A'),
            curriculum: (t.curriculum_framework || t.curriculum || 'International').toUpperCase(),
            city: t.current_city || t.city || '—',
            tier: t.tier || 'free',
            hasLicense: t.has_k12_license ?? true,
            evaluationsAllowance: t.evaluations_allowance ?? 20,
            evaluationsUsed: t.evaluations_used ?? 0,
            createdAt: created,
            createdAtFormatted: created ? new Date(created).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC' : 'N/A',
            lastSignInFormatted: '—'
          });
        }
      });
    }

    combinedMembers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return { success: true, members: combinedMembers };
  } catch (err: any) {
    console.error("Failed to load members:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 🛡️ Action: Run Job Audit
 *
 * Report-only, zero writes. Re-implements the checks from
 * src/scripts/audit_live_site_quality.ts as a server action so it can be
 * triggered from a button on the Data Hub page instead of only from a
 * terminal script. Checks every job that would currently show on the
 * public site for: broken apply links, generic-only links (school
 * homepage instead of the job page), stale/wrong school attribution,
 * expired-but-still-live jobs, non-teaching titles, missing school
 * records, duplicate postings, and jobs flagged unverifiable but still live.
 */
export interface JobAuditFlaggedItem {
  docId: string;
  title: string;
  schoolId: string;
  schoolName: string;
  source: string;
  issues: string[];
  detail: string[];
}

export interface JobAuditResult {
  success: boolean;
  error: string | null;
  generatedAt: string;
  totalDocuments: number;
  totalLive: number;
  uniqueLiveCards: number;
  multiEngineGroups: number;
  counts: Record<string, number>;
  flagged: JobAuditFlaggedItem[];
}

const JOB_AUDIT_GENERIC_URLS = new Set([
  "https://careers.nordanglia.com",
  "https://careers.nordangliaeducation.com",
  "https://www.nordangliaeducation.com/careers",
  "https://jobs.inspirededu.com",
  "https://cognitapeople.csod.com",
  "https://www.teachaway.com/teaching-jobs-abroad",
  "https://uwc.org/careers/vacancies",
  "https://internationalschools.wd3.myworkdayjobs.com/en-us/ispcareers",
  "https://careers.globeducate.com/work-with-us/opportunities-worldwide",
  "https://careers.gemseducation.com",
  "https://www.gemseducation.com",
  "https://taaleem.ae",
  "https://www.taaleem.ae",
  "https://www.taaleem.ae/careers",
  "https://careers.taaleem.ae",
  "https://careers.taaleem.ae/en",
]);

function jobAuditNormalizeUrl(u?: string | null): string {
  if (!u) return "";
  return u.toLowerCase().trim().replace(/\/+$/, "");
}

function jobAuditIsGenericUrl(u?: string | null): boolean {
  const norm = jobAuditNormalizeUrl(u);
  if (!norm || norm === "#") return true;
  return JOB_AUDIT_GENERIC_URLS.has(norm) || norm.includes("job-search-results") || norm.includes("keyword=");
}

function jobAuditNormalizeTitle(title: string): string {
  return String(title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function runJobAuditAction(): Promise<JobAuditResult> {
  const empty: JobAuditResult = {
    success: false,
    error: null,
    generatedAt: new Date().toISOString(),
    totalDocuments: 0,
    totalLive: 0,
    uniqueLiveCards: 0,
    multiEngineGroups: 0,
    counts: {},
    flagged: [],
  };

  try {
    const { getAdminDb } = await import("@/firebase/admin");
    const { matchSchoolEntity } = await import("@/lib/crawler/entityMatcher");
    const { isValidJobTitle } = await import("@/lib/crawler/titleSanitizer");
    const { isSupportOrNonTeachingRole } = await import("@/lib/crawler/roleClassifier");

    const db = getAdminDb();
    if (!db) return { ...empty, error: "Admin DB unavailable" };

    const [jobsSnap, schoolsSnap] = await Promise.all([
      db.collection("featured_jobs_cache").get(),
      db.collection("schools").get(),
    ]);

    const allSchools = schoolsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const schoolsById = new Map(allSchools.map((s: any) => [String(s.id).toUpperCase(), s]));

    const todayMs = Date.now();
    const liveJobs: any[] = [];

    // Matches page.tsx's real visibility filter exactly, not just the status
    // guard — otherwise this reports on jobs the public can't actually see.
    jobsSnap.docs.forEach((d: any) => {
      const j = { docId: d.id, ...d.data() };
      const rawStatus = String(j.status || "").toUpperCase();
      if (["EXPIRED", "CLOSED", "REJECTED", "PENDING_REVIEW", "PENDING"].includes(rawStatus)) return;
      const sIdCheck = String(j.schoolId || "").trim();
      if (!sIdCheck || sIdCheck.toUpperCase().startsWith("AGNT")) return;
      if (!isValidJobTitle(j.title || j.jobTitle || "")) return;
      liveJobs.push(j);
    });

    const flagged: JobAuditFlaggedItem[] = [];
    const dupeKey = new Map<string, string[]>();

    for (const j of liveJobs) {
      const issues: string[] = [];
      const detail: string[] = [];
      const schoolId = j.schoolId || "";
      const schoolName = j.schoolName || j.schoolname || "";
      const title = j.title || "";
      const source = j.source || (Array.isArray(j.sources) ? j.sources[0] : "") || "";

      const candidateUrl = j.directUrl || j.applyUrl || j.source_url || j.schoolWebsite;
      const hasAnyUsableUrl = Boolean(j.directUrl) && !jobAuditIsGenericUrl(j.directUrl)
        ? true
        : Boolean(j.applyUrl) && !jobAuditIsGenericUrl(j.applyUrl)
        ? true
        : Boolean(j.source_url) && !jobAuditIsGenericUrl(j.source_url)
        ? true
        : Boolean(j.schoolWebsite) && j.schoolWebsite !== "#";

      if (!hasAnyUsableUrl || !candidateUrl) {
        issues.push("BROKEN_LINK");
        detail.push("No usable link found at all (directUrl, applyUrl, source_url, schoolWebsite all missing/blank/#).");
      } else {
        const specificUrl = (j.directUrl && !jobAuditIsGenericUrl(j.directUrl)) ? j.directUrl
          : (j.applyUrl && !jobAuditIsGenericUrl(j.applyUrl)) ? j.applyUrl
          : (j.source_url && !jobAuditIsGenericUrl(j.source_url)) ? j.source_url
          : null;
        if (!specificUrl) {
          issues.push("GENERIC_LINK");
          detail.push(`Only a generic link is available (e.g. school homepage): ${candidateUrl}`);
        }
      }

      const school = schoolId ? schoolsById.get(schoolId.toUpperCase()) : null;
      if (!school) {
        issues.push("MISSING_SCHOOL");
        detail.push(`schoolId "${schoolId}" does not exist in the schools collection.`);
      } else {
        const fullText = `${title} ${schoolName} ${j.city || ""} ${j.country || ""}`;
        let bestScore = 0;
        let bestSchoolId = "";
        for (const s of allSchools as any[]) {
          const entity = {
            id: s.id,
            name: s.name || s.schoolname,
            schoolname: s.schoolname || s.name,
            city: s.city,
            country: s.country,
            aliases: Array.isArray(s.aliases) ? s.aliases : [],
            legalNames: Array.isArray(s.legalNames) ? s.legalNames : [],
          };
          const res = matchSchoolEntity(entity, { candidateText: fullText, city: j.city });
          if (res.isMatch && res.score > bestScore) {
            bestScore = res.score;
            bestSchoolId = s.id;
          }
        }
        if (bestSchoolId && bestSchoolId.toUpperCase() !== schoolId.toUpperCase()) {
          issues.push("SCHOOL_MISMATCH");
          detail.push(`Stored as ${schoolId} (${schoolName}), but text now best-matches ${bestSchoolId} (score ${bestScore}). Worth a manual look.`);
        }
      }

      if (j.closingDateMillis && j.closingDateMillis < todayMs) {
        issues.push("STALE_BUT_LIVE");
        detail.push(`Closing date (${new Date(j.closingDateMillis).toISOString().slice(0, 10)}) has passed but the job is still marked live.`);
      }

      // isValidJobTitle() is already applied as a visibility filter above
      // (matching page.tsx), so only isSupportOrNonTeachingRole() belongs
      // here — page.tsx does NOT filter by role classifier, so a support/
      // non-teaching title can still be live today. That's the real gap.
      if (isSupportOrNonTeachingRole(title)) {
        issues.push("BAD_TITLE");
        detail.push(`Title "${title}" looks like a non-teaching/support role.`);
      }

      if (j.unverifiableAttribution === true) {
        issues.push("UNVERIFIED_LIVE");
        detail.push("Flagged unverifiableAttribution:true but is still showing as live.");
      }

      // Multi-engine card tracking — page.tsx merges same schoolId+title docs
      // into one visible card by design, so this is informational, not a flag.
      const dk = `${schoolId}::${jobAuditNormalizeTitle(title)}`;
      if (!dupeKey.has(dk)) dupeKey.set(dk, []);
      dupeKey.get(dk)!.push(j.docId);

      if (issues.length > 0) {
        flagged.push({ docId: j.docId, title, schoolId, schoolName, source, issues, detail });
      }
    }

    const uniqueLiveCards = dupeKey.size;
    const multiEngineGroups = Array.from(dupeKey.values()).filter((ids) => ids.length > 1).length;

    const counts: Record<string, number> = {};
    for (const f of flagged) {
      for (const issue of f.issues) {
        counts[issue] = (counts[issue] || 0) + 1;
      }
    }

    flagged.sort((a, b) => b.issues.length - a.issues.length);

    return {
      success: true,
      error: null,
      generatedAt: new Date().toISOString(),
      totalDocuments: jobsSnap.size,
      totalLive: liveJobs.length,
      uniqueLiveCards,
      multiEngineGroups,
      counts,
      flagged,
    };
  } catch (err: any) {
    console.error("❌ Job audit failed:", err?.message || err);
    return { ...empty, error: err?.message || String(err) };
  }
}
