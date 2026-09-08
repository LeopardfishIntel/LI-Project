/**
 * 🛰️ SEARCH ASSOCIATES LEADERSHIP VACANCIES ADAPTOR
 *
 * Scrapes open leadership positions directly from:
 * https://www.searchassociates.com/leadership-vacancies/
 *
 * Extracts:
 *  - Head of School positions (#hos tab)
 *  - Other Leadership positions (#other tab)
 *  - Explicitly IGNORES Filled Positions (#filled tab)
 *  - Explicitly IGNORES closed / expired positions
 */

import * as cheerio from 'cheerio';
import type { RawJobRecord } from './raw-job.types';
import { sanitizeUrl } from '../urlResolver';

export const SEARCH_ASSOCIATES_LEADERSHIP_URL = 'https://www.searchassociates.com/leadership-vacancies/';

export interface SearchAssociatesLeadershipJob {
  id: string;
  title: string;
  schoolName: string;
  country: string;
  category: 'Head of School' | 'Other Leadership';
  postedDate: string;
  deadline: string;
  isClosed: boolean;
  url: string;
  source: 'Search Associates';
}

/**
 * Parses raw HTML payload from https://www.searchassociates.com/leadership-vacancies/
 * and returns verified active open leadership positions.
 */
export function extractSearchAssociatesJobs(html: string): SearchAssociatesLeadershipJob[] {
  const $ = cheerio.load(html);

  const openPanes = [
    { selector: '#hos', category: 'Head of School' as const },
    { selector: '#other', category: 'Other Leadership' as const }
  ];

  const jobs: SearchAssociatesLeadershipJob[] = [];

  openPanes.forEach(({ selector, category }) => {
    $(selector).find('.row.islink').each((_, row) => {
      const linkEl = $(row).find('a[href*="/leadership-vacancies/"]').first();
      if (!linkEl.length) return;

      const title = linkEl.text().trim();
      const relativeHref = linkEl.attr('href') || '';
      if (!relativeHref) return;

      const fullUrl = relativeHref.startsWith('http')
        ? relativeHref
        : `https://www.searchassociates.com${relativeHref.startsWith('/') ? '' : '/'}${relativeHref}`;

      const rowText = $(row).text().replace(/\s+/g, ' ').trim();
      const isClosed = rowText.includes('No longer accepting applications') || rowText.includes('Closed');

      // Skip closed positions
      if (isClosed) return;

      // Extract school name: try onclick attribute first, or text parsing
      let schoolName = '';
      const onClick = linkEl.attr('onclick') || '';
      const onClickMatch = onClick.match(/trackOutboundLink\([^,]+,\s*[^,]+,\s*'([^']+)',\s*'([^']+)'\)/);
      if (onClickMatch && onClickMatch[1]) {
        schoolName = onClickMatch[1].trim();
      }

      if (!schoolName) {
        const col1Div = $(row).find('div.col-sm-5, div.col-xs-12').first();
        const clone = col1Div.clone();
        clone.find('label, img, a, em').remove();
        schoolName = clone.text().trim();
      }

      // Extract Country
      const countryCol = $(row).find('div.col-sm-3').first();
      const countryClone = countryCol.clone();
      countryClone.find('label, img').remove();
      const country = countryClone.text().trim();

      // Extract Posted Date & Deadline
      const cols = $(row).find('div.col-sm-2');
      const postedCol = cols.eq(0).clone();
      postedCol.find('label').remove();
      const postedDate = postedCol.text().trim();

      const deadlineCol = cols.eq(1).clone();
      deadlineCol.find('label').remove();
      const deadline = deadlineCol.text().trim();

      const slug = relativeHref.split('/').filter(Boolean).pop() || Math.random().toString(36).substring(7);

      jobs.push({
        id: `sa_lead_${slug}`,
        title,
        schoolName,
        country,
        category,
        postedDate,
        deadline,
        isClosed: false,
        url: sanitizeUrl(fullUrl) || fullUrl,
        source: 'Search Associates'
      });
    });
  });

  return jobs;
}

/**
 * Converts extracted Search Associates jobs to standard RawJobRecord format
 */
export function searchAssociatesToRawJobRecords(
  saJobs: SearchAssociatesLeadershipJob[],
  schoolIdMap?: Record<string, string>
): RawJobRecord[] {
  return saJobs.map(job => ({
    rawTitle: `${job.title} - ${job.schoolName} (${job.country})`,
    source: 'Search Associates',
    applyUrl: job.url,
    schoolId: schoolIdMap?.[job.schoolName.toLowerCase()] || 'SEARCH_ASSOCIATES_HUB',
    schoolName: job.schoolName,
    city: job.country,
    country: job.country,
    closingDate: job.deadline !== 'Open' ? job.deadline : null,
    datePosted: job.postedDate
  }));
}
