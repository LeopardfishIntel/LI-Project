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
    badges: ['Pareja de Hecho Recognized', 'Same-Sex Marriage Equality', 'Full Spousal Work Rights Included'],
    guidance: {
      unmarried: 'Spain recognizes registered civil partnerships (Pareja de Hecho) and durable cohabitation for dependent residency. Because Pareja de Hecho is registered at the autonomous community level following local empadronamiento, non-EU couples applying from abroad typically present an apostilled home-country civil union or documented continuous cohabitation (joint leases/accounts); non-working partners can also enter via Digital Nomad or Non-Lucrative visas and register locally.',
      sameSex: 'Full legal equality under Spanish law (enacted 2005). Same-sex spouses and registered partners enjoy identical family reunification, residency, and tax rights.',
      femaleSponsor: 'Completely equal and gender-neutral under Spanish immigration law (Ley de Extranjería). Male and female educators face identical sponsorship thresholds.',
      trailingSpouse: 'Family members and Pareja de Hecho partners granted residence under family reunification (or EU citizen family regime) have the full, automatic legal right to work and freelance in Spain without a separate work permit.',
      dualTeacher: 'International schools in Spain actively recruit teaching couples without regard to marital status. Educators receive individual Convenio Colectivo employment contracts, public healthcare (Seguridad Social), and 14-month annual salary installments.'
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
    badges: ['Strictly Gender-Neutral Sponsorship', 'Full Spousal Work Rights (A-Card)', 'Legal Cohabitation Recognized'],
    guidance: {
      unmarried: 'Belgium recognizes registered legal cohabitation (Wettelijke Samenwoning / Cohabitation Légale) and proven durable relationships (2+ years cohabitation or common child) for family reunification visas, alongside legal marriage certificates.',
      sameSex: 'Full legal marriage and cohabitation equality under Belgian law. Same-sex married couples and registered partners enjoy identical family reunification and residency rights.',
      femaleSponsor: 'Completely equal and gender-neutral: Belgian and EU law applies identical requirements across all genders. A female teacher faces no additional administrative hurdles, higher salary requirements, or special clearances when sponsoring a male spouse.',
      trailingSpouse: 'Full work rights: Under Belgian Single Permit regulations, a trailing spouse or registered partner granted family reunification residency (A-Card) is legally authorized to look for and accept employment in Belgium without requiring a separate work permit.',
      dualTeacher: 'Dual-teacher couples receive independent Belgian employment contracts, comprehensive national mutual healthcare (Mutualité/Ziekenfonds), and individual 13.92-month salary structures.'
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
  },
  malaysia: {
    country: 'Malaysia',
    region: 'Southeast Asia',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'loc_permit_required',
    badges: ['Marriage Cert for Dependent Pass', 'Cohabitation Legal in Private Housing', 'EP Gender Parity'],
    guidance: {
      unmarried: 'Unmarried expatriates can legally rent and live together in private condominiums. However, Malaysian immigration (ESD) strictly requires a legalized marriage certificate to issue a Dependant Pass (DP). Unmarried partners must secure their own Employment Pass (EP).',
      sameSex: 'Same-sex marriages and civil unions are not recognized by Malaysian immigration. Same-sex teacher couples must apply as two independent single candidates on individual Employment Passes, and exercise discretion in public forums.',
      femaleSponsor: 'Female educators holding an Employment Pass (Category I or II, earning RM 5,000+/month) can sponsor their male spouses for a Dependant Pass under standard ESD guidelines.',
      trailingSpouse: 'A spouse holding a Dependant Pass can take up employment in Malaysia by obtaining a "Permission to Work" endorsement stamp from immigration or converting to a standalone Employment Pass.',
      dualTeacher: 'International schools in Kuala Lumpur, Penang, and Johor frequently hire teaching couples, providing either two single housing allowances or a consolidated family condominium allowance.'
    }
  },
  'hong kong': {
    country: 'Hong Kong',
    region: 'East Asia',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Full Dependent Work Rights', 'QT Ruling: Same-Sex Dependent Visas', 'Gender-Neutral Sponsorship'],
    guidance: {
      unmarried: 'While casual cohabitation does not qualify for visas, Hong Kong Immigration recognizes legally registered civil partnerships and same-sex overseas marriages for dependent visas following the landmark Court of Final Appeal QT ruling.',
      sameSex: 'Following legal precedents (QT and Leung cases), Hong Kong Immigration grants dependent spousal visas to same-sex partners legally married or in civil partnerships entered into abroad, along with spousal benefits and tax joint assessment.',
      femaleSponsor: 'Completely equal and gender-neutral: Female educators holding General Employment Policy (GEP) or Quality Migrant visas can sponsor male spouses with standard salary and genuine relationship documentation.',
      trailingSpouse: 'Full work authorization: Spouses holding a dependent visa under the General Employment Policy (GEP) are legally permitted to take up any employment or establish a business in Hong Kong without seeking immigration permission.',
      dualTeacher: 'Teaching couples in Hong Kong receive two independent MPF pension contributions, separate medical insurance plans, and can pool substantial school housing allowances to secure premium island or Kowloon apartments.'
    }
  },
  bahrain: {
    country: 'Bahrain',
    region: 'Middle East',
    marriageCertMandatory: true,
    cohabitationStatus: 'illegal_strict',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'salary_threshold',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['Attested Marriage Cert for Family Visa', 'Separate Work Permits for Trailing Spouse', 'Expat Compounds Common'],
    guidance: {
      unmarried: 'Cohabitation of unmarried couples is legally restricted. An attested marriage certificate is required for family residence permits (CPR). Expatriate teaching partners without marriage certificates must secure independent single work permits and contracts.',
      sameSex: 'Same-sex marriages are not legally recognized under Bahraini family code. Couples should apply as two individual educators on independent work visas, maintaining discretion.',
      femaleSponsor: 'A female teacher holding an LMRA work permit can sponsor a male spouse for family residency if meeting the government minimum monthly salary threshold (typically BHD 400–1,000 depending on category).',
      trailingSpouse: 'A trailing spouse on a dependent family visa cannot work locally. If they secure employment at a school or private company, they must transfer to an independent employer-sponsored LMRA work permit.',
      dualTeacher: 'Schools in Bahrain commonly provide teaching couples with a furnished 2–3 bedroom compound villa/apartment or a single married housing allowance.'
    }
  },
  cyprus: {
    country: 'Cyprus',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['EU Civil Cohabitation Recognized', 'Full Spousal Work Rights', 'Gender-Neutral Sponsorship'],
    guidance: {
      unmarried: 'Cyprus recognizes registered civil partnerships (Civil Cohabitation Agreement) for family reunification and residency purposes, alongside marriage certificates.',
      sameSex: 'Civil partnerships between same-sex couples have been legal in Cyprus since 2015 with equal family residency and healthcare rights.',
      femaleSponsor: 'Strictly gender-neutral under Cyprus and EU migration regulations.',
      trailingSpouse: 'Spouses and registered partners entering through family reunification obtain access to employment and self-employment in Cyprus under standard immigration law.',
      dualTeacher: 'Teaching couples receive independent employment contracts, 13th-month salary bonuses, and General Healthcare System (GeSY) registration.'
    }
  },
  india: {
    country: 'India',
    region: 'Global',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['Marriage Cert Required for X-Visa', 'Employment Visa Required to Work', 'Decriminalized (Sec 377 Struck Down)'],
    guidance: {
      unmarried: 'Live-in relationships are legally recognized in Indian civil law for domestic protection, but Indian immigration (FRRO) strictly requires an apostilled marriage certificate for an X-Entry (dependent) visa. Unmarried partners must secure their own Employment Visas.',
      sameSex: 'Same-sex relationships are decriminalized (Supreme Court Section 377 repeal). However, same-sex marriages and civil unions are not recognized for dependent visas; partners must apply as independent single educators.',
      femaleSponsor: 'Female expatriates holding an Employment Visa (earning above the statutory USD 25,000/year minimum) can sponsor their male spouses for an X-Entry visa without distinction.',
      trailingSpouse: 'An X-Entry dependent visa strictly prohibits employment in India. A trailing spouse wishing to work or teach must convert to their own independent Employment Visa sponsored by an employer meeting salary thresholds.',
      dualTeacher: 'Dual-teacher couples receive individual employment contracts and standard expat compensation packages with shared school-provided housing.'
    }
  },
  azerbaijan: {
    country: 'Azerbaijan',
    region: 'Europe',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['Legalized Marriage Cert for TRP', 'Work Permit Required for Spousal Employment'],
    guidance: {
      unmarried: 'Cohabitation in private residential housing is standard in Baku. However, the State Migration Service requires an apostilled marriage certificate to issue a Temporary Residence Permit (TRP) based on family ties.',
      sameSex: 'Same-sex relationships are decriminalized, but same-sex marriages are not recognized for migration or family reunification. Couples should apply as independent single candidates.',
      femaleSponsor: 'Female educators holding a work permit and TRP can sponsor their non-working male husbands under standard migration rules.',
      trailingSpouse: 'A spouse holding a family-based TRP cannot work legally in Azerbaijan without obtaining an employer-sponsored individual work permit.',
      dualTeacher: 'Dual hires receive individual contracts, USD/AZN pegged salaries, and school-provided city apartment accommodation.'
    }
  },
  czechia: {
    country: 'Czechia',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Free Labor Market Access for Spouses', 'Registered Partnerships Recognized', 'Gender-Neutral Sponsorship'],
    guidance: {
      unmarried: 'Czechia recognizes registered partnerships and proven durable cohabiting relationships for EU and long-term family reunification residency permits.',
      sameSex: 'Registered partnerships for same-sex couples have been legally recognized since 2006, granting full spousal reunification and immigration parity.',
      femaleSponsor: 'Fully gender-neutral under Czech immigration legislation (Act on the Residence of Foreigners).',
      trailingSpouse: 'Spouses holding a long-term residence permit for the purpose of family reunification enjoy free access to the Czech labor market without requiring a separate work permit.',
      dualTeacher: 'Teaching couples receive independent Czech employment contracts, mandatory state health insurance (VZP/OZP), and standard paid holidays.'
    }
  },
  vietnam: {
    country: 'Vietnam',
    region: 'Southeast Asia',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['Legalized Marriage for TT Visa', 'Work Permit Required for Spousal Work', 'Socially Safe & Tolerant'],
    guidance: {
      unmarried: 'Unmarried expat couples can freely rent and cohabit in private apartments throughout Hanoi, HCMC, and Da Nang. However, Vietnamese immigration requires a legalized, consular-authenticated marriage certificate for a TT (dependent) visa or temporary residence card (TRC).',
      sameSex: 'Vietnam has no laws banning same-sex relations and holds inclusive attitudes, but foreign same-sex marriages are not legally recognized for dependent TT visas. Partners should obtain independent work permits.',
      femaleSponsor: 'Female teachers holding a valid Work Permit and LD (Labor) TRC can sponsor their male spouses for a TT dependent visa on equal terms.',
      trailingSpouse: 'A TT dependent visa does not grant the right to work. A trailing spouse wishing to teach or work must obtain their own official Work Permit / Work Permit Exemption from the Department of Labor (DoLISA).',
      dualTeacher: 'Schools offer dual single contracts with two health insurance policies and either two single housing allowances or a premium 2–3 bedroom family apartment allowance.'
    }
  },
  indonesia: {
    country: 'Indonesia',
    region: 'Southeast Asia',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'prohibited_on_dependent_visa',
    badges: ['Legalized Marriage Cert for Family ITAS', 'Strict Prohibition on Dependent Work', 'Expat Housing Tolerant'],
    guidance: {
      unmarried: 'While expatriates in private gated housing or Jakarta/Bali apartments experience little scrutiny, Indonesian immigration (Ditjen Imigrasi) strictly requires an apostilled/legalized marriage certificate to issue an ITAS Keluarga (family dependent visa).',
      sameSex: 'Same-sex marriages and civil partnerships are not recognized under Indonesian law. Same-sex teacher couples must apply as two independent single candidates on separate Working ITAS (E312) permits, maintaining personal privacy.',
      femaleSponsor: 'Female expatriate teachers holding an official Working ITAS can sponsor their legal male spouses and children for dependent ITAS (C317).',
      trailingSpouse: 'A trailing spouse on a dependent ITAS (ITAS Ikut Suami/Istri) is strictly prohibited from taking up any paid employment or private tutoring. To work, they must convert to their own school-sponsored Working ITAS.',
      dualTeacher: 'Dual hires receive two independent base contracts, two annual flight allowances, and typically a combined 3-bedroom expat house or generous housing stipend.'
    }
  },
  brazil: {
    country: 'Brazil',
    region: 'Americas',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['União Estável Recognized for Visas', 'Full Spousal Work Rights (CTPS)', 'Same-Sex Marriage Equality'],
    guidance: {
      unmarried: 'Brazil recognizes stable de facto unions (União Estável) for Family Reunification Visas (VITEM XI) with reasonable documentation (joint lease, shared bank accounts, or public deed).',
      sameSex: 'Brazil enacted nationwide same-sex marriage equality in 2013; same-sex spouses and União Estável partners enjoy identical visa and immigration rights.',
      femaleSponsor: 'Strictly equal under Brazilian immigration law (Lei de Migração Nº 13.445).',
      trailingSpouse: 'Family reunification visa holders in Brazil are legally permitted to work and can obtain a Carteira de Trabalho (CTPS) upon registering with the Federal Police (CRNM).',
      dualTeacher: 'International schools provide teaching couples with individual CLT or international contracts, private medical plans (Bradesco/Amil), and CLT 13th-month salary provisions.'
    }
  },
  greece: {
    country: 'Greece',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Marriage Equality (2024)', 'Cohabitation Agreements Recognized', 'Spousal Work Authorization'],
    guidance: {
      unmarried: 'Greece recognizes cohabitation agreements (Symphono Symviosis) and registered partnerships for residence permit and family reunification purposes.',
      sameSex: 'Greece legalized same-sex civil marriage and spousal adoption in 2024, granting full equality under immigration and family statutes.',
      femaleSponsor: 'Equal criteria across all genders under standard Greek immigration code.',
      trailingSpouse: 'A spouse or partner granted a family reunification residence permit has the legal right to access the Greek labor market on an equal footing.',
      dualTeacher: 'Both teachers receive individual contracts, mandatory EFKA social security contributions, and 14-month annual salary installments.'
    }
  },
  egypt: {
    country: 'Egypt',
    region: 'Middle East',
    marriageCertMandatory: true,
    cohabitationStatus: 'illegal_strict',
    sameSexRecognition: 'criminalized_strict',
    femaleSponsoringMale: 'restricted_difficult',
    trailingSpouseWork: 'prohibited_on_dependent_visa',
    badges: ['Legalized Marriage Cert Mandatory', 'Dependent Work Prohibited', 'Independent Single Work Visas Required'],
    guidance: {
      unmarried: 'Cohabitation between unmarried couples is legally restricted. International schools require an attested marriage certificate to provide shared staff housing or family residency. Unmarried partners must apply as independent single educators.',
      sameSex: 'Same-sex relationships face severe legal penalties in Egypt, and foreign same-sex marriages are not recognized. Absolute privacy and discretion regarding personal status is mandatory.',
      femaleSponsor: 'Historically, Egyptian immigration rules place stricter hurdles on female expatriates sponsoring adult male spouses. School HR sponsorship assistance should be verified in advance.',
      trailingSpouse: 'A spouse holding a dependent tourist/residence visa cannot legally work or freelance in Egypt without obtaining an independent work permit from the Ministry of Manpower.',
      dualTeacher: 'Teaching couples in Cairo or Alexandria typically receive shared furnished campus or compound accommodation and two international salary packages.'
    }
  },
  kenya: {
    country: 'Kenya',
    region: 'Africa',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'criminalized_strict',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'prohibited_on_dependent_visa',
    badges: ['Legal Marriage for Dependants Pass', 'Work Prohibited on Dependants Pass', 'Class D Work Permit Required to Work'],
    guidance: {
      unmarried: 'Unmarried expatriates can cohabit in private rentals in Nairobi or Mombasa. However, the Kenya Department of Immigration Services requires an apostilled marriage certificate to issue a Dependants Pass (Class C/M).',
      sameSex: 'Same-sex sexual activity is criminalized under Kenyan penal code, and same-sex unions are not recognized for visas. Strict personal discretion is required.',
      femaleSponsor: 'Female educators holding a valid Class D Work Permit can sponsor their male spouses for a Dependants Pass under standard criteria.',
      trailingSpouse: 'A Dependants Pass explicitly prohibits the holder from engaging in any employment, trade, or profession in Kenya. To teach or work, the spouse must apply for their own Class D Work Permit.',
      dualTeacher: 'Teaching couples at international schools in Nairobi receive individual dollar/KES contracts, dual medical coverage, and either shared secure housing or dual allowances.'
    }
  },
  'south africa': {
    country: 'South Africa',
    region: 'Africa',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'loc_permit_required',
    badges: ['Life Partnership Recognized', 'Section 11(6) Work Endorsement', 'Full Constitutional Marriage Equality'],
    guidance: {
      unmarried: 'South Africa recognizes permanent heterosexual and same-sex life partnerships (2+ years cohabitation) for Spousal Visas (Section 11(6)) without requiring formal marriage.',
      sameSex: 'South Africa was the first nation globally to enshrine LGBTQ+ non-discrimination in its constitution and legalized same-sex marriage in 2006. Full equality applies in all visa matters.',
      femaleSponsor: 'Complete gender parity under the South African Immigration Act.',
      trailingSpouse: 'A trailing spouse holding a Section 11(6) Spousal Visa can obtain an endorsement allowing them to work, study, or conduct a business upon presenting an offer of employment.',
      dualTeacher: 'Teaching couples receive independent South African employment contracts with standard medical aid (Discovery/Momentum) and retirement contributions.'
    }
  },
  argentina: {
    country: 'Argentina',
    region: 'Americas',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Unión Convivencial Recognized', 'Full Spousal Work Rights (DNI)', 'Pioneering Marriage Equality'],
    guidance: {
      unmarried: 'Argentina recognizes registered cohabitation unions (Unión Convivencial, 2+ years) for family reunification residency (Radicación por Reunificación Familiar).',
      sameSex: 'Argentina legalized same-sex marriage in 2010 (Matrimonio Igualitario) with complete legal, immigration, and family equality.',
      femaleSponsor: 'Equal rights across all genders under the Dirección Nacional de Migraciones (DNM).',
      trailingSpouse: 'A trailing spouse granted temporary or permanent residency receives a National Identity Document (DNI) granting full legal authorization to work in Argentina.',
      dualTeacher: 'Dual hires receive two independent employment contracts under Argentine labor regulations, often with USD/ARS dual-currency indexing.'
    }
  },
  denmark: {
    country: 'Denmark',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Nordic Cohabitation Model (18-24 Mo)', 'Automatic Spousal Work Rights', 'Exemplary Gender Parity'],
    guidance: {
      unmarried: 'Denmark recognizes cohabiting partners (Samlever) for family reunification permits if the couple can document at least 18–24 months of shared residence at the same address.',
      sameSex: 'Full marriage equality and identical family reunification rights under Danish law.',
      femaleSponsor: 'Strict gender equality under Danish immigration service (SIRI) regulations.',
      trailingSpouse: 'An accompanying spouse or registered partner granted a residence permit through SIRI has an immediate, unrestricted right to work in Denmark.',
      dualTeacher: 'Both educators receive independent Danish contracts, full CPR healthcare access, and standard ATP/pension schemes.'
    }
  },
  philippines: {
    country: 'Philippines',
    region: 'Southeast Asia',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['Apostilled Marriage for 9(g) Dependent', 'AEP Required for Spousal Employment', 'Socially Hospitable & Safe'],
    guidance: {
      unmarried: 'Cohabitation in private condominiums is standard in Manila and Cebu. However, the Bureau of Immigration requires an apostilled marriage certificate for a 9(g) Dependent Visa. Unmarried partners must secure their own 9(g) Work Visas.',
      sameSex: 'Same-sex relationships are socially accepted and safe, but same-sex marriages are not recognized under Philippine family law for visa sponsorship. Candidates should apply as independent single teachers.',
      femaleSponsor: 'Female educators holding a 9(g) Commercial/Working Visa can sponsor their legal male spouses as dependents without hindrance.',
      trailingSpouse: 'A dependent 9(g) visa does not permit local employment. To work, a spouse must obtain an Alien Employment Permit (AEP) from DOLE and convert to a principal 9(g) visa.',
      dualTeacher: 'International schools in Manila typically offer dual contracts with independent flight tickets, healthcare, and shared housing allowances.'
    }
  },
  poland: {
    country: 'Poland',
    region: 'Europe',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Full Labor Access for TRC Spouses', 'Legal Marriage for Official Family Reunification', 'Gender-Neutral Sponsorship'],
    guidance: {
      unmarried: 'Cohabitation is completely legal in private housing. However, for non-EU educators applying for official Voivodeship family reunification Temporary Residence Cards (Karta Pobytu), a legal marriage certificate is required.',
      sameSex: 'Same-sex unions are not recognized for official family reunification visas under Polish immigration law. Partners should apply as independent single educators.',
      femaleSponsor: 'Fully equal criteria across all genders under standard Polish foreign national residency acts.',
      trailingSpouse: 'A spouse granted a Temporary Residence Permit for family reunification with a work permit holder is entitled to perform work in Poland without a separate work permit.',
      dualTeacher: 'Teaching couples receive independent Polish employment contracts (Umowa o Pracę) with full ZUS social insurance and NFZ healthcare.'
    }
  },
  finland: {
    country: 'Finland',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Avoliitto Cohabitation Recognized (2 Yrs)', 'Unrestricted Right to Work', 'Full Nordic Equality'],
    guidance: {
      unmarried: 'Finland recognizes cohabiting partners (Avoliitto) for residence permits on the basis of family ties if the couple has lived together for at least 2 years continuously or has a shared child.',
      sameSex: 'Full marriage equality with identical family reunification rights and social protections under Finnish law.',
      femaleSponsor: 'Strict gender equality under Finnish Immigration Service (Migri) statutes.',
      trailingSpouse: 'A residence permit granted on the basis of family ties gives the trailing spouse an unrestricted, automatic right to work in Finland.',
      dualTeacher: 'Both educators receive independent collective agreement (OVTES) contracts, Kela healthcare registration, and standard occupational pension benefits.'
    }
  },
  sweden: {
    country: 'Sweden',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Sambo Partnership Recognized', 'Full Spousal Work Rights', 'Complete Marriage Equality'],
    guidance: {
      unmarried: 'Sweden recognizes registered cohabitants (Sambo) for residence permits with proof of living together or intent to cohabit in Sweden.',
      sameSex: 'Full marriage and cohabitation equality under Swedish law (Migrationsverket).',
      femaleSponsor: 'Complete gender parity under Swedish immigration policy.',
      trailingSpouse: 'An accompanying spouse or sambo partner receiving a residence permit linked to a work permit holder obtains full, unrestricted work authorization in Sweden.',
      dualTeacher: 'Teaching couples receive separate employment contracts, Försäkringskassan social insurance, and standard Swedish collective terms.'
    }
  },
  luxembourg: {
    country: 'Luxembourg',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['PACS Registered Partnership Recognized', 'Full Spousal Work Access', 'Gender-Neutral Sponsorship'],
    guidance: {
      unmarried: 'Luxembourg recognizes registered partnerships (PACS / Partenariat enregistré) and proven durable relationships for family reunification residence permits alongside marriage.',
      sameSex: 'Same-sex marriages and PACS partnerships enjoy full legal equality and identical immigration rights.',
      femaleSponsor: 'Equal standards across all genders under Luxembourg Directorate of Immigration rules.',
      trailingSpouse: 'Family members joining a third-country worker through family reunification are entitled to pursue salaried or self-employed activity in Luxembourg without an additional labor market test.',
      dualTeacher: 'Both educators receive independent contracts with CNS public healthcare and mandatory pension contributions.'
    }
  },
  jordan: {
    country: 'Jordan',
    region: 'Middle East',
    marriageCertMandatory: true,
    cohabitationStatus: 'illegal_strict',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'restricted_difficult',
    trailingSpouseWork: 'prohibited_on_dependent_visa',
    badges: ['Attested Marriage Cert Mandatory', 'Independent Work Permits Required'],
    guidance: {
      unmarried: 'Marriage certificates are strictly required for shared accommodation and dependent residence permits. Unmarried partners must apply as independent single educators.',
      sameSex: 'Same-sex relationships are not recognized under civil or religious family law. Discretion is recommended, and couples should apply as two independent single candidates.',
      femaleSponsor: 'Residency sponsorship of an adult husband by a female foreign resident involves Ministry of Interior security clearances and specific profession criteria.',
      trailingSpouse: 'A trailing spouse on a dependent residence permit cannot work without obtaining a separate work permit approved by the Ministry of Labor.',
      dualTeacher: 'International schools in Amman provide teaching couples with shared furnished housing or single family allowances and dual flight benefits.'
    }
  },
  monaco: {
    country: 'Monaco',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['Contrat de Vie Commune Recognized', 'Monaco Residency Standards', 'Gender-Neutral Sponsorship'],
    guidance: {
      unmarried: 'Monaco recognizes civil life contracts (Contrat de Vie Commune) and foreign registered partnerships for residency cohabitation.',
      sameSex: 'Civil partnerships (Contrat de Vie Commune) are available to same-sex couples with equal residency rights.',
      femaleSponsor: 'Equal criteria under Monegasque Public Security residency regulations.',
      trailingSpouse: 'A dependent resident in Monaco must obtain a work permit from the Employment Service (Service de l\'Emploi) to accept local salaried employment.',
      dualTeacher: 'Dual hires receive individual contracts with CCSS social security coverage.'
    }
  },
  norway: {
    country: 'Norway',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Samboer Cohabitation Rights (2 Yrs)', 'Full Spousal Work Authorization', 'Exemplary Gender Equality'],
    guidance: {
      unmarried: 'Norway recognizes cohabitants (Samboer) for family immigration permits (UDI) if the couple has lived together for at least two years or expects a child together.',
      sameSex: 'Full marriage and cohabitation equality under Norwegian law with identical spousal immigration benefits.',
      femaleSponsor: 'Complete gender parity under the Norwegian Immigration Directorate (UDI).',
      trailingSpouse: 'A family immigration residence permit grants the spouse or cohabitant unrestricted authorization to work or establish a business in Norway.',
      dualTeacher: 'Teaching pairs receive individual Norwegian employment contracts with National Insurance Scheme (Folketrygden) inclusion.'
    }
  },
  hungary: {
    country: 'Hungary',
    region: 'Europe',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Marriage Cert for Family Reunification', 'Labor Market Access on D-Visa', 'Cohabitation Legal in Housing'],
    guidance: {
      unmarried: 'Cohabitation in private rentals is normal and legal. For non-EU third-country national family reunification residence permits (OIF), a legal marriage certificate is required.',
      sameSex: 'Same-sex marriages are not recognized under the Hungarian constitution for family reunification. Couples should apply as independent single educators.',
      femaleSponsor: 'Standard gender-neutral criteria under the National Directorate-General for Aliens Policing.',
      trailingSpouse: 'A spouse holding a family reunification residence permit can work in Hungary subject to standard notification or joint permit rules.',
      dualTeacher: 'Dual-teaching couples receive two independent Hungarian contracts with mandatory TB health fund enrollment.'
    }
  },
  romania: {
    country: 'Romania',
    region: 'Europe',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['EU Family Reunification (IGI)', 'Spousal Work Authorization', 'Gender-Neutral Sponsorship'],
    guidance: {
      unmarried: 'Cohabitation in private residential housing is standard in Bucharest. Official family reunification residence permits issued by the General Inspectorate for Immigration (IGI) require a legalized marriage certificate.',
      sameSex: 'Same-sex marriages and civil partnerships are not currently recognized under Romanian domestic law for family reunification. Couples should secure independent work visas.',
      femaleSponsor: 'Equal criteria across all genders under Romanian immigration legislation.',
      trailingSpouse: 'A spouse who receives a temporary residence permit for family reunification is entitled to work in Romania without needing a separate work authorization notice.',
      dualTeacher: 'Teaching couples receive independent Romanian employment contracts and public healthcare (CNAS) coverage.'
    }
  },
  peru: {
    country: 'Peru',
    region: 'Americas',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['Apostilled Marriage / Unión de Hecho', 'Carné de Extranjería', 'Separate Work Authorization Required'],
    guidance: {
      unmarried: 'Peru recognizes de facto unions (Unión de Hecho) registered in public registries (SUNARP), alongside apostilled marriage certificates for Residencia por Familiar de Residente.',
      sameSex: 'Same-sex relationships are legal and safe, but same-sex marriages from abroad are not recognized for immigration resident visas. Candidates should apply on separate work contracts.',
      femaleSponsor: 'Standard equal rights for female educators sponsoring family dependents via Migraciones Perú.',
      trailingSpouse: 'A dependent resident (Familiar de Residente) holding a Carné de Extranjería must apply for a change of immigration status or work permit to accept local employment.',
      dualTeacher: 'Dual-teacher hires receive individual teaching contracts and school-provided or subsidized housing in Lima.'
    }
  },
  'costa rica': {
    country: 'Costa Rica',
    region: 'Americas',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Same-Sex Marriage Equality', 'Vínculo Familiar Residence', 'Gender-Neutral Sponsorship'],
    guidance: {
      unmarried: 'Costa Rica recognizes de facto unions (Unión de Hecho) declared before a family court or notary for dependent residency under Dirección General de Migración y Extranjería (DGME).',
      sameSex: 'Costa Rica legalized same-sex marriage in 2020 with full constitutional equality in marriage, family reunification, and social security (CCSS).',
      femaleSponsor: 'Strict gender equality under Costa Rican immigration laws.',
      trailingSpouse: 'Spouses and recognized partners holding a Residencia Temporal por Vínculo can engage in remunerated activities upon registration with the CCSS.',
      dualTeacher: 'Teaching couples receive individual contracts with CCSS medical benefits and shared housing allowances in San José.'
    }
  },
  tanzania: {
    country: 'Tanzania',
    region: 'Africa',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'criminalized_strict',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'prohibited_on_dependent_visa',
    badges: ['Legal Marriage for Class C Pass', 'Work Prohibited on Dependent Pass', 'Separate Class A/B Permits Required'],
    guidance: {
      unmarried: 'Cohabitation in private residential expat compounds in Dar es Salaam or Arusha is standard. However, the Immigration Services Department strictly requires a legalized marriage certificate for a Class C Dependant Pass.',
      sameSex: 'Same-sex sexual activity is criminalized under Tanzanian law. Foreign same-sex unions are not recognized. Absolute privacy and discretion is necessary, and couples must apply as independent single educators.',
      femaleSponsor: 'Female teachers holding a valid Class B Work Permit can sponsor male spouses for a Class C Dependant Pass under standard regulations.',
      trailingSpouse: 'A Class C Dependant Pass strictly prohibits the holder from taking up any paid employment or volunteer work in Tanzania. To work, the spouse must obtain their own Class B Work Permit.',
      dualTeacher: 'International schools provide dual single contracts, shared furnished housing or generous housing allowances, and comprehensive evacuation/medical insurance.'
    }
  },
  taiwan: {
    country: 'Taiwan',
    region: 'East Asia',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: [
      'LGBTQ+ Marriage Equality',
      'Marriage Required for Visa',
      'High Safety Index'
    ],
    guidance: {
      unmarried: 'Unmarried cohabitation is legal and socially accepted, but de facto partners cannot qualify for a dependent Alien Resident Certificate (ARC). Legal marriage is required for spousal visa sponsorship.',
      sameSex: 'Taiwan recognized same-sex marriage in 2019 and fully extended marriage equality to transnational same-sex couples in 2023, granting equal spousal ARC rights.',
      femaleSponsor: 'Gender-neutral sponsorship criteria under Taiwan National Immigration Agency rules.',
      trailingSpouse: 'Dependent ARC holders cannot work locally without obtaining an independent work permit and employment offer from a Ministry of Labor approved employer.',
      dualTeacher: 'Teaching couples receive separate employment contracts, national health insurance (NHI) enrollment, and individual tax filings.'
    }
  },
  turkey: {
    country: 'Turkey',
    region: 'Middle East',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: [
      'Marriage Required for Visa',
      'Separate Work Permit Needed',
      'Eurasian Hub'
    ],
    guidance: {
      unmarried: 'Unmarried cohabitation is legal in private rentals, but Turkish family reunification residence permits strictly require an official, legalized marriage certificate.',
      sameSex: 'Same-sex partnerships are not legally recognized. While homosexuality is not criminalized, discretion is advised due to conservative social norms.',
      femaleSponsor: 'Standard, gender-neutral sponsorship criteria applied under Turkish Directorate General of Migration Management.',
      trailingSpouse: 'Accompanying dependent residence permit holders must secure an independent work permit sponsored by an authorized Turkish employer before accepting work.',
      dualTeacher: 'Dual-teaching couples receive separate school contracts, work visas, and SGK social security coverage.'
    }
  },
  kazakhstan: {
    country: 'Kazakhstan',
    region: 'East Asia',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: [
      'High Savings Destination',
      'Marriage Required for Visa',
      'USD / Tax-Free Packages'
    ],
    guidance: {
      unmarried: 'Unmarried cohabitation is permitted in private expat housing, but dependent visas (C4 category) strictly require a legal marriage certificate.',
      sameSex: 'Same-sex marriage is not legally recognized. LGBTQ+ educators are advised to maintain discretion in public and professional environments.',
      femaleSponsor: 'Gender parity is strictly enforced in migration regulations for foreign educators.',
      trailingSpouse: 'Dependent visa status does not grant local labor market access. Trailing spouses must secure an independent work permit and employer sponsorship.',
      dualTeacher: 'International school contracts for couples frequently offer individual USD-denominated salaries, tax-equalized compensation, and joint luxury apartments.'
    }
  },
  cambodia: {
    country: 'Cambodia',
    region: 'Southeast Asia',
    marriageCertMandatory: false,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: [
      'Flexible Visa Entry',
      'Low Cost of Living',
      'Independent Work Permits'
    ],
    guidance: {
      unmarried: 'Unmarried partners cannot get dependent visas, but can easily enter on an Ordinary (E-class) visa and extend it independently on business/freelance grounds.',
      sameSex: 'Same-sex relationships are not legally recognized, but Cambodia is highly tolerant and safe for LGBTQ+ expat couples.',
      femaleSponsor: 'Identical, straightforward sponsorship procedures across all genders.',
      trailingSpouse: 'Spouses can easily convert an Ordinary visa into an independent work visa or work permit via local employment or freelance registration.',
      dualTeacher: 'International schools offer independent teaching contracts, housing allowances, and comprehensive private medical coverage.'
    }
  },
  ghana: {
    country: 'Ghana',
    region: 'Africa',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'criminalized_strict',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: [
      'Marriage Required for Visa',
      'USD Savings Contracts',
      'Strict Legal Discretion'
    ],
    guidance: {
      unmarried: 'Unmarried cohabitation is allowed in expat housing, but official dependent quotas and spousal visas strictly require an apostilled marriage certificate.',
      sameSex: 'Same-sex sexual activity is criminalized under national penal code. Extreme discretion is required; same-sex partners must apply as independent single candidates.',
      femaleSponsor: 'Standard immigration criteria applied equally to male and female expatriates.',
      trailingSpouse: 'Dependent visa holders must apply for a separate subject-to-regularization (STR) work permit to accept local employment.',
      dualTeacher: 'Tier-1 international schools offer full USD tax-free packages, flight allowances, and provided compound housing for teaching couples.'
    }
  },
  nigeria: {
    country: 'Nigeria',
    region: 'Africa',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'criminalized_strict',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: [
      'Marriage Required for Visa',
      'USD Expat Contracts',
      'Strict Legal Environment'
    ],
    guidance: {
      unmarried: 'Unmarried partners cannot be included on a Subject to Regularization (STR) visa or CERPAC residence card. Formal marriage certificates are mandatory.',
      sameSex: 'Same-sex relationships and civil unions are strictly illegal under the Same Sex Marriage Prohibition Act (SSMPA). Absolute discretion is required.',
      femaleSponsor: 'Standard criteria for foreign teaching professionals sponsoring legal spouses.',
      trailingSpouse: 'Dependents cannot take up paid employment without converting to an independent STR work visa sponsored by an employer.',
      dualTeacher: 'Couples receive high net savings USD packages, private housing within secure compounds, and comprehensive worldwide healthcare.'
    }
  },
  ethiopia: {
    country: 'Ethiopia',
    region: 'Africa',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'criminalized_strict',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: [
      'Marriage Required for Visa',
      'Diplomatic Hub',
      'Discretion Advised'
    ],
    guidance: {
      unmarried: 'Unmarried cohabitation is permitted in private expat housing, but spousal work and residence permits strictly require a registered marriage certificate.',
      sameSex: 'Same-sex sexual activity is criminalized under the Criminal Code. Same-sex couples must maintain discretion and apply as single individuals.',
      femaleSponsor: 'Gender-neutral sponsorship requirements under the Main Department for Immigration and Nationality Affairs.',
      trailingSpouse: 'Dependent visa holders are barred from taking local paid work unless an independent work permit is secured.',
      dualTeacher: 'International schools in Addis Ababa offer full USD salary packaging, housing allowances, and regional travel stipends.'
    }
  },
  morocco: {
    country: 'Morocco',
    region: 'Africa',
    marriageCertMandatory: true,
    cohabitationStatus: 'illegal_strict',
    sameSexRecognition: 'criminalized_strict',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: [
      'Marriage Strictly Mandatory',
      'Article 490 Enforcement',
      'North Africa Hub'
    ],
    guidance: {
      unmarried: 'Extramarital cohabitation is technically illegal under Article 490 of the Penal Code. Legal marriage is strictly mandatory for shared residency sponsorship and long-stay visas.',
      sameSex: 'Same-sex relations are criminalized under Article 489. LGBTQ+ couples must apply as independent single applicants and maintain discretion.',
      femaleSponsor: 'Standard, gender-neutral sponsorship criteria apply to foreign teaching professionals.',
      trailingSpouse: 'A trailing spouse cannot work on a dependent visa (*carte de séjour*) and must secure a formal employment contract approved by ANAPEC.',
      dualTeacher: 'International teaching couples receive separate employment contracts, housing allowances, and private international medical top-ups.'
    }
  },
  chile: {
    country: 'Chile',
    region: 'Americas',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: [
      'Civil Union (AUC) Recognized',
      'Same-Sex Marriage Equality',
      'Full Work Rights'
    ],
    guidance: {
      unmarried: 'Chile recognizes registered civil unions (*Acuerdo de Unión Civil - AUC*) for temporary residency sponsorship, granting unmarried partners equal immigration status.',
      sameSex: 'Full legal marriage equality and civil union recognition for same-sex couples with complete spousal visa parity.',
      femaleSponsor: 'Strictly equal criteria under Chilean National Migration Service regulations.',
      trailingSpouse: 'Dependent visa holders under temporary residence have the right to accept local employment without a separate labor market test.',
      dualTeacher: 'Teaching couples receive full individual contracts, national/private health coverage (Isapre), and airfare allowances.'
    }
  },
  panama: {
    country: 'Panama',
    region: 'Americas',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: [
      'Marriage Required for Visa',
      'USD Currency Base',
      'Financial & Expat Hub'
    ],
    guidance: {
      unmarried: 'Unmarried cohabitation is legal in private rentals, but National Migration Service spousal visas strictly require an apostilled marriage certificate.',
      sameSex: 'Same-sex marriage is not legally recognized, but Panama is generally safe and tolerant for expat professionals in urban areas.',
      femaleSponsor: 'Gender-neutral sponsorship criteria apply to foreign educators.',
      trailingSpouse: 'Trailing spouses cannot work on a dependent visa and must obtain an independent work permit from the Ministry of Labor (MITRADEL).',
      dualTeacher: 'International schools provide USD-based compensation, health insurance, and relocation assistance for dual-educator households.'
    }
  },
  bulgaria: {
    country: 'Bulgaria',
    region: 'Europe',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: [
      'EU Type D Spousal Visa',
      'Spousal Work Rights',
      'Cohabitation Legal in Rentals'
    ],
    guidance: {
      unmarried: 'Cohabitation in private residential rentals is standard in Sofia. For non-EU third-country national long-stay family reunification Type D visas, an official legalized marriage certificate is required.',
      sameSex: 'Same-sex marriages and civil partnerships are not currently recognized under Bulgarian family code. Same-sex teacher couples should apply on separate individual work permits.',
      femaleSponsor: 'Standard gender-neutral sponsorship criteria apply under the Bulgarian Migration Directorate.',
      trailingSpouse: 'A spouse holding a continuous residence permit for family reunification has the right to work in Bulgaria under EU standard directives.',
      dualTeacher: 'Teaching couples receive independent employment contracts, provided compound or furnished city housing, and mandatory National Health Insurance Fund (NZOK) enrollment.'
    }
  },
  croatia: {
    country: 'Croatia',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: [
      'Life Partnership Recognized',
      'Full Spousal Work Rights',
      'EU Family Reunification'
    ],
    guidance: {
      unmarried: 'Croatia recognizes non-marital unions (Izvanbračna zajednica) and registered partnerships for temporary residence (Privremeni boravak) with documentation of cohabitation for at least 3 years.',
      sameSex: 'Croatia recognizes registered and informal same-sex life partnerships (Zakon o životnom partnerstvu) with equal rights for family reunification and residency.',
      femaleSponsor: 'Completely equal and gender-neutral under Croatian Alien Act regulations.',
      trailingSpouse: 'Spouses and recognized partners granted temporary residence for family reunification are legally entitled to work in Croatia without a separate work and stay permit.',
      dualTeacher: 'Teaching pairs receive individual Croatian employment contracts, national health insurance (HZZO), and standard holiday allowances.'
    }
  },
  serbia: {
    country: 'Serbia',
    region: 'Europe',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: [
      'Legalized Marriage for TRP',
      'Unified Single Work Permit',
      'Balkan Educational Hub'
    ],
    guidance: {
      unmarried: 'Cohabitation in private rentals is normal and legal in Belgrade. However, Serbian Ministry of Interior temporary residence permits based on family reunification require an apostilled marriage certificate.',
      sameSex: 'Same-sex partnerships are not legally recognized under Serbian civil law. LGBTQ+ educator couples should apply as two independent single candidates.',
      femaleSponsor: 'Standard gender parity applies under Serbian Law on Foreigners.',
      trailingSpouse: 'A trailing spouse on a family residence permit must obtain a unified work permit through the National Employment Service before taking up local employment.',
      dualTeacher: 'International schools in Belgrade offer independent employment contracts, housing allowances, and comprehensive private health insurance.'
    }
  },
  slovakia: {
    country: 'Slovakia',
    region: 'Europe',
    marriageCertMandatory: true,
    cohabitationStatus: 'decriminalized_no_visa',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: [
      'EU Family Reunification',
      'Labor Market Access',
      'Gender-Neutral Sponsorship'
    ],
    guidance: {
      unmarried: 'Unmarried cohabitation is legal in private housing, but Slovak Foreigners Police require an apostilled marriage certificate for family reunification temporary residence permits.',
      sameSex: 'Same-sex marriages and civil unions are not recognized for family reunification under Slovak legislation. Partners should secure independent employment visas.',
      femaleSponsor: 'Standard, gender-neutral sponsorship requirements under the Slovak Act on the Residence of Foreigners.',
      trailingSpouse: 'Spouses holding a temporary residence permit for family reunification are entitled to enter the Slovak labor market after 9 months of residence or immediately if the sponsor holds a Single Permit/EU Blue Card.',
      dualTeacher: 'Both educators receive separate employment contracts, public health insurance (VšZP/Dôvera), and standard statutory benefits.'
    }
  },
  latvia: {
    country: 'Latvia',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: [
      'Partnership Law Enacted',
      'Full Spousal Work Rights',
      'Baltic Innovation Hub'
    ],
    guidance: {
      unmarried: 'Latvia recognizes registered partnerships (Partnership Law) for temporary residence permit sponsorship alongside traditional legal marriage certificates.',
      sameSex: 'Latvia enacted legal partnership recognition for same-sex couples, conferring equal residency and family reunification rights through the Office of Citizenship and Migration Affairs (PMLP).',
      femaleSponsor: 'Strictly equal criteria under Latvian immigration law.',
      trailingSpouse: 'A spouse or registered partner granted a temporary residence permit for family reunification has full legal rights to work for any employer in Latvia.',
      dualTeacher: 'Teaching couples receive independent employment contracts, social tax contributions (VSAA), and private medical coverage.'
    }
  },
  nepal: {
    country: 'Nepal',
    region: 'Global',
    marriageCertMandatory: true,
    cohabitationStatus: 'legal',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: [
      'USD Expat Package',
      'Low Living Costs',
      'Separate Spousal Work Visa'
    ],
    guidance: {
      unmarried: 'Unmarried cohabitation for foreign expatriates is legal and widely accepted in Kathmandu residential zones (Sanepa, Jhamsikhel). However, dependent visa sponsorship requires an official marriage certificate.',
      sameSex: 'Nepal possesses progressive constitutional protections for LGBTQ+ rights. Foreign same-sex marriages do not confer automatic dependent work visas; both teachers should apply for independent work permits with the school.',
      femaleSponsor: 'Female educators can sponsor dependent family members through the Department of Immigration under standard procedures.',
      trailingSpouse: 'A non-working spouse on a dependent visa cannot work locally without obtaining an independent work permit from the Ministry of Labour.',
      dualTeacher: 'Dual-teaching couples are warmly welcomed by international schools in Kathmandu, which provide large furnished family accommodation and joint relocation allowances.'
    }
  },
  'sri lanka': {
    country: 'Sri Lanka',
    region: 'Global',
    marriageCertMandatory: true,
    cohabitationStatus: 'legal',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: [
      'USD Pegged Contracts',
      'Tropical Island Lifestyle',
      'Marriage Cert for Dependent Visa'
    ],
    guidance: {
      unmarried: 'Unmarried expat couples can legally share private residential accommodations in Colombo and coastal hubs without legal impediments. Spousal residence visa sponsorship requires a legalized marriage certificate.',
      sameSex: 'Decriminalization reforms are advancing. Same-sex couples should secure separate individual employment contracts and exercise general discretion in formal and public documentation.',
      femaleSponsor: 'Female expat teachers can sponsor non-working husbands on dependent residence visas with school administrative support.',
      trailingSpouse: 'Spouses holding dependent residence visas cannot work locally without converting to an employer-sponsored work visa.',
      dualTeacher: 'International schools in Colombo offer generous joint housing allowances or spacious coastal apartments along with comprehensive family healthcare.'
    }
  },
  lithuania: {
    country: 'Lithuania',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: [
      'EU / Schengen Rights',
      'Direct Spousal Work Rights',
      'Hague Apostille Accepted'
    ],
    guidance: {
      unmarried: 'Lithuania recognizes registered partnerships and proven cohabitation for temporary residence permit sponsorship alongside traditional civil marriage.',
      sameSex: 'Same-sex couples enjoy civil protections and safe living environments in Vilnius and Kaunas. Spousal/partner family reunification is processed under standard Migration Department (MIGRIS) rules.',
      femaleSponsor: 'Strictly equal treatment under Lithuanian and EU equality laws.',
      trailingSpouse: 'A spouse granted a Temporary Residence Permit under family reunification is granted immediate, unrestricted legal rights to work in Lithuania.',
      dualTeacher: 'Teaching pairs receive independent contracts, Compulsory Health Insurance (PSD), and access to state-of-the-art digital infrastructure.'
    }
  },
  malta: {
    country: 'Malta',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: [
      'English Official Language',
      '#1 Rainbow Europe Index',
      'Free Public Buses'
    ],
    guidance: {
      unmarried: 'Malta legally recognizes cohabitation through the Cohabitation Act, allowing unmarried partners to apply for residency with valid documentation.',
      sameSex: 'Malta is recognized as one of the most progressive nations globally for LGBTQ+ equality (#1 on the ILGA Rainbow Europe Index), with full equal marriage and spousal residency rights.',
      femaleSponsor: 'Strictly equal sponsorship criteria under Identity Malta regulations.',
      trailingSpouse: 'Dependent spouses can obtain work authorization under Identity Malta Single Permit regulations with full legal employment rights.',
      dualTeacher: 'Both educators receive independent teaching contracts under the Council for the Teaching Profession Malta warrant system.'
    }
  },
  uzbekistan: {
    country: 'Uzbekistan',
    region: 'Europe',
    marriageCertMandatory: true,
    cohabitationStatus: 'legal',
    sameSexRecognition: 'unrecognized_caution',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['High USD Savings', 'Silk Road Expat Hub', 'Separate Spousal Work Visa'],
    guidance: {
      unmarried: 'Unmarried cohabitation for foreign expatriates is legal and common in Tashkent modern residential towers. Spousal visa sponsorship requires a legal marriage certificate.',
      sameSex: 'Same-sex relations are restricted under local statutes; international teachers must apply on independent individual work visas and maintain personal discretion.',
      femaleSponsor: 'Female educators can sponsor dependent family members through the Ministry of Internal Affairs migration department.',
      trailingSpouse: 'Trailing spouses require an independent work permit to take up local employment.',
      dualTeacher: 'International schools provide generous joint expat housing or individual contract allocations.'
    }
  },
  brunei: {
    country: 'Brunei',
    region: 'Southeast Asia',
    marriageCertMandatory: true,
    cohabitationStatus: 'illegal_strict',
    sameSexRecognition: 'criminalized_strict',
    femaleSponsoringMale: 'restricted_difficult',
    trailingSpouseWork: 'prohibited_on_dependent_visa',
    badges: ['Tax-Free Sultanate', 'Luxury Free Housing', 'Attested Marriage Cert Required'],
    guidance: {
      unmarried: 'Cohabitation outside marriage is restricted under local laws. Unmarried couples must apply as independent single hires with separate accommodation allocations.',
      sameSex: 'Strict legal restrictions apply; candidates must apply as independent single educators and exercise absolute discretion in personal documentation.',
      femaleSponsor: 'Female expatriates can sponsor dependent husbands subject to immigration approval and school administrative support.',
      trailingSpouse: 'Employment on a dependent pass is prohibited without converting to an employer-sponsored work pass.',
      dualTeacher: 'Dual-teacher couples receive spacious executive detached houses on or near campus with high tax-free savings.'
    }
  },
  uruguay: {
    country: 'Uruguay',
    region: 'Americas',
    marriageCertMandatory: false,
    cohabitationStatus: 'recognized_with_visas',
    sameSexRecognition: 'recognized',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Progressive Civil Rights', 'Full Spousal Work Rights', 'High Democratic Stability'],
    guidance: {
      unmarried: 'Uruguay recognizes registered concubinage (cohabitation) for residency sponsorship alongside civil marriage.',
      sameSex: 'Uruguay was among the earliest Latin American nations to enact equal marriage rights, providing full legal equality and spousal visa benefits.',
      femaleSponsor: 'Strictly equal criteria under Uruguayan immigration law.',
      trailingSpouse: 'Spouses and recognized partners holding temporary or permanent residency have immediate legal rights to work in Uruguay.',
      dualTeacher: 'Both educators receive separate employment contracts under standard Uruguayan labor protections.'
    }
  },
  venezuela: {
    country: 'Venezuela',
    region: 'Americas',
    marriageCertMandatory: true,
    cohabitationStatus: 'legal',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'separate_work_visa_only',
    badges: ['USD Expat Hardship Package', 'Gated Compound Housing', 'Separate Work Visa Required'],
    guidance: {
      unmarried: 'Foreign teachers can cohabitate in private expat housing; dependent visa sponsorship requires an authenticated marriage certificate.',
      sameSex: 'Foreign same-sex marriages do not confer automatic spousal visas; both educators must apply on separate teaching contracts.',
      femaleSponsor: 'Standard dependent sponsorship procedures apply through SAIME with school HR assistance.',
      trailingSpouse: 'Spouses holding dependent visas must secure independent work authorization to take up local employment.',
      dualTeacher: 'International schools provide fully secure gated family residences and comprehensive USD expat hardship packages.'
    }
  },
  georgia: {
    country: 'Georgia',
    region: 'Europe',
    marriageCertMandatory: false,
    cohabitationStatus: 'legal',
    sameSexRecognition: 'unrecognized_safe',
    femaleSponsoringMale: 'standard',
    trailingSpouseWork: 'full_rights',
    badges: ['Liberal Visa Regime', 'High Expat Safety', 'Hague Apostille Accepted'],
    guidance: {
      unmarried: 'Unmarried expat couples can legally share private residential accommodations in Tbilisi and Batumi without restrictions.',
      sameSex: 'Foreign same-sex couples live safely in Tbilisi; however, spousal residency is processed individually under Georgia\'s liberal work and residence frameworks.',
      femaleSponsor: 'Equal sponsorship criteria under the Public Service Hall framework.',
      trailingSpouse: 'Residency permit holders under family reunification have legal rights to work or freelance locally.',
      dualTeacher: 'International schools provide competitive joint allowances or centrally located furnished apartments.'
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
  badges: ['Verify Host-Nation Immigration Guidelines', 'Independent Visas for Unmarried'],
  guidance: {
    unmarried: 'Unmarried couples should verify host-nation family visa regulations with the school HR department. In jurisdictions where spousal sponsorship requires a legal marriage certificate, unmarried partners should secure independent work contracts.',
    sameSex: 'Same-sex partnerships and civil unions are subject to host-country immigration laws. Where local law does not recognize same-sex marriage for dependent visas, both partners should apply as independent single hires.',
    femaleSponsor: 'Host-country immigration policies may have specific salary or documentation requirements when an expatriate employee sponsors a non-working spouse.',
    trailingSpouse: 'Holding a dependent spousal visa does not automatically confer local work rights. Trailing spouses planning to work locally should verify whether independent work permits are required.',
    dualTeacher: 'Dual-teacher pairs should clarify with the school whether housing benefits provide two separate single housing stipends or a consolidated shared family apartment/allowance.'
  }
};

export function getCoupleAdvisory(countryRaw?: string): CoupleCountryAdvisory {
  if (!countryRaw) return DEFAULT_ADVISORY;
  const canon = canonicalCountry(countryRaw).toLowerCase().trim();
  
  if (MARITAL_ADVISORIES[canon]) {
    return MARITAL_ADVISORIES[canon];
  }

  // Exact & Word Boundary Alias checks
  if (canon.includes('emirates') || canon.includes('dubai') || canon.includes('abu dhabi') || canon === 'uae') return MARITAL_ADVISORIES['uae'];
  if (canon.includes('saudi')) return MARITAL_ADVISORIES['saudi arabia'];
  if (canon.includes('korea')) return MARITAL_ADVISORIES['south korea'];
  if (canon.includes('uk') || canon.includes('britain') || canon.includes('england') || canon.includes('scotland') || canon.includes('united kingdom')) return MARITAL_ADVISORIES['united kingdom'];
  if (canon.includes('spain') || canon.includes('madrid') || canon.includes('barcelona')) return MARITAL_ADVISORIES['spain'];
  if (canon.includes('germany') || canon.includes('berlin') || canon.includes('munich') || canon.includes('frankfurt')) return MARITAL_ADVISORIES['germany'];
  if (canon.includes('belgium') || canon.includes('brussels') || canon.includes('antwerp')) return MARITAL_ADVISORIES['belgium'];
  if (canon.includes('austria') || canon.includes('vienna')) return MARITAL_ADVISORIES['austria'];
  if (canon.includes('france') || canon.includes('paris') || canon.includes('nice') || canon.includes('lyon')) return MARITAL_ADVISORIES['france'];
  if (canon.includes('switz') || canon.includes('geneva') || canon.includes('zurich') || canon.includes('lausanne') || canon.includes('basel')) return MARITAL_ADVISORIES['switzerland'];
  if (canon.includes('italy') || canon.includes('milan') || canon.includes('rome') || canon.includes('florence')) return MARITAL_ADVISORIES['italy'];
  if (canon.includes('netherland') || canon.includes('dutch') || canon.includes('amsterdam') || canon.includes('rotterdam') || canon.includes('hague')) return MARITAL_ADVISORIES['netherlands'];
  if (canon.includes('portugal') || canon.includes('lisbon') || canon.includes('porto')) return MARITAL_ADVISORIES['portugal'];
  if (canon.includes('china') || canon.includes('shanghai') || canon.includes('beijing') || canon.includes('guangzhou') || canon.includes('shenzhen')) return MARITAL_ADVISORIES['china'];
  if (canon.includes('hong kong') || canon.includes('hong kong sar') || canon === 'hk') return MARITAL_ADVISORIES['hong kong'];
  if (canon.includes('singapore')) return MARITAL_ADVISORIES['singapore'];
  if (canon.includes('japan') || canon.includes('tokyo') || canon.includes('osaka') || canon.includes('yokohama')) return MARITAL_ADVISORIES['japan'];
  if (canon.includes('thailand') || canon.includes('bangkok') || canon.includes('phuket') || canon.includes('chiang mai')) return MARITAL_ADVISORIES['thailand'];
  if (canon.includes('malaysia') || canon.includes('kuala lumpur') || canon.includes('penang')) return MARITAL_ADVISORIES['malaysia'];
  if (canon.includes('qatar') || canon.includes('doha')) return MARITAL_ADVISORIES['qatar'];
  if (canon.includes('bahrain') || canon.includes('manama')) return MARITAL_ADVISORIES['bahrain'];
  if (canon.includes('kuwait')) return MARITAL_ADVISORIES['kuwait'];
  // Precise word match for Oman to prevent collision with Romania
  if (canon === 'oman' || canon.startsWith('oman ') || canon.endsWith(' oman') || canon.includes('muscat')) return MARITAL_ADVISORIES['oman'];
  if (canon.includes('romania') || canon.includes('bucharest')) return MARITAL_ADVISORIES['romania'];
  if (canon.includes('cyprus') || canon.includes('nicosia') || canon.includes('limassol')) return MARITAL_ADVISORIES['cyprus'];
  if (canon.includes('czech') || canon.includes('prague')) return MARITAL_ADVISORIES['czechia'];
  if (canon.includes('india') || canon.includes('delhi') || canon.includes('mumbai') || canon.includes('bangalore')) return MARITAL_ADVISORIES['india'];
  if (canon.includes('azerbaijan') || canon.includes('baku')) return MARITAL_ADVISORIES['azerbaijan'];
  if (canon.includes('vietnam') || canon.includes('hanoi') || canon.includes('ho chi minh') || canon.includes('saigon')) return MARITAL_ADVISORIES['vietnam'];
  if (canon.includes('indonesia') || canon.includes('jakarta') || canon.includes('bali')) return MARITAL_ADVISORIES['indonesia'];
  if (canon.includes('brazil') || canon.includes('sao paulo') || canon.includes('rio de janeiro')) return MARITAL_ADVISORIES['brazil'];
  if (canon.includes('greece') || canon.includes('athens')) return MARITAL_ADVISORIES['greece'];
  if (canon.includes('egypt') || canon.includes('cairo')) return MARITAL_ADVISORIES['egypt'];
  if (canon.includes('kenya') || canon.includes('nairobi')) return MARITAL_ADVISORIES['kenya'];
  if (canon.includes('south africa') || canon.includes('johannesburg') || canon.includes('cape town')) return MARITAL_ADVISORIES['south africa'];
  if (canon.includes('argentina') || canon.includes('buenos aires')) return MARITAL_ADVISORIES['argentina'];
  if (canon.includes('denmark') || canon.includes('copenhagen')) return MARITAL_ADVISORIES['denmark'];
  if (canon.includes('philippine') || canon.includes('manila')) return MARITAL_ADVISORIES['philippines'];
  if (canon.includes('poland') || canon.includes('warsaw') || canon.includes('krakow')) return MARITAL_ADVISORIES['poland'];
  if (canon.includes('finland') || canon.includes('helsinki')) return MARITAL_ADVISORIES['finland'];
  if (canon.includes('sweden') || canon.includes('stockholm')) return MARITAL_ADVISORIES['sweden'];
  if (canon.includes('luxembourg')) return MARITAL_ADVISORIES['luxembourg'];
  if (canon.includes('jordan') || canon.includes('amman')) return MARITAL_ADVISORIES['jordan'];
  if (canon.includes('monaco')) return MARITAL_ADVISORIES['monaco'];
  if (canon.includes('norway') || canon.includes('oslo')) return MARITAL_ADVISORIES['norway'];
  if (canon.includes('hungary') || canon.includes('budapest')) return MARITAL_ADVISORIES['hungary'];
  if (canon.includes('peru') || canon.includes('lima')) return MARITAL_ADVISORIES['peru'];
  if (canon.includes('costa rica') || canon.includes('san jose')) return MARITAL_ADVISORIES['costa rica'];
  if (canon.includes('tanzania') || canon.includes('dar es salaam') || canon.includes('zanzibar')) return MARITAL_ADVISORIES['tanzania'];
  if (canon.includes('mexico') || canon.includes('mexico city')) return MARITAL_ADVISORIES['mexico'];
  if (canon.includes('colombia') || canon.includes('bogota')) return MARITAL_ADVISORIES['colombia'];
  if (canon.includes('taiwan') || canon.includes('taipei') || canon.includes('kaohsiung')) return MARITAL_ADVISORIES['taiwan'];
  if (canon.includes('turkey') || canon.includes('türkiye') || canon.includes('istanbul') || canon.includes('ankara')) return MARITAL_ADVISORIES['turkey'];
  if (canon.includes('kazakhstan') || canon.includes('astana') || canon.includes('almaty') || canon.includes('nur-sultan')) return MARITAL_ADVISORIES['kazakhstan'];
  if (canon.includes('cambodia') || canon.includes('phnom penh') || canon.includes('siem reap')) return MARITAL_ADVISORIES['cambodia'];
  if (canon.includes('ghana') || canon.includes('accra')) return MARITAL_ADVISORIES['ghana'];
  if (canon.includes('nigeria') || canon.includes('lagos') || canon.includes('abuja')) return MARITAL_ADVISORIES['nigeria'];
  if (canon.includes('ethiopia') || canon.includes('addis ababa')) return MARITAL_ADVISORIES['ethiopia'];
  if (canon.includes('morocco') || canon.includes('casablanca') || canon.includes('rabat') || canon.includes('marrakech')) return MARITAL_ADVISORIES['morocco'];
  if (canon.includes('chile') || canon.includes('santiago')) return MARITAL_ADVISORIES['chile'];
  if (canon.includes('panama') || canon.includes('panama city')) return MARITAL_ADVISORIES['panama'];
  if (canon.includes('bulgaria') || canon.includes('sofia')) return MARITAL_ADVISORIES['bulgaria'];
  if (canon.includes('croatia') || canon.includes('zagreb')) return MARITAL_ADVISORIES['croatia'];
  if (canon.includes('serbia') || canon.includes('belgrade')) return MARITAL_ADVISORIES['serbia'];
  if (canon.includes('slovakia') || canon.includes('bratislava')) return MARITAL_ADVISORIES['slovakia'];
  if (canon.includes('latvia') || canon.includes('riga')) return MARITAL_ADVISORIES['latvia'];
  if (canon.includes('nepal') || canon.includes('kathmandu')) return MARITAL_ADVISORIES['nepal'];
  if (canon.includes('sri lanka') || canon.includes('colombo')) return MARITAL_ADVISORIES['sri lanka'];
  if (canon.includes('lithuania') || canon.includes('vilnius')) return MARITAL_ADVISORIES['lithuania'];
  if (canon.includes('malta') || canon.includes('valletta')) return MARITAL_ADVISORIES['malta'];
  if (canon.includes('uzbek') || canon.includes('tashkent')) return MARITAL_ADVISORIES['uzbekistan'];
  if (canon.includes('brunei')) return MARITAL_ADVISORIES['brunei'];
  if (canon.includes('uruguay') || canon.includes('montevideo')) return MARITAL_ADVISORIES['uruguay'];
  if (canon.includes('venezuela') || canon.includes('caracas')) return MARITAL_ADVISORIES['venezuela'];
  if (canon.includes('georgia') || canon.includes('tbilisi')) return MARITAL_ADVISORIES['georgia'];

  return {
    ...DEFAULT_ADVISORY,
    country: countryRaw
  };
}
