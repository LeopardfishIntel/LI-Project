/**
 * 🛰️ RAW JOB RECORD — CANONICAL ADAPTOR OUTPUT TYPE
 *
 * All source adaptors (TES, Board Hub, School Website, Czech Hub) must return
 * arrays of this type. The orchestrator merges, deduplicates, and routes these
 * to the write-time ingestion pipeline.
 */

export interface RawJobRecord {
  /** Raw job title exactly as found on the source platform */
  rawTitle: string;

  /** Direct deep-link to the job advert page; null if not discoverable */
  applyUrl: string | null;

  /** Human-readable source label, e.g. 'TES', 'Schrole', 'School Web', 'Jobs.cz' */
  source: string;

  /** ISO date string or formatted date of posting; null if unknown */
  datePosted: string | null;

  /** ISO date string or formatted closing/deadline date; null if rolling/unknown */
  closingDate: string | null;

  /** Firestore school document ID */
  schoolId: string;

  /** Display name of the school */
  schoolName: string;

  /** City where the school is located */
  city?: string;

  /** Country where the school is located */
  country?: string;

  /** Status lifecycle: 'approved' | 'pending_review' | 'expired' | 'rejected' */
  status?: 'pending_review' | 'approved' | 'expired' | 'rejected';
}

/**
 * Input shape passed into every source adaptor.
 */
export interface AdaptorInput {
  schoolId: string;
  schoolName: string;
  city?: string;
  country?: string;

  /** School's official website URL (used by school-website adaptor) */
  schoolWebsite?: string;

  /** Careers landing page URL (e.g. 'https://www.stgeorgesschool.com/explore-our-opportunities') */
  careersPageUrl?: string;

  /** School group portal domain (e.g. 'nordangliaeducation.com') */
  groupDomain?: string;

  /** Custom whitelisted vacancy domains */
  customVacancyDomains?: string[];

  /** Enabled search sources */
  enabledSources?: string[];

  /** TES employer slug from the schools collection (e.g. 'vienna-international-school-1065') */
  tesEmployerSlug?: string;

  /** TES numeric organization ID */
  tesOrganizationId?: string;

  /** Schrole account identifier */
  schroleAccountId?: string;

  /** Alternative names/abbreviations for the school */
  aliases?: string[];

  /** Schools in the same city to guard against sibling-school data leaks */
  siblingSchools?: string[];

  /** Whether the school is secondary-only (used for phase validation) */
  isSecondaryOnly?: boolean;

  /** Whether the school is primary-only */
  isPrimaryOnly?: boolean;
}
