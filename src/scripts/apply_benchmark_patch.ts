import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

interface PatchItem {
  id?: string;
  name: string;
  currency: string;
  benchmark: number;
  category: 'VERIFIED_SCALE' | 'STRONG_MARKET_EVIDENCE' | 'MODELLED_ESTIMATE';
}

const rawTable = `
FLIS0098 | British International School Abu Dhabi | AED 16,500 | STRONG_MARKET_EVIDENCE
FLIS0099 | Cranleigh Abu Dhabi | AED 17,200 | STRONG_MARKET_EVIDENCE
FLIS0100 | Repton School Dubai | AED 16,800 | STRONG_MARKET_EVIDENCE
FLIS0101 | Brighton College Abu Dhabi | AED 16,500 | STRONG_MARKET_EVIDENCE
FLIS0102 | Dubai College | AED 21,500 | VERIFIED_SCALE
FLIS0103 | JESS Dubai | AED 18,000 | STRONG_MARKET_EVIDENCE
FLIS0104 | Dubai British School | AED 16,200 | MODELLED_ESTIMATE
FLIS0105 | Sunmarke School | AED 15,000 | MODELLED_ESTIMATE
FLIS0106 | Safa British School | AED 14,800 | MODELLED_ESTIMATE
FLIS0107 | Safa Community School | AED 15,200 | MODELLED_ESTIMATE
FLIS0108 | Hartland International School | AED 15,500 | MODELLED_ESTIMATE
FLIS0109 | Kings' School Dubai | AED 17,500 | STRONG_MARKET_EVIDENCE
FLIS0110 | Kings' School Al Barsha | AED 17,500 | STRONG_MARKET_EVIDENCE
FLIS0111 | Horizon International School | AED 14,500 | MODELLED_ESTIMATE
FLIS0112 | Horizon English School | AED 15,000 | MODELLED_ESTIMATE
FLIS0113 | Kent College Dubai | AED 15,500 | MODELLED_ESTIMATE
FLIS0114 | Nord Anglia International School Dubai | AED 16,800 | STRONG_MARKET_EVIDENCE
FLIS0188 | Brighton College Dubai | AED 16,200 | STRONG_MARKET_EVIDENCE
FLIS0318 | Dubai Schools Al Barsha | AED 14,000 | MODELLED_ESTIMATE
FLIS0319 | Dubai School Nad Al Sheba | AED 14,000 | MODELLED_ESTIMATE
FLIS0321 | Dubai Schools Al Khawaneej | AED 14,000 | MODELLED_ESTIMATE
FLIS0322 | Lycée Libanais Francophone Privé Meydan | AED 13,800 | MODELLED_ESTIMATE
FLIS0324 | Repton School Abu Dhabi | AED 16,000 | STRONG_MARKET_EVIDENCE
FLIS0325 | Repton Al Barsha | AED 16,200 | STRONG_MARKET_EVIDENCE
FLIS0326 | GEMS Wellington International School | AED 16,500 | STRONG_MARKET_EVIDENCE
FLIS0327 | GEMS Dubai American Academy | AED 17,000 | STRONG_MARKET_EVIDENCE
FLIS0328 | GEMS World Academy Dubai | AED 16,800 | STRONG_MARKET_EVIDENCE
FLIS0329 | GEMS Jumeirah Primary School | AED 16,000 | MODELLED_ESTIMATE
FLIS0330 | GEMS Wellington Academy Silicon Oasis | AED 15,500 | MODELLED_ESTIMATE
FLIS0331 | GEMS Wellington Academy Al Khail | AED 15,500 | MODELLED_ESTIMATE
FLIS0332 | GEMS Royal Dubai School | AED 15,200 | MODELLED_ESTIMATE
FLIS0333 | GEMS FirstPoint School | AED 14,500 | MODELLED_ESTIMATE
FLIS0334 | GEMS International School Al Khail | AED 15,200 | MODELLED_ESTIMATE
FLIS0335 | GEMS Modern Academy | AED 14,800 | MODELLED_ESTIMATE
FLIS0336 | GEMS Founders School Dubai | AED 13,000 | MODELLED_ESTIMATE
FLIS0337 | GEMS Founders School Al Mizhar | AED 13,500 | MODELLED_ESTIMATE
FLIS0338 | GEMS Metropole School Motor City | AED 14,200 | MODELLED_ESTIMATE
FLIS0339 | GEMS Metropole School Al Waha | AED 14,200 | MODELLED_ESTIMATE
FLIS0340 | GEMS Winchester School Dubai | AED 13,000 | MODELLED_ESTIMATE
FLIS0341 | GEMS Cambridge International Private School Sharjah | AED 12,800 | MODELLED_ESTIMATE
FLIS0342 | GEMS American Academy Abu Dhabi | AED 16,500 | STRONG_MARKET_EVIDENCE
FLIS0343 | GEMS World Academy Abu Dhabi | AED 16,200 | STRONG_MARKET_EVIDENCE
FLIS0344 | GEMS Cambridge International School Abu Dhabi | AED 13,500 | MODELLED_ESTIMATE
FLIS0345 | GEMS United Indian School Abu Dhabi | AED 10,500 | MODELLED_ESTIMATE
FLIS0346 | GEMS Winchester School Abu Dhabi | AED 12,500 | MODELLED_ESTIMATE
FLIS0347 | GEMS Founders School Masdar City | AED 13,500 | MODELLED_ESTIMATE
FLIS0348 | The British School Al Khubairat | AED 18,200 | STRONG_MARKET_EVIDENCE
FLIS0349 | American School of Dubai | AED 18,500 | STRONG_MARKET_EVIDENCE
FLIS0350 | American Community School of Abu Dhabi | AED 18,000 | STRONG_MARKET_EVIDENCE
FLIS0351 | Victory Heights Primary School | AED 15,500 | MODELLED_ESTIMATE
FLIS0352 | Deira International School | AED 16,000 | MODELLED_ESTIMATE
FLIS0353 | The Arbor School | AED 15,200 | MODELLED_ESTIMATE
FLIS0354 | Fairgreen International School | AED 15,000 | MODELLED_ESTIMATE
FLIS0355 | The Aquila School | AED 14,800 | MODELLED_ESTIMATE
FLIS0356 | Durham School Dubai | AED 15,500 | MODELLED_ESTIMATE
FLIS0357 | Dwight School Dubai | AED 15,200 | MODELLED_ESTIMATE
FLIS0358 | Collegiate International School | AED 14,800 | MODELLED_ESTIMATE
FLIS0359 | Raffles World Academy | AED 15,000 | MODELLED_ESTIMATE
FLIS0360 | Raffles International School | AED 14,800 | MODELLED_ESTIMATE
FLIS0361 | Dove Green Private School | AED 14,000 | MODELLED_ESTIMATE
FLIS0362 | Emirates International School Jumeirah | AED 15,500 | MODELLED_ESTIMATE
FLIS0363 | Emirates International School Meadows | AED 15,500 | MODELLED_ESTIMATE
FLIS0364 | School of Research Science | AED 14,500 | MODELLED_ESTIMATE
FLIS0365 | Dar Al Marefa Private School | AED 13,800 | MODELLED_ESTIMATE
FLIS0366 | Yasmina British Academy | AED 16,200 | STRONG_MARKET_EVIDENCE
FLIS0367 | Al Bateen Academy | AED 15,800 | STRONG_MARKET_EVIDENCE
FLIS0368 | Al Mamoura Academy | AED 15,500 | MODELLED_ESTIMATE
FLIS0369 | Brighton College Al Ain | AED 15,000 | STRONG_MARKET_EVIDENCE
FLIS0395 | Amity International School Abu Dhabi | AED 15,200 | MODELLED_ESTIMATE
FLIS0418 | Dubai British School Jumeira | AED 16,200 | MODELLED_ESTIMATE
FLIS0419 | Dubai British School Jumeirah Park | AED 16,200 | MODELLED_ESTIMATE
FLIS0420 | Dubai British School Mira | AED 15,800 | MODELLED_ESTIMATE
FLIS0423 | Jumeira Baccalaureate School | AED 15,800 | STRONG_MARKET_EVIDENCE
FLIS0094 | British International School Riyadh | SAR 19,500 | STRONG_MARKET_EVIDENCE
FLIS0095 | British International School Jeddah | SAR 15,800 | STRONG_MARKET_EVIDENCE
FLIS0096 | American International School Riyadh | SAR 17,000 | STRONG_MARKET_EVIDENCE
FLIS0097 | American International School Jeddah | SAR 16,000 | STRONG_MARKET_EVIDENCE
FLIS0281 | Downe House Riyadh | SAR 16,200 | MODELLED_ESTIMATE
FLIS0282 | King's College Riyadh | SAR 16,500 | STRONG_MARKET_EVIDENCE
FLIS0283 | Reigate Grammar School Riyadh | SAR 15,800 | MODELLED_ESTIMATE
FLIS0284 | Aldenham Prep School Riyadh | SAR 15,500 | MODELLED_ESTIMATE
FLIS0285 | Beech Hall School Riyadh | SAR 15,200 | MODELLED_ESTIMATE
FLIS0286 | One World International School Riyadh | SAR 14,800 | MODELLED_ESTIMATE
FLIS0287 | SEK International School Riyadh | SAR 15,000 | MODELLED_ESTIMATE
FLIS0377 | Dhahran British Grammar School | SAR 16,000 | STRONG_MARKET_EVIDENCE
FLIS0378 | International Programs School Al Khobar | SAR 14,500 | MODELLED_ESTIMATE
FLIS0379 | Jeddah Prep and Grammar School | SAR 14,800 | MODELLED_ESTIMATE
FLIS0380 | British International School Al Khobar | SAR 16,000 | STRONG_MARKET_EVIDENCE
FLIS0089 | Doha British School | QAR 14,500 | STRONG_MARKET_EVIDENCE
FLIS0090 | Compass International School Doha | QAR 15,000 | MODELLED_ESTIMATE
FLIS0091 | American School of Doha | QAR 16,800 | STRONG_MARKET_EVIDENCE
FLIS0092 | Doha College | QAR 16,200 | STRONG_MARKET_EVIDENCE
FLIS0093 | Sherborne Qatar | QAR 14,800 | STRONG_MARKET_EVIDENCE
FLIS0373 | King's College Doha | QAR 15,200 | MODELLED_ESTIMATE
FLIS0374 | Oryx International School | QAR 14,500 | MODELLED_ESTIMATE
FLIS0375 | Qatar Academy | QAR 16,000 | STRONG_MARKET_EVIDENCE
FLIS0376 | Swiss International School Qatar | QAR 14,800 | MODELLED_ESTIMATE
FLIS0117 | British School of Kuwait | KWD 1,150 | STRONG_MARKET_EVIDENCE
FLIS0118 | American School of Kuwait | KWD 1,250 | STRONG_MARKET_EVIDENCE
FLIS0119 | American International School Kuwait | KWD 1,200 | STRONG_MARKET_EVIDENCE
FLIS0120 | Universal American School Kuwait | KWD 1,100 | MODELLED_ESTIMATE
FLIS0370 | New English School Kuwait | KWD 1,120 | MODELLED_ESTIMATE
FLIS0371 | Gulf English School Kuwait | KWD 1,080 | MODELLED_ESTIMATE
FLIS0391 | English School Kuwait | KWD 1,150 | MODELLED_ESTIMATE
FLIS0392 | Kuwait English School | KWD 1,100 | MODELLED_ESTIMATE
FLIS0180 | St Christopher's Bahrain | BHD 1,450 | STRONG_MARKET_EVIDENCE
FLIS0181 | British School of Bahrain | BHD 1,350 | STRONG_MARKET_EVIDENCE
FLIS0372 | Bahrain School | BHD 1,300 | MODELLED_ESTIMATE
FLIS0390 | Riffa Views International School | BHD 1,380 | MODELLED_ESTIMATE
FLIS0421 | St Christopher's Bahrain Senior | BHD 1,450 | STRONG_MARKET_EVIDENCE
FLIS0422 | St Christopher's Bahrain Primary | BHD 1,450 | STRONG_MARKET_EVIDENCE
FLIS0115 | British School Muscat | OMR 1,450 | STRONG_MARKET_EVIDENCE
FLIS0116 | American International School Muscat | OMR 1,550 | STRONG_MARKET_EVIDENCE
FLIS0187 | Sultan's School | OMR 1,300 | MODELLED_ESTIMATE
FLIS0189 | ABA Oman | OMR 1,400 | STRONG_MARKET_EVIDENCE
FLIS0006 | Amman Academy | JOD 1,600 | MODELLED_ESTIMATE
FLIS0299 | King's Academy | USD 3,800 | STRONG_MARKET_EVIDENCE
FLIS0300 | American Community School Amman | USD 3,600 | STRONG_MARKET_EVIDENCE
FLIS0301 | American Community School Beirut | USD 3,500 | STRONG_MARKET_EVIDENCE
FLIS0302 | International College Beirut | USD 3,200 | STRONG_MARKET_EVIDENCE
FLIS0061 | British School of Brussels | EUR 3,200 | VERIFIED_SCALE
FLIS0073 | International School of Brussels | EUR 3,350 | STRONG_MARKET_EVIDENCE
FLIS0177 | St John's International School | EUR 2,950 | STRONG_MARKET_EVIDENCE
FLIS0017 | Frankfurt International School | EUR 3,480 | VERIFIED_SCALE
FLIS0062 | Munich International School | EUR 3,300 | STRONG_MARKET_EVIDENCE
FLIS0072 | Berlin Brandenburg International | EUR 2,850 | STRONG_MARKET_EVIDENCE
FLIS0080 | Bavarian International School | EUR 3,150 | STRONG_MARKET_EVIDENCE
FLIS0085 | International School Düsseldorf | EUR 3,100 | STRONG_MARKET_EVIDENCE
FLIS0389 | Dresden International School | EUR 2,750 | MODELLED_ESTIMATE
FLIS0415 | St George's Munich | EUR 3,100 | STRONG_MARKET_EVIDENCE
FLIS0071 | American International School Vienna | EUR 2,850 | STRONG_MARKET_EVIDENCE
FLIS0088 | Danube International School Vienna | EUR 2,700 | STRONG_MARKET_EVIDENCE
FLIS0190 | St Gilgen International School | EUR 2,800 | STRONG_MARKET_EVIDENCE
FLIS0198 | Vienna International School | EUR 2,950 | STRONG_MARKET_EVIDENCE
FLIS0023 | International School of Geneva | CHF 6,800 | STRONG_MARKET_EVIDENCE
FLIS0051 | Zurich International School | CHF 5,850 | STRONG_MARKET_EVIDENCE
FLIS0064 | TASIS Switzerland | CHF 6,200 | STRONG_MARKET_EVIDENCE
FLIS0065 | Le Rosey | CHF 7,200 | STRONG_MARKET_EVIDENCE
FLIS0070 | Beau Soleil | CHF 6,800 | STRONG_MARKET_EVIDENCE
FLIS0178 | Inter-Community School Zurich | CHF 6,700 | STRONG_MARKET_EVIDENCE
FLIS0179 | Institut Le Rosey | CHF 7,200 | STRONG_MARKET_EVIDENCE
FLIS0394 | IS Zug & Luzern | CHF 6,800 | STRONG_MARKET_EVIDENCE
FLIS0416 | Aiglon | CHF 6,900 | STRONG_MARKET_EVIDENCE
FLIS0011 | British School of Paris | EUR 2,650 | STRONG_MARKET_EVIDENCE
FLIS0058 | International School of Paris | EUR 2,750 | STRONG_MARKET_EVIDENCE
FLIS0074 | Mougins School | EUR 2,400 | MODELLED_ESTIMATE
FLIS0086 | Marymount Paris | EUR 2,550 | STRONG_MARKET_EVIDENCE
FLIS0387 | Ermitage | EUR 2,350 | MODELLED_ESTIMATE
FLIS0388 | American School of Paris | EUR 2,850 | STRONG_MARKET_EVIDENCE
FLIS0039 | IS Monaco | EUR 3,100 | STRONG_MARKET_EVIDENCE
FLIS0175 | St George's Luxembourg | EUR 3,600 | STRONG_MARKET_EVIDENCE
FLIS0176 | International School of Luxembourg | EUR 3,650 | VERIFIED_SCALE
FLIS0068 | IS Amsterdam | EUR 2,900 | STRONG_MARKET_EVIDENCE
FLIS0265 | American School of The Hague | EUR 3,250 | STRONG_MARKET_EVIDENCE
FLIS0273 | International School of The Hague | EUR 2,950 | STRONG_MARKET_EVIDENCE
FLIS0274 | Rotterdam International Secondary | EUR 2,850 | MODELLED_ESTIMATE
FLIS0275 | International School Eindhoven | EUR 2,800 | MODELLED_ESTIMATE
FLIS0019 | Dulwich College Beijing | RMB 27,200 | STRONG_MARKET_EVIDENCE
FLIS0020 | Dulwich Shanghai Pudong | RMB 29,000 | STRONG_MARKET_EVIDENCE
FLIS0021 | Dulwich Shanghai Puxi | RMB 28,500 | STRONG_MARKET_EVIDENCE
FLIS0022 | Dulwich Suzhou | RMB 26,000 | STRONG_MARKET_EVIDENCE
FLIS0030 | Western Academy Beijing | RMB 29,500 | STRONG_MARKET_EVIDENCE
FLIS0031 | Shanghai American School | USD 4,200 | STRONG_MARKET_EVIDENCE
FLIS0032 | International School Beijing | RMB 29,800 | VERIFIED_SCALE
FLIS0234 | Malvern College HK | HKD 45,000 | STRONG_MARKET_EVIDENCE
FLIS0235 | Malvern Pre-School Island West | HKD 38,000 | MODELLED_ESTIMATE
FLIS0236 | Malvern Pre-School Coronation Circle | HKD 38,000 | MODELLED_ESTIMATE
FLIS0381 | HKIS | HKD 43,500 | STRONG_MARKET_EVIDENCE
FLIS0382 | Kellett | HKD 48,000 | STRONG_MARKET_EVIDENCE
FLIS0383 | Chinese International School | HKD 50,000 | STRONG_MARKET_EVIDENCE
FLIS0456 | Discovery Bay International School | HKD 42,000 | STRONG_MARKET_EVIDENCE
FLIS0010 | Bangkok Patana | THB 125,000 | STRONG_MARKET_EVIDENCE
FLIS0041 | NIST | THB 112,000 | VERIFIED_SCALE
FLIS0042 | IS Bangkok | USD 3,800 | STRONG_MARKET_EVIDENCE
FLIS0043 | Harrow Bangkok | THB 120,000 | STRONG_MARKET_EVIDENCE
FLIS0044 | Shrewsbury Bangkok | THB 125,000 | STRONG_MARKET_EVIDENCE
FLIS0045 | King's Bangkok | THB 120,000 | STRONG_MARKET_EVIDENCE
FLIS0046 | Rugby Thailand | THB 115,000 | STRONG_MARKET_EVIDENCE
FLIS0437 | Wellington Bangkok | THB 120,000 | STRONG_MARKET_EVIDENCE
FLIS0144 | British School Jakarta | USD 3,200 | STRONG_MARKET_EVIDENCE
FLIS0145 | Jakarta Intercultural School | USD 3,800 | STRONG_MARKET_EVIDENCE
FLIS0146 | ACG Jakarta | USD 2,600 | MODELLED_ESTIMATE
FLIS0147 | Canggu Community School | USD 2,400 | MODELLED_ESTIMATE
FLIS0148 | British School Manila | USD 3,100 | STRONG_MARKET_EVIDENCE
FLIS0149 | International School Manila | USD 3,600 | STRONG_MARKET_EVIDENCE
FLIS0435 | Jerudong International | BND 4,200 | STRONG_MARKET_EVIDENCE
FLIS0436 | International School Brunei | BND 3,800 | STRONG_MARKET_EVIDENCE
FLIS0153 | Seoul Foreign School | KRW 4,600,000 | STRONG_MARKET_EVIDENCE
FLIS0154 | Korea International School | KRW 4,000,000 | STRONG_MARKET_EVIDENCE
FLIS0155 | Chadwick International | KRW 4,500,000 | STRONG_MARKET_EVIDENCE
FLIS0156 | Dulwich College Seoul | KRW 4,300,000 | STRONG_MARKET_EVIDENCE
FLIS0259 | Taipei American School | TWD 125,000 | STRONG_MARKET_EVIDENCE
FLIS0288 | Taipei European School | TWD 115,000 | STRONG_MARKET_EVIDENCE
FLIS0182 | St Paul's Brazil | BRL 16,500 | STRONG_MARKET_EVIDENCE
FLIS0183 | British School Rio | BRL 15,000 | STRONG_MARKET_EVIDENCE
FLIS0184 | Graded São Paulo | USD 3,500 | STRONG_MARKET_EVIDENCE
FLIS0240 | Malvern São Paulo | BRL 15,500 | MODELLED_ESTIMATE
FLIS0451 | British School Rio | BRL 15,000 | STRONG_MARKET_EVIDENCE
FLIS0454 | St Francis' College | BRL 14,000 | MODELLED_ESTIMATE
FLIS0263 | American School Foundation Mexico | MXN 48,000 | STRONG_MARKET_EVIDENCE
FLIS0266 | ASF Monterrey | MXN 45,000 | STRONG_MARKET_EVIDENCE
FLIS0267 | Greengates | MXN 42,000 | STRONG_MARKET_EVIDENCE
FLIS0449 | Greengates | MXN 42,000 | STRONG_MARKET_EVIDENCE
FLIS0268 | AS Guadalajara | MXN 40,000 | MODELLED_ESTIMATE
FLIS0269 | JFK Querétaro | MXN 38,000 | MODELLED_ESTIMATE
FLIS0270 | CNG Bogotá | COP 9,500,000 | STRONG_MARKET_EVIDENCE
FLIS0271 | Colegio Bolívar | COP 9,000,000 | STRONG_MARKET_EVIDENCE
FLIS0272 | English School Bogotá | COP 8,500,000 | STRONG_MARKET_EVIDENCE
FLIS0445 | Grange Chile | CLP 3,400,000 | STRONG_MARKET_EVIDENCE
FLIS0446 | Craighouse | CLP 3,599,000 | STRONG_MARKET_EVIDENCE
FLIS0185 | Northlands | USD 2,200 | MODELLED_ESTIMATE
FLIS0186 | Markham College | USD 2,800 | STRONG_MARKET_EVIDENCE
FLIS0447 | British Schools Montevideo | UYU 110,000 | MODELLED_ESTIMATE
FLIS0450 | British School Caracas | USD 2,500 | MODELLED_ESTIMATE
FLIS0202 | UWC Costa Rica | USD 2,200 | STRONG_MARKET_EVIDENCE
FLIS0448 | British School Costa Rica | USD 2,400 | MODELLED_ESTIMATE
FLIS0121 | International School Kenya | USD 3,200 | STRONG_MARKET_EVIDENCE
FLIS0122 | Brookhouse | KES 320,000 | STRONG_MARKET_EVIDENCE
FLIS0123 | Braeburn | KES 280,000 | STRONG_MARKET_EVIDENCE
FLIS0452 | St Andrew's Turi | KES 310,000 | STRONG_MARKET_EVIDENCE
FLIS0453 | Peponi | KES 300,000 | STRONG_MARKET_EVIDENCE
FLIS0124 | International School Cape Town | ZAR 38,000 | STRONG_MARKET_EVIDENCE
FLIS0125 | AIS Johannesburg | USD 3,100 | STRONG_MARKET_EVIDENCE
FLIS0126 | AIS Cape Town | USD 2,900 | STRONG_MARKET_EVIDENCE
FLIS0462 | BIS Lagos | USD 2,600 | MODELLED_ESTIMATE
FLIS0014 | European Azerbaijan | USD 2,400 | MODELLED_ESTIMATE
FLIS0221 | Azerbaijan British College | USD 2,500 | MODELLED_ESTIMATE
FLIS0223 | Baku Oxford | USD 2,200 | MODELLED_ESTIMATE
FLIS0225 | Modern Educational Complex Baku | USD 2,100 | MODELLED_ESTIMATE
FLIS0264 | Haileybury Almaty | USD 3,200 | STRONG_MARKET_EVIDENCE
FLIS0428 | Haileybury Almaty | USD 3,200 | STRONG_MARKET_EVIDENCE
FLIS0290 | Haileybury Astana | USD 3,200 | STRONG_MARKET_EVIDENCE
FLIS0429 | Haileybury Astana | USD 3,200 | STRONG_MARKET_EVIDENCE
FLIS0430 | British School Tashkent | USD 2,600 | MODELLED_ESTIMATE
FLIS0459 | BIST Tbilisi | USD 2,200 | MODELLED_ESTIMATE
FLIS0289 | IICS Istanbul | USD 3,100 | STRONG_MARKET_EVIDENCE
FLIS0173 | Southbank IS | GBP 2,600 | STRONG_MARKET_EVIDENCE
FLIS0174 | ACS Cobham | GBP 2,750 | STRONG_MARKET_EVIDENCE
FLIS0413 | TASIS England | GBP 2,700 | STRONG_MARKET_EVIDENCE
FLIS0075 | IS Hellerup | DKK 24,000 | MODELLED_ESTIMATE
FLIS0172 | Copenhagen IS | DKK 26,000 | STRONG_MARKET_EVIDENCE
FLIS0081 | Oslo International | NOK 32,000 | STRONG_MARKET_EVIDENCE
FLIS0256 | IS Stavanger | NOK 31,000 | STRONG_MARKET_EVIDENCE
FLIS0168 | Helsinki IS | EUR 2,600 | STRONG_MARKET_EVIDENCE
FLIS0169 | Helsinki IS | EUR 2,600 | STRONG_MARKET_EVIDENCE
FLIS0170 | Stockholm IS | SEK 28,000 | STRONG_MARKET_EVIDENCE
FLIS0171 | Stockholm IS | SEK 28,000 | STRONG_MARKET_EVIDENCE
`;

function normalize(str: string) {
  return str.toLowerCase()
    .replace(/\bthe\b/g, '')
    .replace(/\bint'l\b/g, 'international')
    .replace(/\bis\b/g, 'international school')
    .replace(/\bbis\b/g, 'british international school')
    .replace(/\bcollege\b/g, '')
    .replace(/\bschool\b/g, '')
    .replace(/\bacademy\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

const aliases: Record<string, string> = {
  'hkis': 'hong kong international school',
  'tasis england': 'tasis the american school in england',
  'cng bogotá': 'colegio nueva granada',
  'grange chile': 'the grange school',
  'craighouse': 'craighouse school',
  'st paul\'s brazil': 'st. paul\'s school brazil',
  'st andrew\'s turi': 'st. andrew\'s school, turi',
  'ais johannesburg': 'american international school of johannesburg',
  'ais cape town': 'american international school of cape town',
  'bis lagos': 'british international school of lagos',
  'bist tbilisi': 'the british international school of tbilisi',
  'iics istanbul': 'istanbul international community school',
  'asf monterrey': 'american school foundation of monterrey',
  'as guadalajara': 'the american school of guadalajara',
  'jfk querétaro': 'john f. kennedy school querétaro',
  'is stavanger': 'international school of stavanger',
  'repton al barsha': 'kings\' school nad al sheba',
  'st christopher\'s bahrain': 'st. christopher\'s school bahrain',
  'st christopher\'s bahrain senior': 'st. christopher\'s school senior',
  'st christopher\'s bahrain primary': 'st. christopher\'s school primary',
  'sultan\'s school': 'sultans school',
  'berlin brandenburg international': 'berlin brandenburg international school',
  'dresden international school': 'dresden international school',
  'inter-community school zurich': 'inter-community school zurich',
  'british school of paris': 'the british school of paris',
  'international school of paris': 'international school of paris',
  'marymount paris': 'marymount international school paris',
  'st george\'s luxembourg': 'st. george\'s international school luxembourg',
  'dulwich college beijing': 'dulwich beijing',
  'dulwich shanghai pudong': 'dulwich pudong',
  'dulwich shanghai puxi': 'dulwich puxi',
  'western academy beijing': 'western academy of beijing',
  'international school beijing': 'international school of beijing',
  'harrow bangkok': 'harrow international school bangkok',
  'shrewsbury bangkok': 'shrewsbury international school bangkok',
  'king\'s bangkok': 'king\'s college international school bangkok',
  'rugby thailand': 'rugby school thailand',
  'wellington bangkok': 'wellington college international school bangkok',
  'acg jakarta': 'acg school jakarta',
  'haileybury almaty': 'haileybury almaty',
  'haileybury astana': 'haileybury astana',
  'british school tashkent': 'the british school of tashkent',
  'southbank is': 'southbank international school',
  'copenhagen is': 'copenhagen international school',
  'oslo international': 'oslo international school',
  'helsinki is': 'international school of helsinki',
  'stockholm is': 'stockholm international school'
};

async function runPatch() {
  const exportPath1 = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
  const exportPath2 = path.resolve(process.cwd(), 'complete_school_fields_export.json');

  const schools: any[] = JSON.parse(fs.readFileSync(exportPath1, 'utf8'));
  const rawLines = rawTable.trim().split('\n').filter(l => l.includes('|'));
  console.log(`Processing ${rawLines.length} benchmark patch lines.`);

  let updatedCount = 0;
  const batch = db.batch();
  let batchOps = 0;

  for (const line of rawLines) {
    const [id, name, benchmarkRaw, cat] = line.split('|').map(s => s.trim());

    // Parse currency & number
    let curr = 'USD';
    let num = 0;
    const match = benchmarkRaw.match(/([A-Z]{3}|RMB)\s*([0-9.,kKmM]+)/i);
    if (match) {
      curr = match[1].toUpperCase();
      if (curr === 'RMB') curr = 'CNY';
      let numStr = match[2].replace(/,/g, '');
      if (numStr.endsWith('m') || numStr.endsWith('M')) {
        num = parseFloat(numStr) * 1000000;
      } else if (numStr.endsWith('k') || numStr.endsWith('K')) {
        num = parseFloat(numStr) * 1000;
      } else {
        num = parseFloat(numStr);
      }
    }

    const category = ['VERIFIED_SCALE', 'STRONG_MARKET_EVIDENCE', 'MODELLED_ESTIMATE'].includes(cat)
      ? cat
      : 'MODELLED_ESTIMATE';

    const searchName = aliases[name.toLowerCase()] || name.toLowerCase();

    // Match school
    let target = schools.find(s => s.name.toLowerCase() === searchName);
    if (!target) {
      target = schools.find(s => s.name.toLowerCase().includes(searchName) || searchName.includes(s.name.toLowerCase()));
    }
    if (!target) {
      const normSearch = normalize(searchName);
      target = schools.find(s => {
        const normS = normalize(s.name);
        return normS.includes(normSearch) || normSearch.includes(normS);
      });
    }
    if (!target) {
      target = schools.find(s => s.id === id);
    }

    if (!target) {
      console.warn(`❌ Unmatched: [${id}] ${name}`);
      continue;
    }

    const updateData = {
      salary_scale_5yr_net: num,
      net_salary: num,
      currency: curr,
      salary_benchmark_category: category,
      salary_confidence: category === 'MODELLED_ESTIMATE' ? 'Medium' : 'High',
      salary_source_year: '2025/2026',
      last_benchmark_update: new Date().toISOString()
    };

    // Update in-memory
    Object.assign(target, updateData);

    // Queue Firestore update
    const docRef = db.collection('schools').doc(target.id);
    batch.set(docRef, updateData, { merge: true });
    batchOps++;
    updatedCount++;

    if (batchOps >= 400) {
      await batch.commit();
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    await batch.commit();
  }

  // Save JSON exports
  fs.writeFileSync(exportPath1, JSON.stringify(schools, null, 2), 'utf8');
  if (fs.existsSync(exportPath2)) {
    fs.writeFileSync(exportPath2, JSON.stringify(schools, null, 2), 'utf8');
  }

  console.log(`🎉 Successfully updated ${updatedCount} schools in Firestore and local JSON files!`);
}

runPatch();
