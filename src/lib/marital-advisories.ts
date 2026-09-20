import { canonicalCountry } from './calculations';

export interface CoupleCountryAdvisory {
  country: string;
  region: 'Middle East' | 'East Asia' | 'Southeast Asia' | 'Europe' | 'Americas' | 'Africa' | 'Global';
  marriageCertMandatory: boolean; // Required for spousal visa sponsorship or cohabitation
  cohabitationStatus: 'legal' | 'decriminalized_no_visa' | 'illegal_strict' | 'recognized_with_visas';
  sameSexRecognition: 'recognized' | 'unrecognized_safe' | 'unrecognized_caution' | 'criminalized_strict';
  femaleSponsoringMale: 'standard' | 'salary_threshold' | 'restricted_difficult' | 'prohibited';
  trailingSpouseWork: 'full_rights' | 'loc_permit_required' | 'separate_work_visa_only' | 'prohibited_on_dependent_visa';
  badges: string[];
  guidance: {
    unmarried: string;
    sameSex: string;
    femaleSponsor: string;
    trailingSpouse: string;
    dualTeacher: string;
  };
}

export const MARITAL_ADVISORIES: Record<string, CoupleCountryAdvisory> = {
  uae: {
    country: 'United Arab Emirates',
    region: 'Middle East',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'salary_threshold',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['Marriage Cert for Spousal Visa', 'Cohabitation Legalized (2022)', 'Independent Visas for Unmarried'],
    guidance: {
      unmarried: 'Cohabitation was decriminalized in 2022, allowing unmarried couples to legally share private accommodation. However, unmarried partners cannot sponsor each other for residency; both partners must secure independent employment and work visas.',
      sameSex: 'Same-sex marriages and civil partnerships from abroad are not recognized for dependent visa issuance. Same-sex teacher couples must apply as two independent single candidates on separate work visas. Discretion in public spaces and social media is strongly advised.',
      femaleSponsor: 'Female expatriate teachers can sponsor their non-working male husbands and children, provided they meet the official minimum monthly salary threshold (typically AED 3,000–4,000 + accommodation or AED 10,000 gross).',
      trailingSpouse: 'A spouse holding a dependent visa cannot work automatically. They must secure an official freelance permit or transition to their own employer-sponsored work permit prior to commencing any local or remote employment.',
      dualTeacher: 'Schools in the UAE frequently cap housing for dual-teacher couples by offering one shared 2–3 bedroom family apartment or a combined married housing allowance (typically 1.25× to 1.5× the single rate) rather than two full single cash allowances.'
    }
  },
  'saudi arabia': {
    country: 'Saudi Arabia',
    region: 'Middle East',
    marriageCertMandatory: true,
    cohabitationStatus: 'illegal_strict',
    sameSexRecognition: 'criminalized_strict',
    femaleSponsoringMale: 'restricted_difficult',
    trailingSpouseWork: 'prohibited_on_dependent_visa',
    badges: ['Attested Marriage Cert Mandatory', 'Strict Cohabitation Laws', 'Independent Visas Required'],
    guidance: {
      unmarried: 'Cohabitation outside of legal marriage remains strictly unlawful for expatriate residents in private residential housing. Unmarried partners must apply as independent single hires with separate contracts and separate housing provided by the school.',
      sameSex: 'Same-sex sexual activity is criminalized under local law, and foreign same-sex marriages are not recognized. Couples must apply as two separate, single educators, and absolute privacy and discretion regarding personal status and social media is mandatory.',
      femaleSponsor: 'Historically restricted; while recent labor reforms allow women in select professions to sponsor dependent family members, school HR teams often encounter bureaucratic delays sponsoring a non-working male husband. Confirm sponsorship feasibility in writing.',
      trailingSpouse: 'A trailing spouse on a dependent Iqama is strictly prohibited from working, tutoring, or freelancing locally. Working without an independent Iqama work transfer incurs severe penalties.',
      dualTeacher: 'Dual-teaching couples are highly valued by Saudi international schools. Contracts typically consolidate benefits into one large compound villa plus flights and annual luggage allowances for both teachers.'
    }
  },
  qatar: {
    country: 'Qatar',
    region: 'Middle East',
    marriageCertMandatory: true,
    cohabitationStatus: 'illegal_strict',
    sameSexRecognition: 'criminalized_strict',
    femaleSponsoringMale: 'restricted_difficult',
    trailingSpouseWork: 'prohibited_on_dependent_visa',
    badges: ['Attested Marriage Cert Required', 'Spousal Work Prohibited on Dependent Visa'],
    guidance: {
      unmarried: 'Cohabitation of unmarried couples is legally restricted. An attested and legalized marriage certificate is mandatory to obtain a spousal residence permit or share school-provided family accommodation.',
      sameSex: 'Same-sex marriages are not legally recognized and local laws penalize same-sex relations. Teachers must apply as independent single educators on individual visas, maintaining strict personal discretion.',
      femaleSponsor: 'A female teacher seeking to sponsor a non-working husband faces government review and higher salary/profession criteria compared to male sponsors. The school PRO (Public Relations Officer) should pre-approve this.',
      trailingSpouse: 'Spouses on dependent residence permits cannot undertake local employment without changing their visa status to an employer-sponsored work visa.',
      dualTeacher: 'Schools usually offer one furnished family apartment or a joint married housing allowance rather than dual single housing allocations.'
    }
  },
  kuwait: {
    country: 'Kuwait',
    region: 'Middle East',
    marriageCertMandatory: true,
    cohabitationStatus: 'illegal_strict',
    sameSexRecognition: 'criminalized_strict',
    femaleSponsoringMale: 'prohibited',
    trailingSpouseWork: 'prohibited_on_dependent_visa',
    badges: ['Marriage Cert Mandatory', 'Female Cannot Sponsor Husband', 'Separate Work Permits'],
    guidance: {
      unmarried: 'Strict marriage certificate requirements apply for tenancy and spousal residency. Unmarried couples must hold two distinct single teaching contracts and occupy separate accommodations.',
      sameSex: 'Same-sex marriages are not recognized under Kuwaiti law. Same-sex couples must navigate recruitment as two independent single candidates.',
      femaleSponsor: 'Under Kuwaiti residency laws, female expat teachers generally cannot sponsor an adult non-working husband for a dependent residency visa. The husband must obtain his own independent work visa.',
      trailingSpouse: 'Dependent visa holders cannot engage in paid work or private tutoring.',
      dualTeacher: 'Dual hires receive standard single base salaries with shared compound accommodation or single married housing stipend.'
    }
  },
  oman: {
    country: 'Oman',
    region: 'Middle East',
    marriageCertMandatory: true,
    cohabitationStatus: 'illegal_strict',
    sameSexRecognition: 'criminalized_strict',
    femaleSponsoringMale: 'restricted_difficult',
    trailingSpouseWork: 'prohibited_on_dependent_visa',
    badges: ['Marriage Cert Mandatory', 'School Housing Strict', 'Separate Work Visas for Unmarried'],
    guidance: {
      unmarried: 'An attested marriage certificate is required for spousal visa sponsorship and school-provided family housing. While private rental enforcement varies across landlords, unmarried partners cannot sponsor one another and must hold separate employment contracts and work visas.',
      sameSex: 'Same-sex partnerships are not recognized for visa or legal purposes under Omani law. Candidate pairs must apply independently as single educators and maintain personal discretion.',
      femaleSponsor: 'Note: While teaching salaries easily satisfy ROP income rules, female sponsorship of a male spouse requires additional school HR administrative clearance with the Royal Oman Police.',
      trailingSpouse: 'Trailing spouses on family joining visas are strictly not authorized to work locally. Any employment requires securing a separate job offer and transferring to an independent employer-sponsored work visa.',
      dualTeacher: 'Dual-teacher hires benefit from combining single base salaries with shared school-provided housing or joint married housing stipends, plus dual annual flight allowances.'
    }
  },
  china: {
    country: 'China',
    region: 'East Asia',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'prohibited_on_dependent_visa',
    badges: ['Apostilled Marriage Cert for S1/S2 Visa', 'No Trailing Work Rights', 'Independent Z-Visas for Unmarried'],
    guidance: {
      unmarried: 'Unmarried cohabitation is socially normal in modern Chinese cities, but the Public Security Bureau (PSB) will not issue a dependent S1/S2 spousal visa without an authenticated marriage certificate. Both partners must qualify for and hold individual Z-work visas.',
      sameSex: 'China does not recognize foreign same-sex marriages or civil unions for dependent visa sponsorship. However, LGBTQ+ educators face no criminalization and live safely in tier-1/tier-2 cities; both must secure individual Z-visas.',
      femaleSponsor: 'Fully equal: A legally married female teacher holding a valid Foreigner Work Permit and Z-visa can sponsor her male husband on a dependent spousal residence permit without gender-based salary barriers.',
      trailingSpouse: 'Crucial: S1/S2 dependent residence permits strictly prohibit any local employment, in-person tutoring, or paid business activity in mainland China. Remote working for foreign companies also carries strict tax and banking constraints.',
      dualTeacher: 'Schools frequently offer a choice: two individual single housing stipends (can be pooled to rent a luxury apartment) OR one 2-to-3 bedroom school-provided apartment.'
    }
  },
  singapore: {
    country: 'Singapore',
    region: 'Southeast Asia',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'loc_permit_required',
    badges: ['Dependant’s Pass (DP) Requires Legal Marriage', 'Letter of Consent / Work Pass Required for Spouse'],
    guidance: {
      unmarried: 'Cohabitation is fully legal. However, the Ministry of Manpower (MOM) only issues Dependant’s Passes (DP) to legally married spouses of Employment Pass (EP) holders earning at least S$6,000/month.',
      sameSex: 'Foreign same-sex marriages are not recognized for MOM Dependant’s Passes. Same-sex partners must independently secure their own Employment Pass or S-Pass through separate employment.',
      femaleSponsor: 'A female teacher holding an Employment Pass meeting the salary threshold can sponsor her legally married husband on a Dependant’s Pass with identical ease.',
      trailingSpouse: 'DP holders cannot work automatically. To work locally, a trailing spouse must secure a direct job offer and obtain their own Work Pass (or qualifying Letter of Consent if applicable to business owners).',
      dualTeacher: 'Singapore international schools usually offer monthly housing stipends rather than provided flats. Dual-teacher couples receive their own distinct salary packages, allowing generous combined rental budgets.'
    }
  },
  japan: {
    country: 'Japan',
    region: 'East Asia',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'loc_permit_required',
    badges: ['Dependent Visa Requires Legal Marriage', 'Part-time Work Allowed with Permit (28h/wk)'],
    guidance: {
      unmarried: 'Unmarried cohabitation is completely legal and accepted. However, immigration does not grant Dependent visas to unmarried partners.',
      sameSex: 'While select Japanese municipalities issue local partnership certificates, National Immigration does not recognize foreign same-sex marriages for standard Dependent Visas. Independent visas recommended.',
      femaleSponsor: 'Female educators holding Instructor or Specialist in Humanities visas can sponsor their legally married husband as a dependent.',
      trailingSpouse: 'A trailing spouse on a Dependent visa can apply for "Permission to Engage in Activity other than that Permitted" (Shikakugai Katsudo Kyoka), granting the legal right to work part-time up to 28 hours per week.',
      dualTeacher: 'Dual-teacher pairs are common; schools provide either two separate housing allowances or a larger family apartment subsidised under corporate rental (shataku).'
    }
  },
  'south korea': {
    country: 'South Korea',
    region: 'East Asia',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'prohibited_on_dependent_visa',
    badges: ['F-3 Dependent Visa Requires Marriage Cert', 'No Work Rights on F-3'],
    guidance: {
      unmarried: 'Cohabitation is common in major cities, but an F-3 Dependent Visa requires an apostilled marriage certificate. Unmarried partners must each obtain an E-7 / E-2 teaching visa.',
      sameSex: 'Same-sex marriages are not recognized for F-3 Dependent Visas. Both educators must secure independent teaching contracts with separate visa sponsorships.',
      femaleSponsor: 'Legally married female teachers can sponsor their husbands on an F-3 spousal visa without special gender-based restrictions.',
      trailingSpouse: 'F-3 visa holders cannot work in South Korea without switching to an independent employment visa (e.g. E-2/E-7). Unofficial tutoring is strictly monitored.',
      dualTeacher: 'Dual hires receive two full base salaries and either one larger official school flat or a single combined housing stipend.'
    }
  },
  thailand: {
    country: 'Thailand',
    region: 'Southeast Asia',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['Marriage Equality Recognized (2024/2025)', 'Non-O Dependent Visa Available'],
    guidance: {
      unmarried: 'Cohabitation is completely unrestricted and socially embraced. To sponsor a non-teaching partner on a Non-O spousal visa, a legal marriage certificate is needed; otherwise, the partner must seek a Non-B, Education, or DTV digital nomad visa.',
      sameSex: 'Thailand legalized Marriage Equality in late 2024 (taking full effect in 2025). Foreign same-sex married couples enjoy legal spousal recognition and Non-O dependent visa eligibility.',
      femaleSponsor: 'Female educators can sponsor their foreign husbands on a Non-O spousal visa with standard paperwork from the school.',
      trailingSpouse: 'A Non-O visa holder cannot work locally without obtaining an official Thai Work Permit tied to a licensed Thai employer. Digital nomad / remote work is legal under the new Destination Thailand Visa (DTV).',
      dualTeacher: 'Dual-teacher hires receive individual salaries and either two housing allowances or a large family housing stipend.'
    }
  },
  spain: {
    country: 'Spain',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Civil Partnerships (Pareja de Hecho) Recognized', 'Same-Sex Marriage Fully Recognized', 'Spousal Work Rights Included'],
    guidance: {
      unmarried: 'Spain recognizes registered de facto unions (Pareja de Hecho) for residency sponsorship in many autonomous communities, alongside traditional marriage certificates.',
      sameSex: 'Full legal, marriage, and visa equality under Spanish law. Same-sex spouses enjoy identical family reunification and residency rights.',
      femaleSponsor: 'Equal rights across all genders. Either spouse can sponsor family reunification once legal requirements are satisfied.',
      trailingSpouse: 'Family members holding a residence visa via family reunification generally have the right to live and work in Spain without requiring a separate work authorization.',
      dualTeacher: 'Dual-teacher pairs receive two distinct contracts governed by the Spanish Convenio Colectivo labor framework with standard taxation.'
    }
  },
  'united kingdom': {
    country: 'United Kingdom',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Unmarried Partners (2yr Cohabitation) Recognized', 'Full Spousal Work Rights'],
    guidance: {
      unmarried: 'The UK Skilled Worker visa allows dependent sponsorship for unmarried partners who can prove cohabitation in a relationship akin to marriage for at least 2 years.',
      sameSex: 'Full legal equality. Same-sex marriages and civil partnerships enjoy identical visa sponsorship rights.',
      femaleSponsor: 'Completely equal sponsorship rights across all genders.',
      trailingSpouse: 'A dependent spouse or partner of a Skilled Worker visa holder has unrestricted rights to work in the UK (except as a professional sportsperson/coach).',
      dualTeacher: 'Both teachers receive independent employment contracts, pension contributions (TPS), and pay scales.'
    }
  },
  germany: {
    country: 'Germany',
    region: 'Europe',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Full Spousal Work Rights', 'Same-Sex Marriage Recognized', 'Dependent Visa Requires Marriage'],
    guidance: {
      unmarried: 'Cohabitation is completely legal, but German family reunification (Familiennachzug) visas require a legal marriage certificate.',
      sameSex: 'Germany fully recognizes same-sex marriages with identical spousal visa sponsorship and tax advantages (Ehegattensplitting).',
      femaleSponsor: 'Equal rights across all genders with standard family reunification rules.',
      trailingSpouse: 'Spouses entering on family reunification visas obtain automatic authorization to pursue employment and freelance work in Germany.',
      dualTeacher: 'Dual-teaching couples receive two independent public or private school contracts.'
    }
  },
  belgium: {
    country: 'Belgium',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Strictly Gender-Neutral Sponsorship', 'Full Spousal Work Rights', 'Legal Cohabitation Recognized'],
    guidance: {
      unmarried: 'Belgium recognizes registered legal cohabitation (Wettelijke Samenwoning / Cohabitation Légale) and proven durable relationships for family reunification visas, alongside legal marriage certificates.',
      sameSex: 'Full legal equality under Belgian law. Same-sex married couples and registered partners enjoy identical family reunification and residency rights.',
      femaleSponsor: 'Completely equal and gender-neutral: Belgian and EU law applies identical criteria across all genders. A female teacher faces no additional administrative hurdles, higher salary thresholds, or special clearances when sponsoring a male spouse.',
      trailingSpouse: 'Full work rights: Under Belgian Single Permit and family reunification regulations, a trailing spouse holding a dependent residence card (A-Card) is legally authorized to look for and accept local employment without a separate work permit.',
      dualTeacher: 'Dual-teacher couples receive independent Belgian employment contracts, comprehensive national health insurance, and individual 13.92-month salary structures.'
    }
  },
  austria: {
    country: 'Austria',
    region: 'Europe',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Red-White-Red Card Plus', 'Full Spousal Work Rights', 'Gender-Neutral Sponsorship'],
    guidance: {
      unmarried: 'Cohabitation is legal. However, Austrian family reunification (Familienzusammenführung) visas require a legal marriage certificate or registered partnership.',
      sameSex: 'Austria fully recognizes same-sex marriage with identical spousal visa sponsorship and family rights.',
      femaleSponsor: 'Strictly gender-neutral: Female educators can sponsor their male spouses under standard national income and health insurance thresholds.',
      trailingSpouse: 'A trailing spouse receiving a Red-White-Red Card Plus (Rot-Weiß-Rot – Karte Plus) receives unrestricted access to the Austrian labor market.',
      dualTeacher: 'Both educators receive independent contracts governed by Austrian labor law with 14 monthly salary installments per year.'
    }
  },
  france: {
    country: 'France',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['PACS Civil Unions Recognized', 'Full Spousal Work Rights', 'Passeport Talent Accompanying Spouse'],
    guidance: {
      unmarried: 'France recognizes PACS (Pacte Civil de Solidarité) civil partnerships and registered cohabitation for long-stay visas and residency.',
      sameSex: 'Same-sex marriages and civil unions enjoy identical legal and immigration standing.',
      femaleSponsor: 'Complete gender parity under French immigration code (CESEDA).',
      trailingSpouse: 'Spouses holding a "Passeport Talent (Famille)" or "Vie Privée et Familiale" residence permit have unrestricted rights to work in France.',
      dualTeacher: 'Teaching couples receive independent French employment contracts with full access to the Sécurité Sociale national healthcare system.'
    }
  },
  switzerland: {
    country: 'Switzerland',
    region: 'Europe',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Cantonal B-Permit Work Rights', 'Same-Sex Marriage Recognized', 'Gender-Neutral Sponsorship'],
    guidance: {
      unmarried: 'Cohabitation is standard. Swiss family regroupment (Familiennachzug) visas for non-EU/EFTA citizens require a recognized marriage certificate or registered partnership.',
      sameSex: 'Marriage equality is codified in Swiss law with identical dependent B/L permit rights.',
      femaleSponsor: 'Fully equal criteria across all genders with standard cantonal financial self-sufficiency thresholds.',
      trailingSpouse: 'Family members holding a B-permit for family reunification can take up employment or self-employment throughout Switzerland upon cantonal registration.',
      dualTeacher: 'Teaching pairs receive individual Swiss contracts with local pension (BVG / 2nd Pillar) and cantonal family allowances.'
    }
  },
  italy: {
    country: 'Italy',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Permesso di Soggiorno Motivi Familiari', 'Full Spousal Work Rights', 'Unione Civile Recognized'],
    guidance: {
      unmarried: 'Italy recognizes registered de facto cohabitations (Convivenza di Fatto) and civil unions for family residency purposes.',
      sameSex: 'Same-sex civil unions (Unioni Civili) enjoy full spousal reunification and immigration equality.',
      femaleSponsor: 'Equal criteria for male and female sponsors under standard Nulla Osta family clearance procedures.',
      trailingSpouse: 'A "Permesso di Soggiorno per Motivi Familiari" automatically permits the holder to engage in employed or self-employed work in Italy.',
      dualTeacher: 'Dual hires receive individual contracts with standard Italian CCNL education framework terms.'
    }
  },
  netherlands: {
    country: 'Netherlands',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Unmarried Partner Sponsorship Allowed', 'Arbeid Vrij Toegestaan (Free to Work)', 'Full Gender Equality'],
    guidance: {
      unmarried: 'The IND allows Highly Skilled Migrants and standard work visa holders to sponsor unmarried partners who can prove an exclusive relationship.',
      sameSex: 'The Netherlands pioneered marriage equality; same-sex spouses and partners have identical immigration status.',
      femaleSponsor: 'Complete gender parity under Dutch immigration rules.',
      trailingSpouse: 'The residence permit for the partner of a knowledge worker carries the endorsement "Arbeid vrij toegestaan" (free to work without a work permit).',
      dualTeacher: 'Dual-teacher pairs receive separate employment contracts, 8% holiday allowances (vakantiegeld), and standard CAO benefits.'
    }
  },
  portugal: {
    country: 'Portugal',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['União de Facto Recognized', 'Automatic Spousal Work Rights', 'AIMA Family Reunification'],
    guidance: {
      unmarried: 'Portugal recognizes de facto unions (União de Facto, 2+ years living together) for family reunification visas (Art. 98/107).',
      sameSex: 'Full marriage equality and identical family reunification rights.',
      femaleSponsor: 'Equal rights across all genders with standard minimum wage / living cost sufficiency checks.',
      trailingSpouse: 'Residence permits issued for family reunification grant immediate, unrestricted rights to work or freelance in Portugal.',
      dualTeacher: 'Both teachers receive individual contracts with social security contributions (Segurança Social).'
    }
  },
  mexico: {
    country: 'Mexico',
    region: 'Americas',
    marriageCertMandatory: true,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['Same-Sex Marriage Recognized', 'Temporary Resident Dependent Visa'],
    guidance: {
      unmarried: 'Cohabitation is socially normal. For immigration (Residente Temporal por Unidad Familiar), an apostilled marriage certificate is required.',
      sameSex: 'Same-sex marriage is legal nationwide across all 32 Mexican states and recognized for family unit residency.',
      femaleSponsor: 'Standard and equal rights for female teachers sponsoring male partners.',
      trailingSpouse: 'Dependent temporary residents must obtain a "Permiso de Trabajo" from the INM before accepting local remuneration.',
      dualTeacher: 'Dual-teacher couples receive individual peso-denominated contracts plus shared housing or dual allowances.'
    }
  },
  colombia: {
    country: 'Colombia',
    region: 'Americas',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['Unión Marital de Hecho Recognized', 'Same-Sex Marriage Equality'],
    guidance: {
      unmarried: 'Colombia recognizes de facto marital unions (Unión Marital de Hecho) for Beneficiary Visas (Visa V Beneficiario) with practical documentation.',
      sameSex: 'Same-sex marriage and marital unions are fully recognized under Colombian constitution and immigration statutes.',
      femaleSponsor: 'Full gender parity for spousal sponsorship.',
      trailingSpouse: 'Beneficiary visa holders cannot work in Colombia; they must apply for their own principal work visa (Visa M or V con permiso de trabajo).',
      dualTeacher: 'Dual-hire international educators receive independent contracts and standard expat healthcare benefits.'
    }
  }
};

export const DEFAULT_ADVISORY: CoupleCountryAdvisory = {
  country: 'International Host Nation',
  region: 'Global',
  marriageCertMandatory: false,
  cohabitationStatus: 'decriminalized_no_visa',
  sameSexRecognition: 'unrecognized_safe',
  femaleSponsoringMale: 'standard',
  trailingSpouseWork: 'separate_work_visa_only',
  badges: ['Check Host-Nation Visa Regulations', 'Independent Visas for Unmarried'],
  guidance: {
    unmarried: 'In most international jurisdictions outside Western Europe and parts of the Americas, dependent spousal visas require a government-recognized, apostilled marriage certificate. Unmarried couples should confirm whether independent work contracts are required.',
    sameSex: 'Same-sex relationships and civil unions are subject to host-country immigration laws. Where local law does not recognize same-sex marriage for dependent visas, both partners should apply as independent single hires.',
    femaleSponsor: 'In select jurisdictions, female expatriate employees may face distinct salary or administrative criteria when sponsoring a non-working male spouse. Check with the school HR department during the offer stage.',
    trailingSpouse: 'Holding a dependent spousal visa does not automatically confer local work rights. Trailing spouses planning to work locally or freelance should verify local work permit requirements.',
    dualTeacher: 'Dual-teacher pairs should clarify with the school whether housing benefits provide two separate single housing stipends or a consolidated shared family apartment/allowance.'
  }
};

export function getCoupleAdvisory(countryRaw?: string): CoupleCountryAdvisory {
  if (!countryRaw) return DEFAULT_ADVISORY;
  const canon = canonicalCountry(countryRaw).toLowerCase().trim();
  
  if (MARITAL_ADVISORIES[canon]) {
    return MARITAL_ADVISORIES[canon];
  }

  // Alias checks
  if (canon.includes('emirates') || canon.includes('dubai') || canon.includes('abu dhabi') || canon.includes('uae')) return MARITAL_ADVISORIES['uae'];
  if (canon.includes('saudi')) return MARITAL_ADVISORIES['saudi arabia'];
  if (canon.includes('korea')) return MARITAL_ADVISORIES['south korea'];
  if (canon.includes('uk') || canon.includes('britain') || canon.includes('england') || canon.includes('scotland')) return MARITAL_ADVISORIES['united kingdom'];
  if (canon.includes('spain')) return MARITAL_ADVISORIES['spain'];
  if (canon.includes('germany')) return MARITAL_ADVISORIES['germany'];
  if (canon.includes('belgium') || canon.includes('brussels') || canon.includes('antwerp')) return MARITAL_ADVISORIES['belgium'];
  if (canon.includes('austria') || canon.includes('vienna')) return MARITAL_ADVISORIES['austria'];
  if (canon.includes('france') || canon.includes('paris') || canon.includes('nice')) return MARITAL_ADVISORIES['france'];
  if (canon.includes('switz') || canon.includes('geneva') || canon.includes('zurich') || canon.includes('lausanne')) return MARITAL_ADVISORIES['switzerland'];
  if (canon.includes('italy') || canon.includes('milan') || canon.includes('rome')) return MARITAL_ADVISORIES['italy'];
  if (canon.includes('netherland') || canon.includes('dutch') || canon.includes('amsterdam')) return MARITAL_ADVISORIES['netherlands'];
  if (canon.includes('portugal') || canon.includes('lisbon')) return MARITAL_ADVISORIES['portugal'];
  if (canon.includes('china') || canon.includes('shanghai') || canon.includes('beijing')) return MARITAL_ADVISORIES['china'];
  if (canon.includes('singapore')) return MARITAL_ADVISORIES['singapore'];
  if (canon.includes('japan') || canon.includes('tokyo')) return MARITAL_ADVISORIES['japan'];
  if (canon.includes('thailand') || canon.includes('bangkok')) return MARITAL_ADVISORIES['thailand'];
  if (canon.includes('qatar') || canon.includes('doha')) return MARITAL_ADVISORIES['qatar'];
  if (canon.includes('kuwait')) return MARITAL_ADVISORIES['kuwait'];
  if (canon.includes('oman') || canon.includes('muscat')) return MARITAL_ADVISORIES['oman'];
  if (canon.includes('mexico')) return MARITAL_ADVISORIES['mexico'];
  if (canon.includes('colombia')) return MARITAL_ADVISORIES['colombia'];

  return {
    ...DEFAULT_ADVISORY,
    country: countryRaw
  };
}
