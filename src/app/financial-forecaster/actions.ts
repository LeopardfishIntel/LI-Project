'use server';

export interface EvaluateOfferInput {
    schoolName: string;
    location: string;
    country: string;
    monthlySavings: number;
    currency: string;
    familyStatus: string;
}

export interface EvaluateOfferOutput {
    strengths: string;
    weaknesses: string;
    opportunities: string;
    threats: string;
    overallScore: number;
}

/**
 * Generates a tactical SWOT analysis of a potential teaching contract offer.
 * @param input - The contract offer parameters (school, location, savings, etc.)
 * @returns An object containing the generated SWOT data or an error message.
 */
export async function getOfferTacticalVerdict(input: EvaluateOfferInput): Promise<{ data: EvaluateOfferOutput | null; error: string | null; }> {
    try {
        // 🛡️ Data validation check before sending to AI
        if (!input.schoolName || !input.location) {
            throw new Error("Incomplete intelligence: School and Location data required.");
        }

        // 🛰️ DYNAMIC IMPORT TO BYPASS CLIENT BUNDLER CLASH DURING SSR
        const { evaluateOffer } = await import('@/ai/flows/evaluate-offer-flow');

        const data = await evaluateOffer(input);
        return { data, error: null };
    } catch (e: any) {
        // 🕵️ Log the full trace for the developer, but return a clean string to the UI
        console.error("AI Verdict Generation Failed:", e);
        
        return { 
            data: null, 
            error: typeof e === 'string' ? e : e.message || "Uplink failure during verdict generation. Intelligence pipeline is offline." 
        };
    }
}

/**
 * Dynamic Server Action to rephrase the cached briefing into a strict, candid UK English "staffroom chat" style.
 */
export async function rewordDossierBriefing(input: {
    briefing: string;
    schoolName: string;
    familyStatus: string;
}): Promise<{ data: string | null; error: string | null; }> {
    try {
        if (!input.briefing) {
            throw new Error("Source briefing text is required for translation.");
        }

        // 🛰️ DYNAMIC IMPORT TO BYPASS CLIENT BUNDLER CLASH DURING SSR
        const { getAI } = await import('@/ai/genkit');

        const ai = getAI();
        const response = await ai.generate({
            prompt: `You are an elite, highly experienced British international school teacher and recruitment coordinator.
Your task is to reword the following detailed school intelligence dossier so that it retains 100% of its factual information, numbers, curriculum details, housing notes, and saving/expense insights, but sounds completely fresh, unique, and written in a candid, authentic staffroom coffee-chat vibe with strictly UK English teacher-talk phrasing.

Factual Source Dossier:
${input.briefing}

Additional Context:
- Target School: ${input.schoolName}
- Teacher Profile Status: ${input.familyStatus}

Instructions:
1. **Style**: Strictly UK English. Use authentic British staffroom terms where natural (e.g., SLT, PPA time, TLR, prep time, supply cover, key stages, Head of Dept, staffroom vibe, cost of living, standard of living, school day).
2. **Goal**: Say the exact same things, but completely reworded. If the source briefing is ~600 words, make this reworded version around ~500-600 words as well, formatted beautifully in 3 to 4 strong, detailed paragraphs separated by double newlines (\\n\\n).
3. **No Direct Copying**: Do not copy exact sentences or structural headers word-for-word. It must read like a completely distinct colleague-to-colleague advisory sharing the exact same ground-truth facts.
4. **Tone**: Warm, candid, authoritative, and supportive. Focus on what it's *actually* like on the ground for a teacher of this profile.

Provide only the reworded text. No intro or outro.`,
        });

        return { data: response.text || null, error: null };
    } catch (e: any) {
        console.error("AI Briefing Rewording Failed:", e);
        return { data: null, error: e.message || "Uplink failure during rewording." };
    }
}

const stabilityMemoryCache = new Map<string, any>();

/**
 * Server action to calculate and cache institutional stability reports.
 */
export async function getSchoolStabilityReport(input: {
    schoolId: string;
    schoolName: string;
    estimatedStaffBase: number;
    curriculum?: string;
    city?: string;
    country?: string;
    inspections?: string;
    forceRefresh?: boolean;
}): Promise<{ data: any | null; error: string | null; }> {
    try {
        if (!input.schoolId) {
            throw new Error("Missing school identifier.");
        }

        // 1. If not forcing a refresh, check in-memory server cache first
        if (!input.forceRefresh && stabilityMemoryCache.has(input.schoolId)) {
            console.log(`🛸 [STABILITY ENGINE] Returning in-memory cached stability report for ${input.schoolName}`);
            return { data: stabilityMemoryCache.get(input.schoolId), error: null };
        }

        const { doc, getDoc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('@/firebase/server');

        const schoolRef = doc(db, 'schools', input.schoolId);
        let schoolSnap: any = null;
        let scrapedJobsCount: number | null = null;
        let scrapedJobsList: string[] = [];
        let lastScrapedAt: string | null = null;

        // 2. Read from Firestore
        try {
            schoolSnap = await getDoc(schoolRef);
        } catch (readErr) {
            console.warn(`🛸 [STABILITY ENGINE] Firestore read permission/connection limit:`, readErr);
        }

        let needsNewSearch = false;
        if (schoolSnap && schoolSnap.exists()) {
            const data = schoolSnap.data();
            scrapedJobsCount = data.scrapedJobsCount !== undefined ? data.scrapedJobsCount : null;
            scrapedJobsList = Array.isArray(data.scrapedJobsList) ? data.scrapedJobsList : [];
            // Safely parse Firestore Timestamp or Date or string to an ISO string
            if (data.lastScrapedAt) {
                if (typeof data.lastScrapedAt.toDate === 'function') {
                    lastScrapedAt = data.lastScrapedAt.toDate().toISOString();
                } else if (data.lastScrapedAt.seconds) {
                    lastScrapedAt = new Date(data.lastScrapedAt.seconds * 1000).toISOString();
                } else if (data.lastScrapedAt instanceof Date) {
                    lastScrapedAt = data.lastScrapedAt.toISOString();
                } else {
                    lastScrapedAt = String(data.lastScrapedAt);
                }
            } else {
                lastScrapedAt = null;
            }

            // Determine if a new search is required:
            // - No search has ever run, OR
            // - Force refresh is requested, OR
            // - 14 days (two weeks) have passed since the last search
            if (input.forceRefresh || lastScrapedAt === null || scrapedJobsCount === null) {
                needsNewSearch = true;
            } else {
                const daysElapsed = (Date.now() - new Date(lastScrapedAt).getTime()) / (1000 * 60 * 60 * 24);
                if (daysElapsed >= 14) {
                    needsNewSearch = true;
                }
            }

            // If a new search is required, BUT we have cached stability data and it is NOT a manual force refresh:
            // return the stale cache immediately and execute the revalidation sweep in the background!
            if (needsNewSearch && data.cachedStability && !input.forceRefresh) {
                console.log(`🛸 [STABILITY ENGINE] [SWR] Returning STALE Firestore cached stability report instantly for ${input.schoolName}. Launching background revalidation...`);
                const cachedReport = {
                    ...data.cachedStability,
                    scrapedJobsList,
                    lastScrapedAt
                };
                
                // Fire background scrape task
                (async () => {
                    try {
                        const { searchVacancies } = await import('@/ai/flows/search-vacancies-flow');
                        const searchRes = await searchVacancies({
                            schoolName: input.schoolName,
                            city: input.city,
                            country: input.country
                        });
                        const freshJobsCount = searchRes.scrapedJobsCount;
                        const freshJobsList = searchRes.scrapedJobsList;
                        const freshLastScrapedAt = new Date().toISOString();

                        const { calculateStabilityFlow } = await import('@/ai/flows/calculate-stability-flow');
                        const freshReport = await calculateStabilityFlow({
                            ...input,
                            scrapedJobsCount: freshJobsCount
                        });

                        freshReport.scrapedJobsList = freshJobsList;
                        freshReport.lastScrapedAt = freshLastScrapedAt;

                        await updateDoc(schoolRef, {
                            scrapedJobsCount: freshJobsCount,
                            scrapedJobsList: freshJobsList,
                            lastScrapedAt: freshLastScrapedAt,
                            cachedStability: freshReport
                        });
                        stabilityMemoryCache.set(input.schoolId, freshReport);
                        console.log(`🛸 [STABILITY ENGINE] [BACKGROUND] Background SWR revalidation completed successfully for ${input.schoolName}!`);
                    } catch (bgErr) {
                        console.error(`🛸 [STABILITY ENGINE] [BACKGROUND] Background SWR revalidation failed:`, bgErr);
                    }
                })();

                stabilityMemoryCache.set(input.schoolId, cachedReport);
                return { data: cachedReport, error: null };
            }

            // If we don't need a new search AND we have cached stability report in Firestore:
            if (!needsNewSearch && data.cachedStability) {
                console.log(`🛸 [STABILITY ENGINE] Returning Firestore cached stability report for ${input.schoolName}`);
                const cachedReport = {
                    ...data.cachedStability,
                    scrapedJobsList,
                    lastScrapedAt
                };
                stabilityMemoryCache.set(input.schoolId, cachedReport);
                return { data: cachedReport, error: null };
            }
        } else {
            needsNewSearch = true;
        }

        // 3. Trigger Active AI Search if required!
        if (needsNewSearch) {
            console.log(`🛸 [STABILITY ENGINE] Triggering active Google Search vacancies flow for ${input.schoolName}...`);
            const { searchVacancies } = await import('@/ai/flows/search-vacancies-flow');
            try {
                const searchRes = await searchVacancies({
                    schoolName: input.schoolName,
                    city: input.city,
                    country: input.country
                });
                scrapedJobsCount = searchRes.scrapedJobsCount;
                scrapedJobsList = searchRes.scrapedJobsList;
                lastScrapedAt = new Date().toISOString();

                // Save searched vacancies data back to school Firestore document immediately (reducing future requests!)
                if (schoolSnap && schoolSnap.exists()) {
                    await updateDoc(schoolRef, {
                        scrapedJobsCount,
                        scrapedJobsList,
                        lastScrapedAt,
                        cachedStability: null // invalidate cache to compute stability with new numbers
                    });
                    console.log(`🛸 [STABILITY ENGINE] Saved active search results to Firestore for ${input.schoolName}`);
                }
            } catch (searchErr) {
                console.error(`🛸 [STABILITY ENGINE] Active AI search failed; falling back to null/ledger:`, searchErr);
            }
        }

        // 4. Compute fresh stability report using the AI Genkit Flow
        console.log(`🛸 [STABILITY ENGINE] Calculating fresh stability report for ${input.schoolName}...`);
        const { calculateStabilityFlow } = await import('@/ai/flows/calculate-stability-flow');
        const report = await calculateStabilityFlow({
            ...input,
            scrapedJobsCount
        });

        // Attach scraped details directly to stability report before caching
        report.scrapedJobsList = scrapedJobsList;
        report.lastScrapedAt = lastScrapedAt || undefined;

        // 5. Update memory cache immediately
        stabilityMemoryCache.set(input.schoolId, report);

        // 6. Attempt to update Firestore, catching any permission failures gracefully
        try {
            await updateDoc(schoolRef, {
                cachedStability: report
            });
            console.log(`🛸 [STABILITY ENGINE] Successfully cached stability report in Firestore for ${input.schoolName}`);
        } catch (writeErr: any) {
            console.warn(`🛸 [STABILITY ENGINE] Firestore write permission restricted; fallback to in-memory caching.`, writeErr.message || writeErr);
        }

        return { data: report, error: null };
    } catch (e: any) {
        console.error("AI Stability Calculation Failed:", e);
        return { data: null, error: e.message || "Uplink failure during stability calculation." };
    }
}