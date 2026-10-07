import { normSa, saSchoolText, saCountryFits, matchSaSchool, parseSaDate, saDecide, saIsBusinessRole, saJobId, parseSaListing, parseSaDetail, SA_SOURCE, SA_ALIASES } from "./saRules";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log(`  PASS: ${name}`); } else { failed++; console.error(`  FAIL: ${name}`); } }

const schools = [
  { id: "FLIS0129", name: "UNIS Hanoi", country: "Vietnam" },
  { id: "FLIS0281", name: "Park House English School", country: "Qatar" },
  { id: "FLIS0049", name: "IS Prague", country: "Czech Republic" },
  { id: "FLIS0184", name: "Graded School Sao Paulo", country: "Brazil" },
  { id: "FLIS0269", name: "John F. Kennedy School Querétaro", country: "Mexico" },
  { id: "FLIS0189", name: "American British Academy", country: "Oman" },
  { id: "FLIS0279", name: "American School of Doha", country: "Qatar" },
  { id: "FLIS0255", name: "American School of Warsaw", country: "Poland" },
  { id: "FLIS0145", name: "Jakarta Intercultural School", country: "Indonesia" },
  { id: "FLIS0374", name: "Singapore American School", country: "Singapore" },
  { id: "FLIS0170", name: "Stockholm International School", country: "Sweden" },
  { id: "FLIS0381", name: "Hong Kong International School", country: "China/Hong Kong" },
  { id: "FLIS0270", name: "Colegio Nueva Granada", country: "Colombia" },
];

const M = (heading: string, role: string) => { const t = saSchoolText(heading, role); return matchSaSchool(t.school, t.country, schools); };

// heading split
const h1 = saSchoolText("Head of School / Director The American School of Kinshasa (Congo, D.R. (Kinshasa))", "Head of School / Director");
check("school text after the role", h1.school === "The American School of Kinshasa");
check("country with nested brackets", h1.country === "Congo, D.R. (Kinshasa)");
check("country plain", saSchoolText("Director Stockholm International School (Sweden)", "Director").country === "Sweden");

// wrong-school faults of the old engine
check("Tunis is NOT UNIS Hanoi", M("Superintendent American Cooperative School of Tunis (Tunisia)", "Superintendent").schoolId === null);
check("Zagreb is NOT Park House (Qatar)", M("Lower School Principal American International School of Zagreb (Croatia)", "Lower School Principal").schoolId === null);
check("Zagreb has no fixed rule left", !SA_ALIASES.some((a) => /zagreb/.test(a.phrase)) && !SA_ALIASES.some((a) => a.schoolId === "FLIS0281"));

// right matches
check("Prague by alias", M("Upper School Principal International School of Prague (Czech Republic)", "Upper School Principal").schoolId === "FLIS0049");
check("UNIS Hanoi by alias", M("Director of Admissions United Nations International School of Hanoi (Vietnam)", "Director of Admissions").schoolId === "FLIS0129");
check("Graded with accent (São)", M("High School Principal Graded - The American School of São Paulo (Brazil)", "High School Principal").schoolId === "FLIS0184");
check("JFK Querétaro", M("Head of School John F. Kennedy The American School of Querétaro (Mexico)", "Head of School").schoolId === "FLIS0269");
check("ABA Oman", M("Middle School Principal ABA Oman International School (Oman)", "Middle School Principal").schoolId === "FLIS0189");
check("Doha by name", M("Lower Elementary School Associate School Principal American School of Doha (Qatar)", "Lower Elementary School Associate School Principal").schoolId === "FLIS0279");
check("Warsaw by name", M("Middle School Vice Principal American School of Warsaw (Poland)", "Middle School Vice Principal").schoolId === "FLIS0255");
check("Jakarta by name", M("Schoolwide Curriculum Coordinator Jakarta Intercultural School (Indonesia)", "Schoolwide Curriculum Coordinator").schoolId === "FLIS0145");
check("Singapore by name", M("High School Deputy Principal Singapore American School (Singapore)", "High School Deputy Principal").schoolId === "FLIS0374");
check("Hong Kong country wording fits", M("Secondary School Associate Principal Hong Kong International School (China/Hong Kong)", "Secondary School Associate Principal").schoolId === "FLIS0381");
check("Colegio Nueva Granada with city text", M("Middle School Principal Colegio Nueva Granada, Bogota (Colombia)", "Middle School Principal").schoolId === "FLIS0270");

// not in the registry
check("Macao not in registry -> no match", M("Head of School The International School of Macao (China/Macao)", "Head of School").schoolId === null);
check("whole words only: 'Dohan School' is not Doha", matchSaSchool("The American School of Dohan", "Qatar", schools).schoolId === null);

// country must fit
check("same name, wrong country -> no match", matchSaSchool("American School of Doha", "Kuwait", schools).schoolId === null);
check("country fits loosely", saCountryFits("Czech Republic", "Czech Republic") && saCountryFits("China/Macao", "China") && !saCountryFits("Qatar", "Kuwait"));
check("unknown registry country does not block", saCountryFits("Qatar", undefined));

// two schools equally good -> no match
const twins = [{ id: "FLIS0001", name: "International School of Latvia", country: "Latvia" }, { id: "FLIS0002", name: "International School of Latvia", country: "Latvia" }];
check("two equal schools -> no match", matchSaSchool("International School of Latvia", "Latvia", twins).schoolId === null);
check("longest name wins", matchSaSchool("Hong Kong International School", "China/Hong Kong", [{ id: "A", name: "International School", country: "China" }, { id: "B", name: "Hong Kong International School", country: "China/Hong Kong" }]).schoolId === "B");

// dates
check("date parsed", parseSaDate("Oct 21, 2026")?.iso === "2026-10-21");
check("long month", parseSaDate("September 8, 2026")?.iso === "2026-09-08");
check("Rolling -> null", parseSaDate("Rolling") === null && parseSaDate("Open") === null && parseSaDate("") === null);
check("bad day -> null", parseSaDate("Feb 31, 2026") === null);
const NOW = Date.UTC(2026, 9, 6, 12, 0, 0);
check("future deadline kept with ISO date", (() => { const d = saDecide({ deadline: "Oct 21, 2026", posted: "Sep 24, 2026", closedLabel: false, now: NOW }); return d.keep && d.closingDate === "2026-10-21" && d.datePosted === "2026-09-24"; })());
check("deadline today is still open", saDecide({ deadline: "Oct 6, 2026", posted: "Sep 1, 2026", closedLabel: false, now: NOW }).keep);
check("deadline yesterday is dropped", !saDecide({ deadline: "Oct 5, 2026", posted: "Sep 1, 2026", closedLabel: false, now: NOW }).keep);
check("'no longer accepting' is dropped even with a future date", !saDecide({ deadline: "Oct 21, 2026", posted: "", closedLabel: true, now: NOW }).keep);
check("Rolling is kept with no closing date", (() => { const d = saDecide({ deadline: "Open", posted: "Sep 30, 2026", closedLabel: false, now: NOW }); return d.keep && d.closingDate === null; })());

// roles
["Facilities Manager", "Director of Admissions", "Director of Development", "Interim Chief Operating Officer", "Director of Finance and Operations", "Registrar"].forEach((t) => check(`business role dropped: ${t}`, saIsBusinessRole(t)));
["Head of School", "Head of School / Director", "Superintendent", "Middle School Principal", "High School Deputy Principal", "Director of Learning", "Head of University Guidance", "Director of High School Counseling Grades 9-12", "Schoolwide Curriculum Coordinator", "Director of Athletics, Physical Education & Aquatics", "Elementary Assistant Principal & PYP Coordinator"].forEach((t) => check(`leadership role kept: ${t}`, !saIsBusinessRole(t)));

// ids
check("job id from page address", saJobId("https://www.searchassociates.com/leadership-vacancies/head-of-school-x-2026/") === "sa_head-of-school-x-2026");
check("source label is the one the gate and the pill use", SA_SOURCE === "SEARCH ASSOCIATES");

// page reading
const listing = `<div class="x"><div class="tab-pane active"><a href="/leadership-vacancies/head-of-school-reedley-2026">Head of School</a><a href="/leadership-vacancies/head-of-school-reedley-2026">Head of School</a></div>
<div class="tab-pane"><a href="https://www.searchassociates.com/Leadership-Vacancies/middle-school-principal-x-2026/">Middle School <b>Principal</b></a></div>
<div class="tab-pane"><a href="/leadership-vacancies/filled-one-2026">Filled One</a></div></div>`;
const rows = parseSaListing(listing);
check("listing: two jobs, duplicate link once, third tab ignored", rows.length === 2 && rows[0].tab === 1 && rows[1].tab === 2 && rows[1].title === "Middle School Principal");
check("listing: short link made absolute", rows[0].href === "https://www.searchassociates.com/leadership-vacancies/head-of-school-reedley-2026");
const detail = parseSaDetail(`<h1>Head of School Reedley International School (Philippines)</h1><label>Position Posted</label> <b>Jul 6, 2026</b><label>Deadline</label> <b>Aug 16, 2026</b>
<a href="//cdn.searchassociates.com/Pages/Leadership-Searches/2026/Reedley+HOS.pdf">Pack</a><p>No longer accepting applications</p>`);
check("detail: heading, dates, pdf, closed label", detail.heading.startsWith("Head of School Reedley") && detail.posted === "Jul 6, 2026" && detail.deadline === "Aug 16, 2026" && detail.pdf === "https://cdn.searchassociates.com/Pages/Leadership-Searches/2026/Reedley+HOS.pdf" && detail.closedLabel);
check("detail: a pdf on another site is not used", parseSaDetail(`<h1>x</h1><a href="https://example.com/a.pdf">a</a>`).pdf === null);
check("normSa strips accents and signs", normSa("Querétaro & Co.") === "queretaro co");

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);
