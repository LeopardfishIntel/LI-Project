import { isImageFile, isJobDescriptionFile,
  cleanTitle, sameTitle, titleKey, titleInText, chooseApplyUrl, makeUniqueUrls, isSoftHomepage, isHomepageUrl, toIsoDate, pagingInfo,
  findNextPageUrl, deeperLinks, rankRepairCandidates, registrableDomain, looksBlocked, isJobBoardUrl, isGroupSitePage, textHash, pickRotation, anchorForTitle,
} from "./directRules";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.error("  FAIL: " + name); } }
console.log("Direct engine rules");

check("clean: CJK hiring prefix removed", cleanTitle("誠聘 園藝工友 (全職)") === "園藝工友 (全職)");
check("clean: 'Recruitment of' removed", cleanTitle("Recruitment of Chinese Percussion Instructor") === "Chinese Percussion Instructor");
check("clean: cut-off id removed", cleanTitle("Assistant Head of Senior School: Head of Sixth Form(ID: 3650") === "Assistant Head of Senior School: Head of Sixth Form");
check("clean: trailing 'Apply now' removed", cleanTitle("Supply Teacher Apply now") === "Supply Teacher");
check("clean: 'Hiring Manager' is left alone", cleanTitle("Hiring Manager") === "Hiring Manager");

check("same job: MS = Middle School", sameTitle("MS Deputy Principal (Pastoral)", "Middle School Deputy Principal (Pastoral)"));
check("same job: HS = High School", sameTitle("HS Chemistry Teacher", "High School Chemistry Teacher"));
check("same job: & and 'and'", sameTitle("Math & Science Teacher", "Math and Science Teacher"));
check("different job: Grade 3 vs Grade 4", !sameTitle("Home Room Teacher PYP (Grade 3)", "Home Room Teacher PYP (Grade 4)"));
check("different job: Chemistry vs Science", !sameTitle("IGCSE & IBDP Chemistry Teacher", "IGCSE / IBDP Science Teacher"));
check("different job: Biology vs Chemistry", !sameTitle("Teacher of Biology", "Teacher of Chemistry"));
check("different job: Mathematics vs Sciences head", !sameTitle("Head of Mathematics PYP / MYP", "Head of Sciences PYP / MYP"));
check("title key expands abbreviations", titleKey("ES EAL Teacher") === "elementary school eal teacher");

const page = "Current vacancies. Teacher of High School Economics Dover Campus. Apply by Thursday. 誠聘 工友 (全職) Head of Music with additional Subject";
check("title on page: exact", titleInText("Teacher of High School Economics Dover Campus", page));
check("title on page: CJK after cleaning", titleInText("誠聘 工友 (全職)", page));
check("title on page: abbreviation", titleInText("Teacher of HS Economics", page.replace("High School Economics", "High School Economics")));
check("title not on page: invented", !titleInText("Head of Robotics and Drones", page));

const pageUrl = "https://www.school.edu/careers";
const known = new Set(["https://www.school.edu/careers/job-1", "https://school.wd3.myworkdayjobs.com/job/12", "https://www.tes.com/jobs/vacancy/x-1", "https://other.org/a"]);
check("link: school's own deep link kept", chooseApplyUrl("https://www.school.edu/careers/job-1", pageUrl, known) === "https://www.school.edu/careers/job-1");
check("link: job system link kept", chooseApplyUrl("https://school.wd3.myworkdayjobs.com/job/12", pageUrl, known) === "https://school.wd3.myworkdayjobs.com/job/12");
check("link: TES link replaced by careers page", chooseApplyUrl("https://www.tes.com/jobs/vacancy/x-1", pageUrl, known) === pageUrl);
check("link: TES home page replaced", chooseApplyUrl("https://www.tes.com/jobs/", pageUrl, known) === pageUrl);
check("link: homepage replaced", chooseApplyUrl("https://www.school.edu/", pageUrl, known) === pageUrl);
check("link: mailto replaced", chooseApplyUrl("mailto:hr@school.edu", pageUrl, known) === pageUrl);
check("link: unrelated website replaced", chooseApplyUrl("https://other.org/a", pageUrl, known) === pageUrl);
check("link: invented link (not on page) replaced", chooseApplyUrl("https://www.school.edu/careers/job-99", pageUrl, known) === pageUrl);
check("link: nothing given -> careers page", chooseApplyUrl(null, pageUrl, known) === pageUrl);
check("board url detected", isJobBoardUrl("https://www.teacherhorizons.com/x") && !isJobBoardUrl("https://www.school.edu/x"));
check("group site detected", isGroupSitePage("https://www.nordangliaeducation.com/amman-academy/careers") && !isGroupSitePage(pageUrl));

const uniq = makeUniqueUrls([{ title: "Math Teacher", applyUrl: pageUrl }, { title: "Science Teacher", applyUrl: pageUrl }, { title: "Art Teacher", applyUrl: "https://www.school.edu/careers/art" }], pageUrl);
check("unique links: all different", new Set(uniq.map((u) => u.applyUrl.toLowerCase())).size === 3);
check("unique links: still open the careers page", uniq[0].applyUrl.startsWith(pageUrl + "#job-") && uniq[2].applyUrl === "https://www.school.edu/careers/art");

check("soft homepage: path redirected to root", isSoftHomepage("https://s.org/porg/careers", "https://s.org/"));
check("soft homepage: normal page is fine", !isSoftHomepage("https://s.org/careers", "https://s.org/careers/jobs"));
check("soft homepage: redirect to the school's job system (other address) is fine", !isSoftHomepage("https://www.gsis.edu.hk/en/about-us/careers/job-openings", "https://careers.gsis.edu.hk/"));
check("clean: trailing full stop removed", cleanTitle("Teacher of High School Economics Dover Campus.") === "Teacher of High School Economics Dover Campus");
check("deeper: 'Click here to view' sub-page is followed", deeperLinks([{ label: "Faculty Positions Click Here to View", href: "https://s.org/faculty" }], "https://s.org/careers").length === 1);
check("homepage url", isHomepageUrl("http://www.cky.edu.hk") && !isHomepageUrl("https://s.org/careers"));

check("date: weekday and long month", toIsoDate("Sunday, 25 October 2026") === "2026-10-25");
check("date: short month first", toIsoDate("Oct 16, 2026") === "2026-10-16");
check("date: Chinese", toIsoDate("2026年10月6日") === "2026-10-06");
check("date: ISO", toIsoDate("2026-11-11") === "2026-11-11");
check("date: ordinal", toIsoDate("5th October 2026") === "2026-10-05");
check("date: unreadable -> null", toIsoDate("ASAP") === null && toIsoDate("-") === null && toIsoDate(null) === null);

check("paging: Page 1 of 2", JSON.stringify(pagingInfo("... Previous Page 1 of 2 Next")) === JSON.stringify({ page: 1, total: 2 }));
check("paging: none", pagingInfo("no paging here") === null);
check("next page link found", findNextPageUrl('<a href="/jobs?page=2" rel="next">Next</a>', "https://s.org/jobs") === "https://s.org/jobs?page=2");

const home = "https://www.tts.edu.sg/";
const ranked = rankRepairCandidates([
  { label: "University & Careers Counselling", href: "https://www.tts.edu.sg/upper-school/careers-uni-guidance" },
  { label: "CAREERS", href: "https://www.tts.edu.sg/careers-at-tanglin-trust" },
  { label: "Jobs on TES", href: "https://www.tes.com/jobs/employer/tanglin" },
  { label: "Admissions", href: "https://www.tts.edu.sg/admissions" },
], home);
check("repair: best candidate is the real careers page", ranked.length === 1 && ranked[0].url.endsWith("/careers-at-tanglin-trust"));
check("registrable domain", registrableDomain("careers.gsis.edu.hk") === "gsis.edu.hk" && registrableDomain("www.dulwich.org".replace("www.", "")) === "dulwich.org");
check("blocked page detected", looksBlocked("Checking your browser before redirecting") && !looksBlocked("Current vacancies"));
check("text hash ignores spacing and case", textHash("Teacher  of Math") === textHash("teacher of math"));

const rot = pickRotation(["A", "B", "C", "D"], { A: 500, B: undefined, C: 100, D: 900 }, 3);
check("rotation: never-checked first, then longest ago", rot.join(",") === "B,C,A");
check("rotation: never more than the limit", pickRotation(["A", "B"], {}, 1).length === 1 && pickRotation(["A"], {}, 25).length === 1);
check("rotation: same inputs give the same order", pickRotation(["A", "B", "C"], {}, 3).join(",") === "A,B,C");

const uwcAnchors = [{ label: "Home", href: "https://www.uwcsea.edu.sg/" }, { label: "Counsellor (Middle and High School - 1 Year Local Contract) East Campus", href: "https://www.uwcsea.edu.sg/uwcsea-careers/x/~board/y/post/counsellor-123" }];
check("anchor for title: page link carrying the job's words", anchorForTitle("Counsellor (Middle and High School - 1 Year Local Contract) East Campus", uwcAnchors, "https://www.uwcsea.edu.sg/uwcsea-careers") === "https://www.uwcsea.edu.sg/uwcsea-careers/x/~board/y/post/counsellor-123");
check("anchor for title: no matching link -> null", anchorForTitle("Teacher of Physics", uwcAnchors, "https://www.uwcsea.edu.sg/uwcsea-careers") === null);
const jdPage = "https://neevschools.org/key-links-careers/"; const jdKnown = new Set(["https://neevschools.org/wp-content/uploads/2026/10/JD-PHE.pdf", "https://neevschools.org/wp-content/uploads/2026/02/Job-Description-Early-Years-Home-Room-Teacher-.pdf", "https://www.spcc.edu.hk/f/jobs_and_tenders/5092/Ad_SPCC_Chinese%20Percussion%20Instructor_Oct2026.pdf"]);
check("job description file is not the apply link (JD)", chooseApplyUrl("https://neevschools.org/wp-content/uploads/2026/10/JD-PHE.pdf", jdPage, jdKnown) === jdPage);
check("job description file is not the apply link (Job-Description)", chooseApplyUrl("https://neevschools.org/wp-content/uploads/2026/02/Job-Description-Early-Years-Home-Room-Teacher-.pdf", jdPage, jdKnown) === jdPage);
check("a real advert pdf is kept", chooseApplyUrl("https://www.spcc.edu.hk/f/jobs_and_tenders/5092/Ad_SPCC_Chinese%20Percussion%20Instructor_Oct2026.pdf", "https://www.spcc.edu.hk/jobs-and-tenders", jdKnown).endsWith("Oct2026.pdf"));
check("image links are never apply links (Costa Rica poster)", isImageFile("https://uwccostarica.org/wp-content/uploads/2026/10/Chef-Ejecutivo-a.png") && !isImageFile("https://x.edu/jobs/teacher") && chooseApplyUrl("https://uwccostarica.org/wp-content/uploads/2026/10/Chef.png", "https://uwccostarica.org/community/work/") === "https://uwccostarica.org/community/work/");
check("isJobDescriptionFile: normal words are not caught", !isJobDescriptionFile("https://x.edu/f/Adjudicator-Notice.pdf") && isJobDescriptionFile("https://x.edu/f/JD_Head-Curriculum-updated.pdf"));

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
