import { runDirectForSchool, toRawRecords, DirectDeps, PageResult, DirectSchool, AiJob } from "./directEngine";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.error("  FAIL: " + name); } }
console.log("Direct engine (fake web, fake AI)");

const PAD = "About our school and our community. ".repeat(30);
const page = (url: string, body: string, links: [string, string][] = [], status = 200, finalUrl?: string): PageResult => ({
  ok: status >= 200 && status < 300, status, url: finalUrl || url, contentType: "text/html",
  html: `<html><body><p>${body}</p><p>${PAD}</p>${links.map(([l, h]) => `<a href="${h}">${l}</a>`).join("\n")}</body></html>`,
});
function deps(web: Record<string, PageResult>, ai: AiJob[], counter?: { ai: number }): DirectDeps {
  return {
    fetchPage: async (u) => web[u] || { ok: false, status: 404, url: u, html: "", contentType: "text/html" },
    askAI: async () => { if (counter) counter.ai++; return { jobs: ai, tokensIn: 1000, tokensOut: 100 }; },
  };
}
const school: DirectSchool = { id: "FLIS0001", name: "Test International School", city: "Testville", country: "Testland", careersUrl: "https://www.test.edu/careers", website: "https://www.test.edu/" };

(async () => {
  // 0. AI gives no link, but the page has a link whose label is the job title -> use that link
  {
    const web = {
      "https://www.test.edu/careers": page("https://www.test.edu/careers", "Open Positions Relief Teacher English Humanities Art", [["Relief Teacher English Humanities Art", "https://www.test.edu/careers/post/relief-teacher-1"]]),
    };
    const ai: AiJob[] = [{ title: "Relief Teacher English Humanities Art", applyUrl: null, evidence: "Relief Teacher English Humanities Art" }];
    const r = await runDirectForSchool(school, null, deps(web, ai));
    check("anchor match: job gets the page link with its title", r.jobs.length === 1 && r.jobs[0].applyUrl === "https://www.test.edu/careers/post/relief-teacher-1");
  }
  // 0b. job adverts are PDF files whose link text is just "Download" -> still linked by file name
  {
    const web = {
      "https://www.test.edu/careers": page("https://www.test.edu/careers", "Open Positions Recruitment of Chinese Percussion Instructor closing 16 October 2026", [["Download", "https://www.test.edu/f/jobs/Ad_Chinese%20Percussion%20Instructor_Oct2026.pdf"]]),
    };
    const ai: AiJob[] = [{ title: "Chinese Percussion Instructor", applyUrl: null, evidence: "Chinese Percussion Instructor" }];
    const r = await runDirectForSchool(school, null, deps(web, ai));
    check("pdf advert: job links to its own pdf", r.jobs.length === 1 && /Percussion%20Instructor_Oct2026\.pdf$/.test(r.jobs[0].applyUrl));
  }
  // 1. Good page: invented title dropped, TES link replaced, same job twice kept once, paging followed
  {
    const web = {
      "https://www.test.edu/careers": page("https://www.test.edu/careers", "9 Open Positions Principal Secondary Teacher of Math Middle School Deputy Principal Page 1 of 2 Next", [["Principal", "https://www.test.edu/careers/jobs/1"], ["Next", "/careers?page=2"]]),
      "https://www.test.edu/careers?page=2": page("https://www.test.edu/careers?page=2", "Teacher of Physics Head of Music Page 2 of 2", []),
    };
    const ai: AiJob[] = [
      { title: "Principal", applyUrl: "https://www.test.edu/careers/jobs/1", evidence: "Principal" },
      { title: "Teacher of Math", applyUrl: "https://www.tes.com/jobs/vacancy/math-1", closingDate: "Sunday, 25 October 2026", evidence: "Teacher of Math" },
      { title: "MS Deputy Principal", applyUrl: null, evidence: "x" },
      { title: "Middle School Deputy Principal", applyUrl: null, evidence: "x" },
      { title: "Teacher of Physics", applyUrl: null, evidence: "x" },
      { title: "Head of Robotics and Drones", applyUrl: "https://www.test.edu/careers/jobs/77", evidence: "made up" },
    ];
    const r = await runDirectForSchool(school, null, deps(web, ai));
    check("good page: status ok", r.status === "ok");
    check("good page: both pages read", r.pagesRead === 2);
    check("good page: invented title dropped", !r.jobs.some((j) => /Robotics/.test(j.title)));
    check("good page: 'MS' and 'Middle School' kept once", r.jobs.filter((j) => /Deputy Principal/.test(j.title)).length === 1);
    check("good page: 4 real jobs", r.jobs.length === 4);
    const math = r.jobs.find((j) => j.title === "Teacher of Math")!;
    check("good page: TES link replaced by careers page", math.applyUrl.startsWith("https://www.test.edu/careers#job-"));
    check("good page: own deep link kept", r.jobs.find((j) => j.title === "Principal")!.applyUrl === "https://www.test.edu/careers/jobs/1");
    check("good page: closing date written as ISO", math.closingDate === "2026-10-25");
    check("good page: all apply links different", new Set(r.jobs.map((j) => j.applyUrl.toLowerCase())).size === r.jobs.length);
    check("good page: tokens recorded", r.tokensIn === 1000 && r.tokensOut === 100);
    const recs = toRawRecords(school, r);
    check("records: source is School Web, school filled in", recs.length === 4 && recs.every((x) => x.source === "School Web" && x.schoolId === "FLIS0001" && x.schoolName === school.name));
    check("records: Direct pill opens the job's own link", recs.every((x) => x.directUrl === x.applyUrl));
    check("records: no status set (the job gate decides, Direct is not signed off)", recs.every((x) => x.status === undefined));
    check("records: own link -> high, careers-page link -> medium", recs.find((x) => x.rawTitle === "Principal")!.matchConfidence === "high" && recs.find((x) => x.rawTitle === "Teacher of Math")!.matchConfidence === "medium");

    // unchanged next time -> no AI
    const counter = { ai: 0 };
    const again = await runDirectForSchool(school, { textHash: r.textHash, lastStatus: "ok" }, deps(web, ai, counter));
    check("unchanged page: AI not called", again.status === "unchanged" && counter.ai === 0);
    const changed = await runDirectForSchool(school, { textHash: "different", lastStatus: "ok" }, deps(web, ai, counter));
    check("changed page: AI called", changed.status === "ok" && counter.ai === 1);
  }

  // 2. Dead saved link -> repaired from homepage (university link ignored)
  {
    const web = {
      "https://www.test.edu/": page("https://www.test.edu/", "Welcome", [["University & Careers Counselling", "https://www.test.edu/uni-careers"], ["Employment", "https://www.test.edu/employment/"]]),
      "https://www.test.edu/uni-careers": page("https://www.test.edu/uni-careers", "University guidance"),
      "https://www.test.edu/employment/": page("https://www.test.edu/employment/", "Vacancies: Teacher of Art"),
    };
    const r = await runDirectForSchool(school, null, deps(web, [{ title: "Teacher of Art", evidence: "x" }]));
    check("dead link: repaired from the homepage", r.status === "ok" && r.pageUrl === "https://www.test.edu/employment/" && r.repairedFrom === school.careersUrl);
    const r2 = await runDirectForSchool(school, { pageUrl: r.pageUrl, repairedFrom: school.careersUrl }, deps(web, [{ title: "Teacher of Art", evidence: "x" }]));
    check("dead link: next time the repaired page is used first", r2.pageUrl === "https://www.test.edu/employment/");
  }

  // 3. Saved link that silently redirects to the homepage
  {
    const web = {
      "https://www.test.edu/careers": page("https://www.test.edu/careers", "Home page", [], 200, "https://www.test.edu/"),
      "https://www.test.edu/": page("https://www.test.edu/", "Home", [["Join us", "https://www.test.edu/join-us"]]),
      "https://www.test.edu/join-us": page("https://www.test.edu/join-us", "Teacher of Music wanted"),
    };
    const r = await runDirectForSchool(school, null, deps(web, [{ title: "Teacher of Music", evidence: "x" }]));
    check("soft homepage: treated as dead and repaired", r.status === "ok" && r.pageUrl === "https://www.test.edu/join-us");
  }

  // 4. Saved link is only the homepage
  {
    const web = { "https://www.test.edu/": page("https://www.test.edu/", "Home") };
    const r = await runDirectForSchool({ ...school, careersUrl: "https://www.test.edu/" }, null, deps(web, []));
    check("homepage-only link with no careers link on it -> dead link", r.status === "dead_link");
  }

  // 5. Skips and failures
  check("no link saved", (await runDirectForSchool({ ...school, careersUrl: "" }, null, deps({}, []))).status === "no_link");
  check("group site skipped", (await runDirectForSchool({ ...school, careersUrl: "https://www.nordangliaeducation.com/amman-academy/careers" }, null, deps({}, []))).status === "group_skipped");
  {
    const web = { "https://www.test.edu/careers": page("https://www.test.edu/careers", "x", [], 403) };
    check("403 -> blocked", (await runDirectForSchool(school, null, deps(web, []))).status === "blocked");
    const web2 = { "https://www.test.edu/careers": { ok: true, status: 200, url: "https://www.test.edu/careers", contentType: "text/html", html: "<html><body>Checking your browser before redirecting. Loading...</body></html>" } };
    check("browser check page -> blocked", (await runDirectForSchool(school, null, deps(web2, []))).status === "blocked");
    const web3 = { "https://www.test.edu/careers": { ok: true, status: 200, url: "https://www.test.edu/careers", contentType: "text/html", html: "<html><body><div id='root'></div>Jobs</body></html>" } };
    check("page with almost no text -> needs a browser", (await runDirectForSchool(school, null, deps(web3, []))).status === "needs_browser");
  }

  // 6. Page with no jobs
  {
    const web = { "https://www.test.edu/careers": page("https://www.test.edu/careers", "We have no vacancies at the moment.", [["Search Associates", "https://www.searchassociates.com/"]]) };
    check("only a job-board link and no jobs -> board_only", (await runDirectForSchool(school, null, deps(web, []))).status === "board_only");
    const web2 = { "https://www.test.edu/careers": page("https://www.test.edu/careers", "We have no vacancies at the moment.") };
    check("no jobs at all -> no_jobs", (await runDirectForSchool(school, null, deps(web2, []))).status === "no_jobs");
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
})();
