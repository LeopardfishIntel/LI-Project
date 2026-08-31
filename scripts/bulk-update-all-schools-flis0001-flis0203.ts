import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

const rawSchools = [
  {
    "id": "FLIS0001",
    "schoolname": "German Swiss Int'l",
    "country": "Hong Kong",
    "city": "Hong Kong",
    "tespage": "https://www.tes.com/jobs/employer/german-swiss-international-school-1057613",
    "tesnumber": "1057613",
    "schooljp": "https://www.gsis.edu.hk/en/about-us/careers/job-openings",
    "agency": "Search Associates, Schrole, LinkedIn"
  },
  {
    "id": "FLIS0002",
    "schoolname": "St. Paul's Co-ed",
    "country": "Hong Kong",
    "city": "Hong Kong",
    "schooljp": "https://www.spcc.edu.hk/jobs-and-tenders",
    "agency": "Direct HK Gov Portal, LinkedIn, JobsDB Hong Kong"
  },
  {
    "id": "FLIS0003",
    "schoolname": "K. International",
    "country": "Japan",
    "city": "Tokyo",
    "tespage": "https://www.tes.com/jobs/employer/k-international-school-tokyo-1076077",
    "schooljp": "https://www.kist.ed.jp/node/25",
    "agency": "Search Associates, Schrole, GaijinPot Jobs, IB World Board"
  },
  {
    "id": "FLIS0004",
    "schoolname": "Shanghai American",
    "country": "China",
    "city": "Shanghai",
    "tesnumber": "1279504",
    "schooljp": "https://www.saschina.org/about-sas/work-sas",
    "agency": "Search Associates, Schrole, ISS (Int'l Schools Services)"
  },
  {
    "id": "FLIS0005",
    "schoolname": "Diocesan Boys'",
    "country": "Hong Kong",
    "city": "Hong Kong",
    "schooljp": "https://www.dbs.edu.hk/index.php?s=dbs&m=jobopenings",
    "agency": "Direct HK Gov Portal, LinkedIn, JobsDB Hong Kong"
  },
  {
    "id": "FLIS0006",
    "schoolname": "UWC South East Asia",
    "country": "Singapore",
    "city": "Singapore",
    "tespage": "https://www.tes.com/jobs/employer/uwc-south-east-asia-1057094",
    "tesnumber": "1061278",
    "schooljp": "https://www.uwcsea.edu.sg/uwcsea-careers",
    "agency": "Search Associates, Schrole, UWC Movement Portal, LinkedIn"
  },
  {
    "id": "FLIS0007",
    "schoolname": "Amman Academy",
    "country": "Jordan",
    "city": "Amman",
    "schooljp": "https://www.nordangliaeducation.com/amman-academy/careers",
    "agency": "Nord Anglia Career Portal, Jobkey Jordan"
  },
  {
    "id": "FLIS0008",
    "schoolname": "Shanghai High Int'l",
    "country": "China",
    "city": "Shanghai",
    "schooljp": "https://www.shsid.org/ABOUT_US/Career_at_SHSID.htm",
    "agency": "Search Associates, eChinaCareers, LinkedIn"
  },
  {
    "id": "FLIS0009",
    "schoolname": "Dhirubhai Ambani",
    "country": "India",
    "city": "Mumbai",
    "schooljp": "https://www.dais.edu.in/careers.html",
    "agency": "Naukri.com, LinkedIn, Search Associates"
  },
  {
    "id": "FLIS0010",
    "schoolname": "Tanglin Trust",
    "country": "Singapore",
    "city": "Singapore",
    "tespage": "https://www.tes.com/jobs/employer/tanglin-trust-school-1057206",
    "tesnumber": "1057206",
    "schooljp": "https://www.tts.edu.sg/careers",
    "agency": "Search Associates, Schrole, LinkedIn, JobStreet Singapore"
  },
  {
    "id": "FLIS0011",
    "schoolname": "G.T. (Ellen Yeung)",
    "country": "Hong Kong",
    "city": "Hong Kong",
    "schooljp": "https://www.gtcollege.edu.hk/recruitment",
    "agency": "JobsDB Hong Kong, LinkedIn"
  },
  {
    "id": "FLIS0012",
    "schoolname": "GD Country Garden",
    "country": "China",
    "city": "Foshan",
    "tespage": "https://www.tes.com/jobs/employer/guangdong-country-garden-school--gcgs--1058223",
    "tesnumber": "1058223",
    "schooljp": "https://www.bgy.gd.cn/job/",
    "agency": "Bright Scholar Portal, eChinaCareers, Teach Away"
  },
  {
    "id": "FLIS0013",
    "schoolname": "St. Stephen's",
    "country": "Hong Kong",
    "city": "Hong Kong",
    "schooljp": "https://www.ssc.edu.hk/index.php?option=com_content&view=article&id=82",
    "agency": "JobsDB Hong Kong, Direct HK Gov Portal"
  },
  {
    "id": "FLIS0014",
    "schoolname": "ACS International",
    "country": "Singapore",
    "city": "Singapore",
    "tespage": "https://www.tes.com/jobs/employer/acs-international-singapore-1074273",
    "tesnumber": "1074273",
    "schooljp": "https://www.acsinternational.edu.sg/careers/",
    "agency": "Search Associates, JobStreet Singapore, LinkedIn"
  },
  {
    "id": "FLIS0015",
    "schoolname": "European Azerbaijan",
    "country": "Azerbaijan",
    "city": "Baku",
    "tespage": "https://www.tes.com/jobs/employer/the-european-azerbaijan-school-1066426",
    "tesnumber": "1066426",
    "schooljp": "https://eas.edu.az/careers/",
    "agency": "Teacher Horizons, LinkedIn, Search Associates"
  },
  {
    "id": "FLIS0016",
    "schoolname": "NPS International",
    "country": "Singapore",
    "city": "Singapore",
    "schooljp": "https://www.npsinternational.edu.sg/careers",
    "agency": "JobStreet Singapore, LinkedIn, NPS Group Portal"
  },
  {
    "id": "FLIS0017",
    "schoolname": "The ISF Academy",
    "country": "Hong Kong",
    "city": "Hong Kong",
    "tespage": "https://www.tes.com/jobs/employer/the-independent-schools-foundation-academy-isf-1273163",
    "tesnumber": "1273163",
    "schooljp": "https://academy.isf.edu.hk/careers/",
    "agency": "Search Associates, Schrole, JobsDB Hong Kong, LinkedIn"
  },
  {
    "id": "FLIS0018",
    "schoolname": "Dulwich Beijing",
    "country": "China",
    "city": "Beijing",
    "tespage": "https://www.tes.com/jobs/employer/dulwich-college-beijing-1057433",
    "tesnumber": "1057433",
    "schooljp": "https://beijing.dulwich.org/careers",
    "agency": "Education in Motion (EiM) Portal, Search Associates, Schrole"
  },
  {
    "id": "FLIS0019",
    "schoolname": "Singapore Int'l (HK)",
    "country": "Hong Kong",
    "city": "Hong Kong",
    "tespage": "https://www.tes.com/jobs/employer/singapore-international-school-1262787",
    "tesnumber": "1262787",
    "schooljp": "https://www.singapore.edu.hk/careers/",
    "agency": "JobsDB Hong Kong, LinkedIn, Singapore MOE Portal"
  },
  {
    "id": "FLIS0020",
    "schoolname": "PLK Choi Kai Yau",
    "country": "Hong Kong",
    "city": "Hong Kong",
    "schooljp": "http://www.cky.edu.hk/recruitment/",
    "agency": "JobsDB Hong Kong, Po Leung Kuk Portal"
  },
  {
    "id": "FLIS0021",
    "schoolname": "YK Pao School",
    "country": "China",
    "city": "Shanghai",
    "tespage": "https://www.tes.com/jobs/employer/yk-pao-school-1057565",
    "tesnumber": "1057565",
    "schooljp": "https://www.ykpaoschool.cn/careers",
    "agency": "Search Associates, Schrole, eChinaCareers, LinkedIn"
  },
  {
    "id": "FLIS0022",
    "schoolname": "Step by Step",
    "country": "India",
    "city": "Noida",
    "schooljp": "https://stepbystep.ed.in/careers/",
    "agency": "Naukri.com, LinkedIn"
  },
  {
    "id": "FLIS0023",
    "schoolname": "Dulwich Pudong",
    "country": "China",
    "city": "Shanghai",
    "tespage": "https://www.tes.com/jobs/employer/dulwich-college-shanghai-pudong-dcs-1057370",
    "tesnumber": "1057370",
    "schooljp": "https://shanghai-pudong.dulwich.org/careers",
    "agency": "Education in Motion (EiM) Portal, Search Associates, Schrole"
  },
  {
    "id": "FLIS0024",
    "schoolname": "SJI International",
    "country": "Singapore",
    "city": "Singapore",
    "tespage": "https://www.tes.com/jobs/employer/sji-international-school-1055929",
    "tesnumber": "1055929",
    "schooljp": "https://www.sji-international.com.sg/about/careers",
    "agency": "Search Associates, Schrole, JobStreet Singapore, LinkedIn"
  },
  {
    "id": "FLIS0025",
    "schoolname": "Canadian Int'l (HK)",
    "country": "Hong Kong",
    "city": "Hong Kong",
    "tespage": "https://www.tes.com/jobs/employer/canadian-international-school-of-hong-kong-1071231",
    "tesnumber": "1071231",
    "schooljp": "https://www.cdnis.edu.hk/careers",
    "agency": "Search Associates, Schrole, LinkedIn, JobsDB Hong Kong"
  },
  {
    "id": "FLIS0026",
    "schoolname": "Qatar Academy",
    "country": "Qatar",
    "city": "Doha",
    "tespage": "https://www.tes.com/jobs/employer/qatar-foundation-1071381",
    "tesnumber": "1071381",
    "schooljp": "https://www.qf.org.qa/careers",
    "agency": "Qatar Foundation Career Portal, Teach Away, Search Associates"
  },
  {
    "id": "FLIS0027",
    "schoolname": "GEMS World Dubai",
    "country": "UAE",
    "city": "Dubai",
    "tespage": "https://www.tes.com/jobs/employer/gems-world-academy-dubai-1060996",
    "tesnumber": "1060996",
    "schooljp": "https://www.gemsworldacademy-dubai.com/en/Careers",
    "agency": "GEMS Education Careers Portal, Teach Away, Gulf Talent"
  },
  {
    "id": "FLIS0028",
    "schoolname": "Aldar Academies",
    "country": "UAE",
    "city": "Abu Dhabi",
    "tespage": "https://www.tes.com/jobs/employer/aldar-education-1220983",
    "tesnumber": "1220983",
    "schooljp": "https://aldareducation.com/careers/",
    "agency": "Aldar Education Portal, Teach Away, Gulf Talent, LinkedIn"
  },
  {
    "id": "FLIS0029",
    "schoolname": "JESS Dubai",
    "country": "UAE",
    "city": "Dubai",
    "tespage": "https://www.tes.com/jobs/employer/jumeirah-english-speaking-school-jess-1055094",
    "tesnumber": "1055094",
    "schooljp": "https://www.jess.sch.ae/careers",
    "agency": "Teach Away, Gulf Talent, Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0030",
    "schoolname": "Neev Academy",
    "country": "India",
    "city": "Bengaluru",
    "schooljp": "https://neevacademy.org/careers/",
    "agency": "Schrole, Naukri.com, LinkedIn"
  },
  {
    "id": "FLIS0031",
    "schoolname": "Bombay Int'l",
    "country": "India",
    "city": "Mumbai",
    "schooljp": "https://bis.edu.in/careers/",
    "agency": "Naukri.com, LinkedIn"
  },
  {
    "id": "FLIS0032",
    "schoolname": "Hwa Chong Int'l",
    "country": "Singapore",
    "city": "Singapore",
    "schooljp": "https://www.hcis.edu.sg/careers/",
    "agency": "JobStreet Singapore, LinkedIn"
  },
  {
    "id": "FLIS0033",
    "schoolname": "IS Nanshan",
    "country": "China",
    "city": "Shenzhen",
    "schooljp": "https://www.isnsz.com/careers",
    "agency": "Search Associates, ISS, eChinaCareers"
  },
  {
    "id": "FLIS0034",
    "schoolname": "Wellington Shanghai",
    "country": "China",
    "city": "Shanghai",
    "tespage": "https://www.tes.com/jobs/employer/wellington-college-international-shanghai-1067101",
    "tesnumber": "1067101",
    "schooljp": "https://shanghai.wellingtoncollege.cn/careers",
    "agency": "Wellington China Portal, Search Associates, Schrole"
  },
  {
    "id": "FLIS0035",
    "schoolname": "Leman Chengdu",
    "country": "China",
    "city": "Chengdu",
    "tespage": "https://www.tes.com/jobs/employer/leman-international-school-chengdu-1071034",
    "tesnumber": "1071034",
    "schooljp": "https://www.nordangliaeducation.com/lis-chengdu/careers",
    "agency": "Nord Anglia Career Portal, Search Associates, Schrole"
  },
  {
    "id": "FLIS0036",
    "schoolname": "GIIS SMART",
    "country": "Singapore",
    "city": "Singapore",
    "schooljp": "https://singapore.globalindianschool.org/careers",
    "agency": "Global Schools Foundation Portal, JobStreet, LinkedIn"
  },
  {
    "id": "FLIS0037",
    "schoolname": "New PORG Prague",
    "country": "Czechia",
    "city": "Prague",
    "tespage": "https://www.tes.com/jobs/employer/porg-prague-1057493",
    "tesnumber": "1057493",
    "schooljp": "https://www.porg.cz/en/careers",
    "agency": "Prace.cz, LinkedIn"
  },
  {
    "id": "FLIS0038",
    "schoolname": "Ecole Jeannine Manuel",
    "country": "France",
    "city": "Paris",
    "tespage": "https://www.tes.com/jobs/employer/ecole-jeannine-manuel-paris-1057899",
    "tesnumber": "1057899",
    "schooljp": "https://www.ecolejeanninemanuel.org/en/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0039",
    "schoolname": "St Catherine's",
    "country": "Greece",
    "city": "Athens",
    "tespage": "https://www.tes.com/jobs/employer/st-catherine-s-british-school-1065747",
    "tesnumber": "1065747",
    "schooljp": "https://www.stcatherines.gr/careers/",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0040",
    "schoolname": "British Milan",
    "country": "Italy",
    "city": "Milan",
    "tespage": "https://www.tes.com/jobs/employer/the-british-school-of-milan-1057215",
    "tesnumber": "1057215",
    "schooljp": "https://www.britishschoolmilan.com/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0041",
    "schoolname": "IS Monaco",
    "country": "Monaco",
    "city": "Monaco",
    "tespage": "https://www.tes.com/jobs/employer/international-school-of-monaco-1057564",
    "tesnumber": "1057564",
    "schooljp": "https://www.ismonaco.org/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0042",
    "schoolname": "St Louis Milan",
    "country": "Italy",
    "city": "Milan",
    "tespage": "https://www.tes.com/jobs/employer/st-louis-school-caviglia-1058481",
    "tesnumber": "1058481",
    "schooljp": "https://www.stlouisschool.com/careers",
    "agency": "Inspired Education Portal, Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0043",
    "schoolname": "Heritage Gurugram",
    "country": "India",
    "city": "Gurugram",
    "schooljp": "https://www.heritagexperiential.org/careers/",
    "agency": "Naukri.com, LinkedIn"
  },
  {
    "id": "FLIS0044",
    "schoolname": "Cheltenham Muscat",
    "country": "Oman",
    "city": "Muscat",
    "tespage": "https://www.tes.com/jobs/employer/cheltenham-muscat-1224896",
    "tesnumber": "1224896",
    "schooljp": "https://cheltenhammuscat.com/careers/",
    "agency": "Cognita Careers Portal, Teacher Horizons, LinkedIn"
  },
  {
    "id": "FLIS0045",
    "schoolname": "TISB Bangalore",
    "country": "India",
    "city": "Bengaluru",
    "schooljp": "https://www.tisb.org/careers",
    "agency": "Naukri.com, LinkedIn, Search Associates"
  },
  {
    "id": "FLIS0046",
    "schoolname": "Calcutta Int'l",
    "country": "India",
    "city": "Kolkata",
    "schooljp": "https://www.calcat.in/careers/",
    "agency": "Naukri.com, LinkedIn"
  },
  {
    "id": "FLIS0047",
    "schoolname": "British Manila",
    "country": "Philippines",
    "city": "Manila",
    "tespage": "https://www.tes.com/jobs/employer/the-british-school-manila-1057671",
    "tesnumber": "1057671",
    "schooljp": "https://www.britishschoolmanila.org/careers",
    "agency": "Search Associates, Schrole, JobStreet Philippines"
  },
  {
    "id": "FLIS0048",
    "schoolname": "SSIS Shanghai",
    "country": "China",
    "city": "Shanghai",
    "schooljp": "https://www.ssis.asia/careers/",
    "agency": "eChinaCareers, Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0049",
    "schoolname": "Dulwich Singapore",
    "country": "Singapore",
    "city": "Singapore",
    "tespage": "https://www.tes.com/jobs/employer/dulwich-college-singapore-1062744",
    "tesnumber": "1062744",
    "schooljp": "https://singapore.dulwich.org/careers",
    "agency": "Education in Motion (EiM) Portal, Search Associates, Schrole"
  },
  {
    "id": "FLIS0050",
    "schoolname": "Dulwich Suzhou",
    "country": "China",
    "city": "Suzhou",
    "schooljp": "https://suzhou.dulwich.org/careers",
    "agency": "Education in Motion (EiM) Portal, Search Associates, Schrole"
  },
  {
    "id": "FLIS0051",
    "schoolname": "Aiglon College",
    "country": "Switzerland",
    "city": "Villars",
    "tespage": "https://www.tes.com/jobs/employer/aiglon-college-1057219",
    "tesnumber": "1057219",
    "schooljp": "https://www.aiglon.ch/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0052",
    "schoolname": "ACS Athens",
    "country": "Greece",
    "city": "Athens",
    "schooljp": "https://www.acs.gr/careers",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0053",
    "schoolname": "IS Prague",
    "country": "Czechia",
    "city": "Prague",
    "schooljp": "https://www.isp.cz/careers",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0054",
    "schoolname": "Frankfurt Int'l",
    "country": "Germany",
    "city": "Frankfurt",
    "tespage": "https://www.tes.com/jobs/employer/frankfurt-international-school-1277429",
    "tesnumber": "1277429",
    "schooljp": "https://www.fis.edu/careers",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0055",
    "schoolname": "King's Alicante",
    "country": "Spain",
    "city": "Alicante",
    "tespage": "https://www.tes.com/jobs/employer/king-s-college-school-alicante-1055666",
    "tesnumber": "1055666",
    "schooljp": "https://alicante.kingscollegeschool.es/careers/",
    "agency": "Inspired Education Portal, LinkedIn"
  },
  {
    "id": "FLIS0056",
    "schoolname": "St George's Rome",
    "country": "Italy",
    "city": "Rome",
    "tespage": "https://www.tes.com/jobs/employer/st-george-s-british-international-school-rome-1058020",
    "tesnumber": "1058020",
    "schooljp": "https://www.stgeorge.it/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0057",
    "schoolname": "Oak House BCN",
    "country": "Spain",
    "city": "Barcelona",
    "tespage": "https://www.tes.com/jobs/employer/oak-house-school-1057767",
    "tesnumber": "1057767",
    "schooljp": "https://www.oakhouseschool.com/careers",
    "agency": "LinkedIn, InfoJobs Spain"
  },
  {
    "id": "FLIS0058",
    "schoolname": "IS Lausanne",
    "country": "Switzerland",
    "city": "Lausanne",
    "schooljp": "https://www.isl.ch/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0059",
    "schoolname": "St John's Waterloo",
    "country": "Belgium",
    "city": "Waterloo",
    "tespage": "https://www.tes.com/jobs/employer/st-john-s-international-school-1057076",
    "tesnumber": "1057076",
    "schooljp": "https://www.stjohns.be/careers",
    "agency": "Inspired Education Portal, Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0060",
    "schoolname": "Beau Soleil",
    "country": "Switzerland",
    "city": "Villars",
    "tespage": "https://www.tes.com/jobs/employer/coll-ge-alpin-beau-soleil-sa-1057796",
    "tesnumber": "1057796",
    "schooljp": "https://www.nordangliaeducation.com/beau-soleil/careers",
    "agency": "Nord Anglia Career Portal, Search Associates"
  },
  {
    "id": "FLIS0061",
    "schoolname": "English College Prague",
    "country": "Czechia",
    "city": "Prague",
    "tespage": "https://www.tes.com/jobs/employer/english-college-in-prague-1058144",
    "tesnumber": "1058144",
    "schooljp": "https://www.englishcollege.cz/careers/",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0062",
    "schoolname": "American Milan",
    "country": "Italy",
    "city": "Milan",
    "schooljp": "https://www.asmilan.org/careers",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0063",
    "schoolname": "St George's Montreux",
    "country": "Switzerland",
    "city": "Montreux",
    "tespage": "https://www.tes.com/jobs/employer/st-george-s-international-school-1057262",
    "tesnumber": "1057262",
    "schooljp": "https://www.stgeorges.ch/careers",
    "agency": "Inspired Education Portal, LinkedIn"
  },
  {
    "id": "FLIS0064",
    "schoolname": "PaRK Lisbon",
    "country": "Portugal",
    "city": "Lisbon",
    "tespage": "https://www.tes.com/jobs/employer/park-international-school-alfragide-1179041",
    "tesnumber": "1179041",
    "schooljp": "https://www.park-is.com/careers/",
    "agency": "Inspired Education Portal, LinkedIn"
  },
  {
    "id": "FLIS0065",
    "schoolname": "Zurich Int'l",
    "country": "Switzerland",
    "city": "Zurich",
    "schooljp": "https://www.zis.ch/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0066",
    "schoolname": "British Brussels",
    "country": "Belgium",
    "city": "Brussels",
    "tespage": "https://www.tes.com/jobs/employer/the-british-school-of-brussels-1057727",
    "tesnumber": "1057727",
    "schooljp": "https://www.britishschool.be/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0067",
    "schoolname": "St Peter's BCN",
    "country": "Spain",
    "city": "Barcelona",
    "tespage": "https://www.tes.com/jobs/employer/st-peter-s-school-barcelona-1056328",
    "tesnumber": "1056328",
    "schooljp": "https://stpeters.es/careers/",
    "agency": "LinkedIn, InfoJobs Spain"
  },
  {
    "id": "FLIS0068",
    "schoolname": "Int'l College Spain",
    "country": "Spain",
    "city": "Madrid",
    "tespage": "https://www.tes.com/jobs/employer/international-college-spain-1058692",
    "tesnumber": "1058692",
    "schooljp": "https://www.nordangliaeducation.com/ics-madrid/careers",
    "agency": "Nord Anglia Career Portal, Search Associates"
  },
  {
    "id": "FLIS0069",
    "schoolname": "Aloha College",
    "country": "Spain",
    "city": "Marbella",
    "tespage": "https://www.tes.com/jobs/employer/aloha-college-1057357",
    "tesnumber": "1057357",
    "schooljp": "https://aloha-college.com/careers/",
    "agency": "LinkedIn, InfoJobs Spain"
  },
  {
    "id": "FLIS0070",
    "schoolname": "Munich International",
    "country": "Germany",
    "city": "Munich",
    "schooljp": "https://www.mis-munich.de/careers",
    "agency": "Search Associates, Schrole, LinkedIn"
  },
  {
    "id": "FLIS0071",
    "schoolname": "Benjamin Franklin",
    "country": "Spain",
    "city": "Barcelona",
    "tespage": "https://www.tes.com/jobs/employer/benjamin-franklin-international-school-1062233",
    "tesnumber": "1062233",
    "schooljp": "https://www.bfischool.org/about-us/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0072",
    "schoolname": "Leysin American",
    "country": "Switz",
    "city": "Leysin",
    "schooljp": "https://www.las.ch/about/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0073",
    "schoolname": "Bonn International",
    "country": "Germany",
    "city": "Bonn",
    "schooljp": "https://www.bonn-is.de/work/teaching-positions",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0074",
    "schoolname": "IS Amsterdam",
    "country": "Netherlands",
    "city": "Amsterdam",
    "schooljp": "https://www.isa.nl/careers",
    "agency": "Search Associates, Schrole, LinkedIn"
  },
  {
    "id": "FLIS0075",
    "schoolname": "American School BCN",
    "country": "Spain",
    "city": "Barcelona",
    "schooljp": "https://www.asbarcelona.com/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0076",
    "schoolname": "Haut-Lac Int'l",
    "country": "Switz",
    "city": "St-Légier",
    "tespage": "https://www.tes.com/jobs/employer/haut-lac-international-bilingual-school-1079043",
    "tesnumber": "1079043",
    "schooljp": "https://www.haut-lac.ch/en/careers/",
    "agency": "Teacher Horizons, LinkedIn"
  },
  {
    "id": "FLIS0077",
    "schoolname": "American Vienna",
    "country": "Austria",
    "city": "Vienna",
    "schooljp": "https://www.ais.at/employment",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0078",
    "schoolname": "College du Leman",
    "country": "Switz",
    "city": "Geneva",
    "tespage": "https://www.tes.com/jobs/employer/nord-anglia-education-1065805",
    "tesnumber": "1065805",
    "schooljp": "https://www.nordangliaeducation.com/cdl-geneva/careers",
    "agency": "Nord Anglia Career Portal, Search Associates"
  },
  {
    "id": "FLIS0079",
    "schoolname": "IS Brussels",
    "country": "Belgium",
    "city": "Brussels",
    "tespage": "https://www.tes.com/jobs/employer/international-school-of-brussels-1055958",
    "tesnumber": "1055958",
    "schooljp": "https://www.isb.be/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0080",
    "schoolname": "Riverside Prague",
    "country": "Czechia",
    "city": "Prague",
    "tespage": "https://www.tes.com/jobs/employer/riverside-international-school-1175419",
    "tesnumber": "1175419",
    "schooljp": "https://www.riversideschool.cz/contact/vacancies/",
    "agency": "Teacher Horizons, LinkedIn"
  },
  {
    "id": "FLIS0081",
    "schoolname": "IS Hellerup",
    "country": "Denmark",
    "city": "Copenhagen",
    "schooljp": "https://ish.dk/vacancies/",
    "agency": "Jobindex Denmark, LinkedIn"
  },
  {
    "id": "FLIS0082",
    "schoolname": "St George's Cologne",
    "country": "Germany",
    "city": "Cologne",
    "tespage": "https://www.tes.com/jobs/employer/st-george-s-the-british-international-school-cologne-1058656",
    "tesnumber": "1058656",
    "schooljp": "https://www.stgeorgesschool.com/careers",
    "agency": "LinkedIn, eTeach"
  },
  {
    "id": "FLIS0083",
    "schoolname": "IS Düsseldorf",
    "country": "Germany",
    "city": "Düsseldorf",
    "tespage": "https://www.tes.com/jobs/employer/international-school-of-d-sseldorf-e-v-1056279",
    "tesnumber": "1056279",
    "schooljp": "https://www.isdedu.de/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0084",
    "schoolname": "IS Zug & Luzern",
    "country": "Switz",
    "city": "Zug",
    "schooljp": "https://www.iszl.ch/careers",
    "agency": "Search Associates, Schrole, LinkedIn"
  },
  {
    "id": "FLIS0085",
    "schoolname": "Metropolitan Frankfurt",
    "country": "Germany",
    "city": "Frankfurt",
    "schooljp": "https://m-s-f.de/careers/",
    "agency": "LinkedIn, StepStone Germany"
  },
  {
    "id": "FLIS0086",
    "schoolname": "Ermitage Int'l",
    "country": "France",
    "city": "Paris",
    "tespage": "https://www.tes.com/jobs/employer/ermitage-international-school-1066851",
    "tesnumber": "1066851",
    "schooljp": "https://www.ermitage.fr/en/careers",
    "agency": "Globeducate Careers Portal, LinkedIn"
  },
  {
    "id": "FLIS0087",
    "schoolname": "Oslo International",
    "country": "Norway",
    "city": "Oslo",
    "schooljp": "https://www.oslointernationalschool.no/employment",
    "agency": "Search Associates, Finn.no"
  },
  {
    "id": "FLIS0088",
    "schoolname": "American School Paris",
    "country": "France",
    "city": "Paris",
    "schooljp": "https://www.asparis.org/employment",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0089",
    "schoolname": "St Julian's School",
    "country": "Portugal",
    "city": "Lisbon",
    "tespage": "https://www.tes.com/jobs/employer/st-julian-s-school-1058006",
    "tesnumber": "1058006",
    "schooljp": "https://www.stjulians.com/work-with-us/vacancies",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0090",
    "schoolname": "American School Madrid",
    "country": "Spain",
    "city": "Madrid",
    "schooljp": "https://www.asmadrid.org/careers",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0091",
    "schoolname": "British Int'l Budapest",
    "country": "Hungary",
    "city": "Budapest",
    "tespage": "https://www.tes.com/jobs/employer/the-british-international-school-budapest-1057761",
    "tesnumber": "1057761",
    "schooljp": "https://www.nordangliaeducation.com/bis-budapest/careers",
    "agency": "Nord Anglia Career Portal, Teacher Horizons"
  },
  {
    "id": "FLIS0092",
    "schoolname": "St George's Munich",
    "country": "Germany",
    "city": "Munich",
    "tespage": "https://www.tes.com/jobs/employer/st-george-s-the-british-international-school-munich-1074432",
    "tesnumber": "1074432",
    "schooljp": "https://www.stgeorgesschool.com/careers",
    "agency": "LinkedIn, eTeach"
  },
  {
    "id": "FLIS0093",
    "schoolname": "Bavarian International",
    "country": "Germany",
    "city": "Munich",
    "schooljp": "https://www.bis-school.com/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0094",
    "schoolname": "International Basel",
    "country": "Switz",
    "city": "Basel",
    "tespage": "https://www.tes.com/jobs/employer/international-school-basel-reinach-campus-1055110",
    "tesnumber": "1055110",
    "schooljp": "https://www.isbasel.ch/careers",
    "agency": "Search Associates, Schrole, LinkedIn"
  },
  {
    "id": "FLIS0095",
    "schoolname": "TASIS Switzerland",
    "country": "Switz",
    "city": "Lugano",
    "tespage": "https://www.tes.com/jobs/employer/the-american-school-in-switzerland-tasis-1059117",
    "tesnumber": "1059117",
    "schooljp": "https://switzerland.tasis.com/employment",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0096",
    "schoolname": "IS Athens",
    "country": "Greece",
    "city": "Athens",
    "schooljp": "https://www.isa.edu.gr/about/join-our-team",
    "agency": "LinkedIn"
  },
  {
    "id": "FLIS0097",
    "schoolname": "Danube International School Vienna",
    "country": "Austria",
    "city": "Vienna",
    "tespage": "https://www.tes.com/jobs/employer/danube-international-school-vienna-1057637",
    "tesnumber": "1057637",
    "schooljp": "https://www.danubeschool.com/community/employment",
    "agency": "Teacher Horizons, LinkedIn"
  },
  {
    "id": "FLIS0098",
    "schoolname": "British BCN (Nexus)",
    "country": "Spain",
    "city": "Barcelona",
    "tespage": "https://www.tes.com/jobs/employer/the-british-school-of-barcelona-1169587",
    "tesnumber": "1169587",
    "schooljp": "https://www.britishschoolbarcelona.com/careers",
    "agency": "Cognita Careers Portal, LinkedIn"
  },
  {
    "id": "FLIS0099",
    "schoolname": "Heidelberg Int'l",
    "country": "Germany",
    "city": "Heidelberg",
    "tespage": "https://www.tes.com/jobs/employer/heidelberg-international-school--h-i-s---1067664",
    "tesnumber": "1067664",
    "schooljp": "https://www.hischool.de/employment",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0100",
    "schoolname": "NIST International",
    "country": "Thailand",
    "city": "Bangkok",
    "tespage": "https://www.tes.com/jobs/employer/nist-international-school-1062814",
    "tesnumber": "1062814",
    "schooljp": "https://www.nist.ac.th/careers",
    "agency": "Search Associates, Schrole, ISS, LinkedIn"
  },
  {
    "id": "FLIS0101",
    "schoolname": "British International School Riyadh",
    "country": "Saudi Arabia",
    "city": "Riyadh",
    "tespage": "https://www.tes.com/jobs/employer/british-international-school-riyadh-1057688",
    "tesnumber": "1057688",
    "schooljp": "https://www.bisr.com.sa/careers",
    "agency": "Search Associates, Teach Away, LinkedIn"
  },
  {
    "id": "FLIS0102",
    "schoolname": "American International School Riyadh",
    "country": "Saudi Arabia",
    "city": "Riyadh",
    "schooljp": "https://www.aisr.org/employment",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0103",
    "schoolname": "SEK International School Riyadh",
    "country": "Saudi Arabia",
    "city": "Riyadh",
    "tespage": "https://www.tes.com/jobs/employer/sek-international-school-riyadh-1260795",
    "tesnumber": "1260795",
    "schooljp": "https://riyadh.sek.international/work-with-us/",
    "agency": "SEK Education Group Portal, LinkedIn"
  },
  {
    "id": "FLIS0104",
    "schoolname": "Reigate Grammar School Riyadh",
    "country": "Saudi Arabia",
    "city": "Riyadh",
    "tespage": "https://www.tes.com/jobs/employer/reigate-grammar-school-riyadh-1263403",
    "tesnumber": "1263403",
    "schooljp": "https://rgs-riyadh.edu.sa/careers/",
    "agency": "Reigate Grammar Int'l Portal, Teach Away"
  },
  {
    "id": "FLIS0105",
    "schoolname": "Downe House Riyadh",
    "country": "Saudi Arabia",
    "city": "Riyadh",
    "tespage": "https://www.tes.com/jobs/employer/downe-house-riyadh-1262215",
    "tesnumber": "1262215",
    "schooljp": "https://www.downehouseriyadh.com/careers/",
    "agency": "Downe House UK Portal, Teach Away, LinkedIn"
  },
  {
    "id": "FLIS0106",
    "schoolname": "Al Faris International School",
    "country": "Saudi Arabia",
    "city": "Riyadh",
    "schooljp": "https://alfaris.edu.sa/careers/",
    "agency": "LinkedIn, Gulf Talent"
  },
  {
    "id": "FLIS0107",
    "schoolname": "Misk Schools",
    "country": "Saudi Arabia",
    "city": "Riyadh",
    "tespage": "https://www.tes.com/jobs/employer/misk-schools-1081677",
    "tesnumber": "1081677",
    "schooljp": "https://miskschools.edu.sa/careers",
    "agency": "Misk Foundation Portal, Search Associates"
  },
  {
    "id": "FLIS0108",
    "schoolname": "Saud International School",
    "country": "Saudi Arabia",
    "city": "Riyadh",
    "schooljp": "https://sis.edu.sa/careers/",
    "agency": "LinkedIn, Gulf Talent"
  },
  {
    "id": "FLIS0109",
    "schoolname": "British International School Abu Dhabi",
    "country": "UAE",
    "city": "Abu Dhabi",
    "tespage": "https://www.tes.com/jobs/employer/the-british-international-school-abu-dhabi-1058518",
    "tesnumber": "1058518",
    "schooljp": "https://www.nordangliaeducation.com/bis-abu-dhabi/careers",
    "agency": "Nord Anglia Career Portal, Teach Away"
  },
  {
    "id": "FLIS0110",
    "schoolname": "Nord Anglia International School Abu Dhabi",
    "country": "UAE",
    "city": "Abu Dhabi",
    "tespage": "https://www.tes.com/jobs/employer/nord-anglia-international-school-abu-dhabi-1265059",
    "tesnumber": "1265059",
    "schooljp": "https://www.nordangliaeducation.com/nas-abu-dhabi/careers",
    "agency": "Nord Anglia Career Portal, Teach Away"
  },
  {
    "id": "FLIS0111",
    "schoolname": "Cranleigh Abu Dhabi",
    "country": "UAE",
    "city": "Abu Dhabi",
    "tespage": "https://www.tes.com/jobs/employer/cranleigh-abu-dhabi-1067935",
    "tesnumber": "1067935",
    "schooljp": "https://www.cranleigh.ae/careers",
    "agency": "Aldar Education Portal, Teach Away, LinkedIn"
  },
  {
    "id": "FLIS0112",
    "schoolname": "Brighton College Abu Dhabi",
    "country": "UAE",
    "city": "Abu Dhabi",
    "tespage": "https://www.tes.com/jobs/employer/brighton-college-abu-dhabi-1062693",
    "tesnumber": "1062693",
    "schooljp": "https://www.brightoncollege.ae/careers",
    "agency": "Bloom Education Portal, Teach Away, LinkedIn"
  },
  {
    "id": "FLIS0113",
    "schoolname": "Raha International School",
    "country": "UAE",
    "city": "Abu Dhabi",
    "tespage": "https://www.tes.com/jobs/employer/raha-international-school-gardens-campus-1070644",
    "tesnumber": "1070644",
    "schooljp": "https://www.taaleem.ae/careers",
    "agency": "Taaleem Careers Portal, Teach Away, Gulf Talent"
  },
  {
    "id": "FLIS0114",
    "schoolname": "Dubai College",
    "country": "UAE",
    "city": "Dubai",
    "tespage": "https://www.tes.com/jobs/employer/dubai-college-uae-1057286",
    "tesnumber": "1057286",
    "schooljp": "https://www.dubaicollege.org/recruitment",
    "agency": "eTeach, LinkedIn, Gulf Talent"
  },
  {
    "id": "FLIS0115",
    "schoolname": "Dubai British School",
    "country": "UAE",
    "city": "Dubai   Jumeira",
    "tespage": "https://www.tes.com/jobs/employer/dubai-british-school-jumeira-1265177",
    "tesnumber": "1265177",
    "agency": "Taaleem Careers Portal, Teach Away, Gulf Talent"
  },
  {
    "id": "FLIS0115",
    "schoolname": "Dubai British School",
    "country": "UAE",
    "city": "Dubai  Jumeirah Park",
    "tespage": "https://www.tes.com/jobs/employer/dubai-british-school-jumeirah-park-1081671",
    "tesnumber": "1081671",
    "agency": "Taaleem Careers Portal, Teach Away, Gulf Talent"
  },
  {
    "id": "FLIS0115",
    "schoolname": "Dubai British School",
    "country": "UAE",
    "city": "Dubai Mira",
    "tespage": "https://www.tes.com/jobs/employer/dubai-british-school-mira-1255316",
    "tesnumber": "1255316",
    "agency": "Taaleem Careers Portal, Teach Away, Gulf Talent"
  },
  {
    "id": "FLIS0115",
    "schoolname": "Dubai British School",
    "country": "UAE",
    "city": "Dubai Emirates Hills",
    "tespage": "https://www.tes.com/jobs/employer/dubai-british-school-emirates-hills-1057169",
    "tesnumber": "1057169",
    "agency": "Taaleem Careers Portal, Teach Away, Gulf Talent"
  },
  {
    "id": "FLIS0116",
    "schoolname": "Sunmarke School",
    "country": "UAE",
    "city": "Dubai",
    "tespage": "https://www.tes.com/jobs/employer/sunmarke-school-1077790",
    "tesnumber": "1077790",
    "schooljp": "https://sunmarke.com/contact-us/work-with-us/",
    "agency": "Fortes Education Portal, Teacher Horizons"
  },
  {
    "id": "FLIS0117",
    "schoolname": "Nord Anglia International School Dubai",
    "country": "UAE",
    "city": "Dubai",
    "tespage": "https://www.tes.com/jobs/employer/nord-anglia-international-school-dubai-1067785",
    "tesnumber": "1067785",
    "schooljp": "https://www.nordangliaeducation.com/nas-dubai/careers",
    "agency": "Nord Anglia Career Portal, Teach Away"
  },
  {
    "id": "FLIS0118",
    "schoolname": "Dubai English Speaking School",
    "country": "UAE",
    "city": "Dubai",
    "tespage": "https://www.tes.com/jobs/employer/dubai-english-speaking-school-oud-metha-1059044",
    "tesnumber": "1081671",
    "schooljp": "https://dess.sch.ae/work-at-dess",
    "agency": "Teacher Horizons, Gulf Talent, LinkedIn"
  },
  {
    "id": "FLIS0118",
    "schoolname": "Dubai English Speaking School",
    "country": "UAE",
    "city": "Dubai",
    "tespage": "https://www.tes.com/jobs/employer/dubai-english-speaking-school-college-1057174",
    "tesnumber": "1057174",
    "schooljp": "https://dess.sch.ae/work-at-dess",
    "agency": "Teacher Horizons, Gulf Talent, LinkedIn"
  },
  {
    "id": "FLIS0118",
    "schoolname": "Dubai English Speaking School",
    "country": "UAE",
    "city": "Dubai Academic City",
    "tespage": "https://www.tes.com/jobs/employer/dubai-english-speaking-school-academic-city-1271801",
    "tesnumber": "1271801",
    "schooljp": "https://dess.sch.ae/work-at-dess",
    "agency": "Teacher Horizons, Gulf Talent, LinkedIn"
  },
  {
    "id": "FLIS0119",
    "schoolname": "Hartland International School",
    "country": "UAE",
    "city": "Dubai",
    "tespage": "https://www.tes.com/jobs/employer/hartland-international-school-1072119",
    "tesnumber": "1072119",
    "schooljp": "https://www.hartlandinternational.com/current-vacancies/",
    "agency": "Teacher Horizons, LinkedIn"
  },
  {
    "id": "FLIS0120",
    "schoolname": "Kent College Dubai",
    "country": "UAE",
    "city": "Dubai",
    "tespage": "https://www.tes.com/jobs/employer/kent-college-dubai-1081286",
    "tesnumber": "1081286",
    "schooljp": "https://www.eteach.com/careers/kentcollege/",
    "agency": "eTeach, LinkedIn"
  },
  {
    "id": "FLIS0121",
    "schoolname": "Repton School Dubai",
    "country": "UAE",
    "city": "Dubai",
    "tespage": "https://www.tes.com/jobs/employer/repton-school-dubai-1057021",
    "tesnumber": "1057021",
    "schooljp": "https://www.reptondubai.org/careers/",
    "agency": "Excelsior Schools Portal, Teach Away, LinkedIn"
  },
  {
    "id": "FLIS0122",
    "schoolname": "Horizon International School",
    "country": "UAE",
    "city": "Dubai",
    "tespage": "https://www.tes.com/jobs/employer/horizon-international-school-1060959",
    "tesnumber": "1060959",
    "schooljp": "https://hisdubai.ae/careers/",
    "agency": "Al Najah Education Portal, Teacher Horizons"
  },
  {
    "id": "FLIS0123",
    "schoolname": "Compass International School Doha",
    "country": "Qatar",
    "city": "Doha",
    "tespage": "https://www.tes.com/jobs/employer/compass-international-school-doha-1276094",
    "tesnumber": "1276094",
    "schooljp": "https://www.nordangliaeducation.com/cis-doha/careers",
    "agency": "Nord Anglia Career Portal, Teach Away"
  },
  {
    "id": "FLIS0124",
    "schoolname": "Etqan Global Academy",
    "country": "Qatar",
    "city": "Doha",
    "schooljp": "https://www.nordangliaeducation.com/careers",
    "agency": "Nord Anglia Career Portal"
  },
  {
    "id": "FLIS0125",
    "schoolname": "British School of Kuwait",
    "country": "Kuwait",
    "city": "Kuwait City",
    "tespage": "https://www.tes.com/jobs/employer/the-british-school-of-kuwait-bsk-1057365",
    "tesnumber": "1057365",
    "schooljp": "https://www.bsk.edu.kw/careers",
    "agency": "Nord Anglia Career Portal, Teach Away"
  },
  {
    "id": "FLIS0126",
    "schoolname": "British School Muscat",
    "country": "Oman",
    "city": "Muscat",
    "tespage": "https://www.tes.com/jobs/employer/british-school-muscat-1055453",
    "tesnumber": "1055453",
    "schooljp": "https://www.britishschoolmuscat.com/work-for-us/vacancies",
    "agency": "Teacher Horizons, LinkedIn"
  },
  {
    "id": "FLIS0127",
    "schoolname": "American International School of Muscat",
    "country": "Oman",
    "city": "Muscat",
    "schooljp": "https://www.taism.com/employment",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0128",
    "schoolname": "British School of Bahrain",
    "country": "Bahrain",
    "city": "Hamala",
    "tespage": "https://www.tes.com/jobs/employer/british-school-of-bahrain-1057331",
    "tesnumber": "1057331",
    "schooljp": "https://www.britishschoolbahrain.com/careers",
    "agency": "Inspired Education Portal, Teach Away, LinkedIn"
  },
  {
    "id": "FLIS0129",
    "schoolname": "British International School Cairo",
    "country": "Egypt",
    "city": "Cairo",
    "tespage": "https://www.tes.com/jobs/employer/the-british-international-school-cairo-1060109",
    "tesnumber": "1060109",
    "schooljp": "https://www.bisc.edu.eg/careers",
    "agency": "Search Associates, Teacher Horizons, LinkedIn"
  },
  {
    "id": "FLIS0130",
    "schoolname": "Malvern College Egypt",
    "country": "Egypt",
    "city": "Cairo",
    "tespage": "https://www.tes.com/jobs/employer/malvern-college-egypt-1077433",
    "tesnumber": "1077433",
    "schooljp": "https://malverncollege.edu.eg/careers/",
    "agency": "Malvern College Int'l Portal, Teach Away"
  },
  {
    "id": "FLIS0131",
    "schoolname": "El Alsson School",
    "country": "Egypt",
    "city": "Cairo",
    "tespage": "https://www.tes.com/jobs/employer/el-alsson-british-and-american-international-school-american-section-1056384",
    "tesnumber": "1056384",
    "schooljp": "https://www.alsson.com/careers/",
    "agency": "Teacher Horizons, LinkedIn"
  },
  {
    "id": "FLIS0132",
    "schoolname": "International School of Kenya",
    "country": "Kenya",
    "city": "Nairobi",
    "schooljp": "https://www.isk.ac.ke/employment",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0133",
    "schoolname": "Brookhouse School",
    "country": "Kenya",
    "city": "Nairobi",
    "tespage": "https://www.tes.com/jobs/employer/brookhouse-schools-1057702",
    "tesnumber": "1057702",
    "schooljp": "https://www.brookhouse.ac.ke/careers",
    "agency": "Inspired Education Group Portal, LinkedIn"
  },
  {
    "id": "FLIS0134",
    "schoolname": "Braeburn Garden Estate",
    "country": "Kenya",
    "city": "Nairobi",
    "tespage": "https://www.tes.com/jobs/employer/braeburn-garden-estate-school-1065558",
    "tesnumber": "1065558",
    "schooljp": "https://gardenestate.braeburn.com/careers",
    "agency": "Braeburn Schools Group Portal, LinkedIn"
  },
  {
    "id": "FLIS0135",
    "schoolname": "International School of Cape Town",
    "country": "South Africa",
    "city": "Cape Town",
    "schooljp": "https://www.isct.co.za/careers",
    "agency": "Inspired Education Group Portal, LinkedIn"
  },
  {
    "id": "FLIS0136",
    "schoolname": "American International School of Johannesburg",
    "country": "South Africa",
    "city": "Joburg",
    "schooljp": "https://www.aisj-jhb.com/employment",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0137",
    "schoolname": "American International School of Cape Town",
    "country": "South Africa",
    "city": "Cape Town",
    "schooljp": "https://www.aisct.org/employment/",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0138",
    "schoolname": "British International School Hanoi",
    "country": "Vietnam",
    "city": "Hanoi",
    "tespage": "https://www.tes.com/jobs/employer/british-international-school-hanoi-1066631",
    "tesnumber": "1066631",
    "schooljp": "https://www.nordangliaeducation.com/bis-hanoi/careers",
    "agency": "Nord Anglia Career Portal, Teach Away"
  },
  {
    "id": "FLIS0139",
    "schoolname": "British International School Ho Chi Minh City",
    "country": "Vietnam",
    "city": "HCMC",
    "tespage": "https://www.tes.com/jobs/employer/british-international-school-ho-chi-minh-city-1252077",
    "tesnumber": "1252077",
    "schooljp": "https://www.nordangliaeducation.com/bis-hcmc/careers",
    "agency": "Nord Anglia Career Portal, Teach Away"
  },
  {
    "id": "FLIS0140",
    "schoolname": "UNIS Hanoi",
    "country": "Vietnam",
    "city": "Hanoi",
    "tespage": "https://www.tes.com/jobs/employer/united-nations-international-school-of-hanoi-1061898",
    "tesnumber": "1061898",
    "schooljp": "https://www.unishanoi.org/employment",
    "agency": "Search Associates, Schrole, ISS"
  },
  {
    "id": "FLIS0141",
    "schoolname": "International School Ho Chi Minh City",
    "country": "Vietnam",
    "city": "HCMC",
    "tespage": "https://www.tes.com/jobs/employer/international-school-ho-chi-minh-city-ishcmc-1057599",
    "tesnumber": "1057599",
    "schooljp": "https://www.ishcmc.com/careers",
    "agency": "Cognita Careers Portal, Search Associates"
  },
  {
    "id": "FLIS0142",
    "schoolname": "Alice Smith School",
    "country": "Malaysia",
    "city": "Kuala Lumpur",
    "tespage": "https://www.tes.com/jobs/employer/the-alice-smith-school-secondary-1052973",
    "tesnumber": "1052973",
    "schooljp": "https://www.alice-smith.edu.my/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0143",
    "schoolname": "Marlborough College Malaysia",
    "country": "Malaysia",
    "city": "Johor",
    "tespage": "https://www.tes.com/jobs/employer/marlborough-college-malaysia-1065828",
    "tesnumber": "1065828",
    "schooljp": "https://www.marlboroughcollegemalaysia.org/about/careers/",
    "agency": "Marlborough College UK Portal, Search Associates"
  },
  {
    "id": "FLIS0144",
    "schoolname": "British International School Kuala Lumpur",
    "country": "Malaysia",
    "city": "KL",
    "tespage": "https://www.tes.com/jobs/employer/the-british-international-school-of-kuala-lumpur-1058039",
    "tesnumber": "1058039",
    "schooljp": "https://www.nordangliaeducation.com/bis-kl/careers",
    "agency": "Nord Anglia Career Portal, Teach Away"
  },
  {
    "id": "FLIS0145",
    "schoolname": "Garden International School",
    "country": "Malaysia",
    "city": "KL",
    "tespage": "https://www.tes.com/jobs/employer/garden-international-school-kuala-lumpur-1057218",
    "tesnumber": "1057218",
    "schooljp": "https://www.gardenschool.edu.my/careers/",
    "agency": "Taylor's Education Portal, Search Associates"
  },
  {
    "id": "FLIS0146",
    "schoolname": "Epsom College Malaysia",
    "country": "Malaysia",
    "city": "Seremban",
    "tespage": "https://www.tes.com/jobs/employer/epsom-college-malaysia-1061281",
    "tesnumber": "1061281",
    "schooljp": "https://www.epsomcollege.edu.my/careers/",
    "agency": "Epsom College UK Portal, LinkedIn"
  },
  {
    "id": "FLIS0147",
    "schoolname": "Mont'Kiara International School",
    "country": "Malaysia",
    "city": "KL",
    "tespage": "https://www.tes.com/jobs/employer/mont-kiara-international-school-1071798",
    "tesnumber": "1071798",
    "schooljp": "https://www.mkis.edu.my/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0148",
    "schoolname": "Shrewsbury International School Riverside",
    "country": "Thailand",
    "city": "Bangkok",
    "tespage": "https://www.tes.com/jobs/employer/shrewsbury-international-school-bangkok-riverside-1057793",
    "tesnumber": "1057793",
    "schooljp": "https://www.shrewsbury.ac.th/riverside/careers",
    "agency": "Search Associates, Schrole, LinkedIn"
  },
  {
    "id": "FLIS0149",
    "schoolname": "Bangkok Patana School",
    "country": "Thailand",
    "city": "Bangkok",
    "tespage": "https://www.tes.com/jobs/employer/bangkok-patana-school-1054899",
    "tesnumber": "1054899",
    "schooljp": "https://www.patana.ac.th/careers/",
    "agency": "Search Associates, Schrole, LinkedIn"
  },
  {
    "id": "FLIS0150",
    "schoolname": "St. Andrews International School Sukhumvit 107",
    "country": "Thailand",
    "city": "Bangkok",
    "tespage": "https://www.tes.com/jobs/employer/st-andrews-international-school-sukhumvit-107-1060428",
    "tesnumber": "1060428",
    "schooljp": "https://www.standrews107.com/careers",
    "agency": "Cognita Careers Portal, Search Associates"
  },
  {
    "id": "FLIS0151",
    "schoolname": "Brighton College Bangkok",
    "country": "Thailand",
    "city": "Bangkok",
    "tespage": "https://www.tes.com/jobs/employer/brighton-college-bangkok-krungthep-kreetha-1078368",
    "tesnumber": "1078368",
    "schooljp": "https://brightoncollege.ac.th/careers/",
    "agency": "Brighton College Int'l Portal, LinkedIn"
  },
  {
    "id": "FLIS0152",
    "schoolname": "King's College International School Bangkok",
    "country": "Thailand",
    "city": "Bangkok",
    "tespage": "https://www.tes.com/jobs/employer/king-s-college-international-school-bangkok-1176707",
    "tesnumber": "1176707",
    "schooljp": "https://www.kingsbangkok.ac.th/careers",
    "agency": "King's Wimbledon Portal, LinkedIn"
  },
  {
    "id": "FLIS0153",
    "schoolname": "Rugby School Thailand",
    "country": "Thailand",
    "city": "Chonburi",
    "tespage": "https://www.tes.com/jobs/employer/rugby-school-thailand-1085372",
    "tesnumber": "1085372",
    "schooljp": "https://www.rugbyschool.ac.th/careers/",
    "agency": "Rugby School UK Portal, LinkedIn"
  },
  {
    "id": "FLIS0154",
    "schoolname": "Wellington College International Bangkok",
    "country": "Thailand",
    "city": "Bangkok",
    "tespage": "https://www.tes.com/jobs/employer/wellington-college-international-bangkok-wcib-1161804",
    "tesnumber": "1161804",
    "schooljp": "https://www.wellingtoncollege.ac.th/careers",
    "agency": "Wellington College Int'l Portal, LinkedIn"
  },
  {
    "id": "FLIS0155",
    "schoolname": "International School Bangkok",
    "country": "Thailand",
    "city": "Bangkok",
    "schooljp": "https://www.isb.ac.th/careers/",
    "agency": "Search Associates, Schrole, ISS"
  },
  {
    "id": "FLIS0156",
    "schoolname": "UWC Thailand",
    "country": "Thailand",
    "city": "Phuket",
    "schooljp": "https://www.uwcthailand.ac.th/careers",
    "agency": "Search Associates, UWC Movement Portal"
  },
  {
    "id": "FLIS0157",
    "schoolname": "British School Jakarta",
    "country": "Indonesia",
    "city": "Jakarta",
    "tespage": "https://www.tes.com/jobs/employer/british-school-jakarta-1053515",
    "tesnumber": "1053515",
    "schooljp": "https://www.bsj.sch.id/careers",
    "agency": "Search Associates, Schrole, LinkedIn"
  },
  {
    "id": "FLIS0158",
    "schoolname": "Jakarta Intercultural School",
    "country": "Indonesia",
    "city": "Jakarta",
    "schooljp": "https://www.jisedu.or.id/careers",
    "agency": "Search Associates, Schrole, ISS"
  },
  {
    "id": "FLIS0159",
    "schoolname": "ACG School Jakarta",
    "country": "Indonesia",
    "city": "Jakarta",
    "schooljp": "https://jakarta.acgedu.com/careers/",
    "agency": "Inspired Education Group Portal, LinkedIn"
  },
  {
    "id": "FLIS0160",
    "schoolname": "Canggu Community School Bali",
    "country": "Indonesia",
    "city": "Bali",
    "schooljp": "https://www.ccsbali.com/careers",
    "agency": "Schrole, LinkedIn"
  },
  {
    "id": "FLIS0161",
    "schoolname": "British School Manila",
    "country": "Philippines",
    "city": "Manila",
    "tespage": "https://www.tes.com/jobs/employer/the-british-school-manila-1057671",
    "tesnumber": "1057671",
    "schooljp": "https://www.britishschoolmanila.org/careers",
    "agency": "Search Associates, Schrole, LinkedIn"
  },
  {
    "id": "FLIS0162",
    "schoolname": "International School Manila",
    "country": "Philippines",
    "city": "Manila",
    "schooljp": "https://www.ismanila.org/careers",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0163",
    "schoolname": "British School in Tokyo",
    "country": "Japan",
    "city": "Tokyo",
    "tespage": "https://www.tes.com/jobs/employer/the-british-school-in-tokyo-1057325",
    "tesnumber": "1057325",
    "schooljp": "https://www.bst.ac.jp/careers",
    "agency": "Search Associates, GaijinPot Jobs, LinkedIn"
  },
  {
    "id": "FLIS0164",
    "schoolname": "Malvern College Tokyo",
    "country": "Japan",
    "city": "Tokyo",
    "tespage": "https://www.tes.com/jobs/employer/malvern-college-tokyo-1262424",
    "tesnumber": "1262424",
    "schooljp": "https://www.malverncollegetokyo.jp/careers",
    "agency": "Malvern College Int'l Portal, LinkedIn"
  },
  {
    "id": "FLIS0165",
    "schoolname": "Rugby School Japan",
    "country": "Japan",
    "city": "Chiba",
    "tespage": "https://www.tes.com/jobs/employer/rugby-school-japan-1221682",
    "tesnumber": "1221682",
    "schooljp": "https://www.rugbyschooljapan.ed.jp/careers",
    "agency": "Rugby School UK Portal, GaijinPot Jobs, LinkedIn"
  },
  {
    "id": "FLIS0166",
    "schoolname": "Harrow International School Appi",
    "country": "Japan",
    "city": "Appi Kogen",
    "tespage": "https://www.tes.com/jobs/employer/harrow-international-school-appi-1219867",
    "tesnumber": "1219867",
    "schooljp": "https://www.harrowappi.jp/careers/",
    "agency": "AISL Harrow Group Portal, Search Associates"
  },
  {
    "id": "FLIS0167",
    "schoolname": "St. Maur International School",
    "country": "Japan",
    "city": "Yokohama",
    "schooljp": "https://www.stmaur.ac.jp/employment",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0168",
    "schoolname": "Yokohama International School",
    "country": "Japan",
    "city": "Yokohama",
    "tespage": "https://www.tes.com/jobs/employer/yokohama-international-school-1058204",
    "tesnumber": "1058204",
    "schooljp": "https://www.yis.ac.jp/careers",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0169",
    "schoolname": "Canadian Academy Kobe",
    "country": "Japan",
    "city": "Kobe",
    "schooljp": "https://www.canacademy.ac.jp/employment",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0170",
    "schoolname": "Seoul Foreign School",
    "country": "S. Korea",
    "city": "Seoul",
    "tespage": "https://www.tes.com/jobs/employer/seoul-foreign-school-1055417",
    "tesnumber": "1055417",
    "schooljp": "https://www.seoulforeign.org/careers",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0171",
    "schoolname": "Chadwick International",
    "country": "S. Korea",
    "city": "Songdo",
    "schooljp": "https://www.chadwickinternational.org/employment",
    "agency": "Search Associates, Schrole, LinkedIn"
  },
  {
    "id": "FLIS0172",
    "schoolname": "Branksome Hall Asia",
    "country": "S. Korea",
    "city": "Jeju",
    "schooljp": "https://www.branksome.asia/careers",
    "agency": "Schrole, LinkedIn"
  },
  {
    "id": "FLIS0173",
    "schoolname": "North London Collegiate School Jeju",
    "country": "S. Korea",
    "city": "Jeju",
    "schooljp": "https://www.nlcsjeju.co.kr/careers",
    "agency": "NLCS International Portal, LinkedIn"
  },
  {
    "id": "FLIS0174",
    "schoolname": "Concordia International School Shanghai",
    "country": "China",
    "city": "Shanghai",
    "schooljp": "https://www.concordiashanghai.org/employment",
    "agency": "Search Associates, ISS, LinkedIn"
  },
  {
    "id": "FLIS0175",
    "schoolname": "International School Beijing",
    "country": "China",
    "city": "Beijing",
    "schooljp": "https://www.isb.bj.edu.cn/careers",
    "agency": "Search Associates, Schrole, ISS"
  },
  {
    "id": "FLIS0176",
    "schoolname": "Western Academy of Beijing",
    "country": "China",
    "city": "Beijing",
    "schooljp": "https://www.wab.edu/careers",
    "agency": "Search Associates, Schrole, ISS"
  },
  {
    "id": "FLIS0177",
    "schoolname": "British International School Warsaw",
    "country": "Poland",
    "city": "Warsaw",
    "tespage": "https://www.tes.com/jobs/employer/the-british-school-warsaw-1057760",
    "tesnumber": "1057760",
    "schooljp": "https://www.nordangliaeducation.com/bis-warsaw/careers",
    "agency": "Nord Anglia Career Portal, Teacher Horizons"
  },
  {
    "id": "FLIS0178",
    "schoolname": "Akademeia High School",
    "country": "Poland",
    "city": "Warsaw",
    "tespage": "https://www.tes.com/jobs/employer/akademeia-high-school-1164028",
    "tesnumber": "1164028",
    "schooljp": "https://akademeia.edu.pl/en/careers/",
    "agency": "LinkedIn, Praca.pl"
  },
  {
    "id": "FLIS0179",
    "schoolname": "International School of Bucharest",
    "country": "Romania",
    "city": "Bucharest",
    "tespage": "https://www.tes.com/jobs/employer/international-school-of-bucharest-1057074",
    "tesnumber": "1057074",
    "schooljp": "https://www.isb.ro/careers/",
    "agency": "Lumina Educational Institutions Portal"
  },
  {
    "id": "FLIS0180",
    "schoolname": "Prague British International School",
    "country": "Czechia",
    "city": "Prague",
    "tespage": "https://www.tes.com/jobs/employer/prague-british-international-school-kamyk-1057016",
    "tesnumber": "1057016",
    "schooljp": "https://www.nordangliaeducation.com/pbis-prague/careers",
    "agency": "Nord Anglia Career Portal, Teacher Horizons"
  },
  {
    "id": "FLIS0181",
    "schoolname": "St. George's British International School Bilbao",
    "country": "Spain",
    "city": "Bilbao",
    "schooljp": "https://stgeorgeschool.es/en/careers/",
    "agency": "Globeducate Careers Portal, InfoJobs Spain"
  },
  {
    "id": "FLIS0182",
    "schoolname": "International School of Helsinki",
    "country": "Finland",
    "city": "Helsinki",
    "schooljp": "https://www.ishelsinki.fi/employment",
    "agency": "Search Associates, Opetus.fi"
  },
  {
    "id": "FLIS0183",
    "schoolname": "British School in Helsinki",
    "country": "Finland",
    "city": "Helsinki",
    "schooljp": "https://www.thebritishschool.fi/vacancies",
    "agency": "LinkedIn"
  },
  {
    "id": "FLIS0184",
    "schoolname": "Stockholm International School",
    "country": "Sweden",
    "city": "Stockholm",
    "schooljp": "https://www.intsch.se/careers",
    "agency": "Search Associates, Arbetsförmedlingen"
  },
  {
    "id": "FLIS0185",
    "schoolname": "British International School of Stockholm",
    "country": "Sweden",
    "city": "Stockholm",
    "tespage": "https://www.tes.com/jobs/employer/british-international-school-of-stockholm-ekeby-campus-1082172",
    "tesnumber": "1082172",
    "schooljp": "https://www.bisstockholm.se/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0186",
    "schoolname": "Copenhagen International School",
    "country": "Denmark",
    "city": "Copenhagen",
    "schooljp": "https://www.copenhageninternational.school/about/careers/",
    "agency": "Search Associates, Jobindex Denmark"
  },
  {
    "id": "FLIS0187",
    "schoolname": "Southbank International School",
    "country": "UK",
    "city": "London",
    "tespage": "https://www.tes.com/jobs/employer/southbank-international-school-hampstead-campus-1023050",
    "tesnumber": "1023050",
    "schooljp": "https://www.southbank.org/careers",
    "agency": "Cognita Careers Portal, LinkedIn"
  },
  {
    "id": "FLIS0188",
    "schoolname": "ACS Cobham International School",
    "country": "UK",
    "city": "Surrey",
    "tespage": "https://www.tes.com/jobs/employer/acs-cobham-international-school-1054365",
    "tesnumber": "1054365",
    "schooljp": "https://www.acs-schools.org/careers",
    "agency": "ACS International Schools Portal, LinkedIn"
  },
  {
    "id": "FLIS0189",
    "schoolname": "St. George's International School Luxembourg",
    "country": "Lux",
    "city": "Luxembourg",
    "tespage": "https://www.tes.com/jobs/employer/st-george-s-international-school-luxembourg-1058183",
    "tesnumber": "1058183",
    "schooljp": "https://www.st-georges.lu/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0190",
    "schoolname": "International School of Luxembourg",
    "country": "Lux",
    "city": "Luxembourg",
    "schooljp": "https://www.islux.lu/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0191",
    "schoolname": "St. John's International School Belgium",
    "country": "Belgium",
    "city": "Waterloo",
    "tespage": "https://www.tes.com/jobs/employer/st-john-s-international-school-1057076",
    "tesnumber": "1057076",
    "schooljp": "https://www.stjohns.be/careers",
    "agency": "Inspired Education Group Portal, Search Associates"
  },
  {
    "id": "FLIS0192",
    "schoolname": "International School of Nice",
    "country": "France",
    "city": "Nice",
    "tespage": "https://www.tes.com/jobs/employer/international-school-of-nice-isn-1059393",
    "tesnumber": "1059393",
    "schooljp": "https://www.isn-nice.com/join-the-team",
    "agency": "Globeducate Careers Portal, LinkedIn"
  },
  {
    "id": "FLIS0193",
    "schoolname": "Mougins School",
    "country": "France",
    "city": "Mougins",
    "tespage": "https://www.tes.com/jobs/employer/mougins-school-1055155",
    "tesnumber": "1055155",
    "schooljp": "https://mougins.britishinternationalschool.com/about/work-with-us",
    "agency": "Globeducate Careers Portal, LinkedIn"
  },
  {
    "id": "FLIS0194",
    "schoolname": "International School of Turin",
    "country": "Italy",
    "city": "Turin",
    "schooljp": "https://www.istorin.it/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0195",
    "schoolname": "International School of Genoa",
    "country": "Italy",
    "city": "Genoa",
    "schooljp": "https://www.isgenoa.it/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0196",
    "schoolname": "St. Paul's School Brazil",
    "country": "Brazil",
    "city": "Sao Paulo",
    "tespage": "https://www.tes.com/jobs/employer/st-paul-s-school-1057345",
    "tesnumber": "1057345",
    "schooljp": "https://www.stpauls.br/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0197",
    "schoolname": "British School Rio de Janeiro",
    "country": "Brazil",
    "city": "Rio",
    "tespage": "https://www.tes.com/jobs/employer/the-british-school-rio-de-janeiro-botafogo-campus-1059187",
    "tesnumber": "1059187",
    "schooljp": "https://www.britishschool.g12.br/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0198",
    "schoolname": "Graded School Sao Paulo",
    "country": "Brazil",
    "city": "Sao Paulo",
    "schooljp": "https://www.graded.br/employment",
    "agency": "Search Associates, ISS"
  },
  {
    "id": "FLIS0199",
    "schoolname": "Northlands School Argentina",
    "country": "Argentina",
    "city": "B. Aires",
    "schooljp": "https://www.northlands.edu.ar/work-with-us/",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0200",
    "schoolname": "Markham College Peru",
    "country": "Peru",
    "city": "Lima",
    "tespage": "https://www.tes.com/jobs/employer/markham-college-1057093",
    "tesnumber": "1057093",
    "schooljp": "https://www.markham.edu.pe/careers",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0201",
    "schoolname": "Sultans School",
    "country": "Oman",
    "city": "Muscat",
    "tespage": "https://www.tes.com/jobs/employer/the-sultan-s-school-1054897",
    "tesnumber": "1054897",
    "schooljp": "https://sultansschool.org/careers/",
    "agency": "Teacher Horizons, LinkedIn"
  },
  {
    "id": "FLIS0202",
    "schoolname": "Parklane International School",
    "country": "Czechia",
    "city": "Prague",
    "tespage": "https://www.tes.com/jobs/employer/park-lane-international-school-1071241",
    "tesnumber": "1071241",
    "schooljp": "https://www.parklane-is.com/careers",
    "agency": "Teacher Horizons, Prace.cz, LinkedIn"
  },
  {
    "id": "FLIS0203",
    "schoolname": "American British Academy",
    "country": "Oman",
    "city": "Muscat",
    "schooljp": "https://www.abaoman.org/community/careers",
    "agency": "Search Associates, Schrole, Teacher Horizons, CIS / ISS"
  }
];

function extractTesSlug(tespage?: string): string | null {
  if (!tespage) return null;
  const match = tespage.match(/\/jobs\/employer\/([^/?#]+)/i);
  return match ? match[1] : null;
}

async function bulkUpdateAllSchools() {
  const db = getAdminDb();
  console.log(`🚀 [BULK UPDATE] Updating ${rawSchools.length} school records in Firestore...\n`);

  let count = 0;
  let batch = db.batch();

  for (const s of rawSchools) {
    const tesSlug = extractTesSlug(s.tespage);
    const docRef = db.collection('schools').doc(s.id);

    const payload: any = {
      schoolname: s.schoolname,
      name: s.schoolname,
      country: s.country,
      city: s.city,
      tesOrganizationId: s.tesnumber || null,
      tesEmployerSlug: tesSlug || null,
      careersPageUrl: s.schooljp || null,
      website: s.schooljp || null,
      agency: s.agency || null,
      revalidationStatus: 'success',
      updatedAt: new Date().toISOString()
    };

    batch.set(docRef, payload, { merge: true });
    count++;

    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`  Committed batch up to item ${count}...`);
    }
  }

  await batch.commit();
  console.log(`\n🎉 BULK UPDATE COMPLETE! Successfully updated ${count} school documents in Firestore schools collection.`);
}

bulkUpdateAllSchools().catch(console.error);
