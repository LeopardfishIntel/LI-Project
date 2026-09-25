import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// 1. Researched benchmarks table
const researchedList = [
  // UAE
  { name: 'British International School Abu Dhabi', country: 'United Arab Emirates', currency: 'AED', benchmark: 16500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Cranleigh Abu Dhabi', country: 'United Arab Emirates', currency: 'AED', benchmark: 17200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Repton School Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 16800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Brighton College Abu Dhabi', country: 'United Arab Emirates', currency: 'AED', benchmark: 16500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Dubai College', country: 'United Arab Emirates', currency: 'AED', benchmark: 21500, category: 'VERIFIED_SCALE' },
  { name: 'JESS Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 18000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Dubai British School', country: 'United Arab Emirates', currency: 'AED', benchmark: 16200, category: 'MODELLED_ESTIMATE' },
  { name: 'Dubai British School Jumeira', country: 'United Arab Emirates', currency: 'AED', benchmark: 16200, category: 'MODELLED_ESTIMATE' },
  { name: 'Dubai British School Jumeirah Park', country: 'United Arab Emirates', currency: 'AED', benchmark: 16200, category: 'MODELLED_ESTIMATE' },
  { name: 'Dubai British School Mira', country: 'United Arab Emirates', currency: 'AED', benchmark: 15800, category: 'MODELLED_ESTIMATE' },
  { name: 'Sunmarke School', country: 'United Arab Emirates', currency: 'AED', benchmark: 15000, category: 'MODELLED_ESTIMATE' },
  { name: 'Safa British School', country: 'United Arab Emirates', currency: 'AED', benchmark: 14800, category: 'MODELLED_ESTIMATE' },
  { name: 'Safa Community School', country: 'United Arab Emirates', currency: 'AED', benchmark: 15200, category: 'MODELLED_ESTIMATE' },
  { name: 'Hartland International School', country: 'United Arab Emirates', currency: 'AED', benchmark: 15500, category: 'MODELLED_ESTIMATE' },
  { name: "Kings' School Dubai", country: 'United Arab Emirates', currency: 'AED', benchmark: 17500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: "Kings' School Al Barsha", country: 'United Arab Emirates', currency: 'AED', benchmark: 17500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: "Kings' School Nad Al Sheba", country: 'United Arab Emirates', currency: 'AED', benchmark: 16200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Horizon International School', country: 'United Arab Emirates', currency: 'AED', benchmark: 14500, category: 'MODELLED_ESTIMATE' },
  { name: 'Horizon English School', country: 'United Arab Emirates', currency: 'AED', benchmark: 15000, category: 'MODELLED_ESTIMATE' },
  { name: 'Kent College Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 15500, category: 'MODELLED_ESTIMATE' },
  { name: 'Nord Anglia International School Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 16800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Nord Anglia International School Abu Dhabi', country: 'United Arab Emirates', currency: 'AED', benchmark: 16800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Brighton College Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 16200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Brighton College Al Ain', country: 'United Arab Emirates', currency: 'AED', benchmark: 15000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Dubai Schools Al Barsha', country: 'United Arab Emirates', currency: 'AED', benchmark: 14000, category: 'MODELLED_ESTIMATE' },
  { name: 'Dubai School Nad Al Sheba', country: 'United Arab Emirates', currency: 'AED', benchmark: 14000, category: 'MODELLED_ESTIMATE' },
  { name: 'Dubai Schools Al Khawaneej', country: 'United Arab Emirates', currency: 'AED', benchmark: 14000, category: 'MODELLED_ESTIMATE' },
  { name: 'Lycée Libanais Francophone Privé Meydan', country: 'United Arab Emirates', currency: 'AED', benchmark: 13800, category: 'MODELLED_ESTIMATE' },
  { name: 'Repton School Abu Dhabi', country: 'United Arab Emirates', currency: 'AED', benchmark: 16000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'GEMS Wellington International School', country: 'United Arab Emirates', currency: 'AED', benchmark: 16500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'GEMS Dubai American Academy', country: 'United Arab Emirates', currency: 'AED', benchmark: 17000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'GEMS World Academy Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 16800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'GEMS Jumeirah Primary School', country: 'United Arab Emirates', currency: 'AED', benchmark: 16000, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Wellington Academy Silicon Oasis', country: 'United Arab Emirates', currency: 'AED', benchmark: 15500, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Wellington Academy Al Khail', country: 'United Arab Emirates', currency: 'AED', benchmark: 15500, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Royal Dubai School', country: 'United Arab Emirates', currency: 'AED', benchmark: 15200, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS FirstPoint School', country: 'United Arab Emirates', currency: 'AED', benchmark: 14500, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS International School Al Khail', country: 'United Arab Emirates', currency: 'AED', benchmark: 15200, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Modern Academy', country: 'United Arab Emirates', currency: 'AED', benchmark: 14800, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Founders School Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 13000, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Founders School Al Barsha', country: 'United Arab Emirates', currency: 'AED', benchmark: 13000, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Founders School Al Mizhar', country: 'United Arab Emirates', currency: 'AED', benchmark: 13500, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Metropole School Motor City', country: 'United Arab Emirates', currency: 'AED', benchmark: 14200, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Metropole School Al Waha', country: 'United Arab Emirates', currency: 'AED', benchmark: 14200, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Winchester School Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 13000, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Cambridge International Private School Sharjah', country: 'United Arab Emirates', currency: 'AED', benchmark: 12800, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS American Academy Abu Dhabi', country: 'United Arab Emirates', currency: 'AED', benchmark: 16500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'GEMS World Academy Abu Dhabi', country: 'United Arab Emirates', currency: 'AED', benchmark: 16200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'GEMS Cambridge International School Abu Dhabi', country: 'United Arab Emirates', currency: 'AED', benchmark: 13500, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS United Indian School Abu Dhabi', country: 'United Arab Emirates', currency: 'AED', benchmark: 10500, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Winchester School Abu Dhabi', country: 'United Arab Emirates', currency: 'AED', benchmark: 12500, category: 'MODELLED_ESTIMATE' },
  { name: 'GEMS Founders School Masdar City', country: 'United Arab Emirates', currency: 'AED', benchmark: 13500, category: 'MODELLED_ESTIMATE' },
  { name: 'The British School Al Khubairat', country: 'United Arab Emirates', currency: 'AED', benchmark: 18200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American School of Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 18500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American Community School of Abu Dhabi', country: 'United Arab Emirates', currency: 'AED', benchmark: 18000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Victory Heights Primary School', country: 'United Arab Emirates', currency: 'AED', benchmark: 15500, category: 'MODELLED_ESTIMATE' },
  { name: 'Deira International School', country: 'United Arab Emirates', currency: 'AED', benchmark: 16000, category: 'MODELLED_ESTIMATE' },
  { name: 'The Arbor School', country: 'United Arab Emirates', currency: 'AED', benchmark: 15200, category: 'MODELLED_ESTIMATE' },
  { name: 'Fairgreen International School', country: 'United Arab Emirates', currency: 'AED', benchmark: 15000, category: 'MODELLED_ESTIMATE' },
  { name: 'The Aquila School', country: 'United Arab Emirates', currency: 'AED', benchmark: 14800, category: 'MODELLED_ESTIMATE' },
  { name: 'Durham School Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 15500, category: 'MODELLED_ESTIMATE' },
  { name: 'Dwight School Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 15200, category: 'MODELLED_ESTIMATE' },
  { name: 'Collegiate International School', country: 'United Arab Emirates', currency: 'AED', benchmark: 14800, category: 'MODELLED_ESTIMATE' },
  { name: 'Raffles World Academy', country: 'United Arab Emirates', currency: 'AED', benchmark: 15000, category: 'MODELLED_ESTIMATE' },
  { name: 'Raffles International School', country: 'United Arab Emirates', currency: 'AED', benchmark: 14800, category: 'MODELLED_ESTIMATE' },
  { name: 'Dove Green Private School', country: 'United Arab Emirates', currency: 'AED', benchmark: 14000, category: 'MODELLED_ESTIMATE' },
  { name: 'Emirates International School Jumeirah', country: 'United Arab Emirates', currency: 'AED', benchmark: 15500, category: 'MODELLED_ESTIMATE' },
  { name: 'Emirates International School Meadows', country: 'United Arab Emirates', currency: 'AED', benchmark: 15500, category: 'MODELLED_ESTIMATE' },
  { name: 'The School of Research Science', country: 'United Arab Emirates', currency: 'AED', benchmark: 14500, category: 'MODELLED_ESTIMATE' },
  { name: 'Dar Al Marefa Private School', country: 'United Arab Emirates', currency: 'AED', benchmark: 13800, category: 'MODELLED_ESTIMATE' },
  { name: 'Yasmina British Academy', country: 'United Arab Emirates', currency: 'AED', benchmark: 16200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Al Bateen Academy', country: 'United Arab Emirates', currency: 'AED', benchmark: 15800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Al Mamoura Academy', country: 'United Arab Emirates', currency: 'AED', benchmark: 15500, category: 'MODELLED_ESTIMATE' },
  { name: 'Amity International School Abu Dhabi', country: 'United Arab Emirates', currency: 'AED', benchmark: 15200, category: 'MODELLED_ESTIMATE' },
  { name: 'Jumeira Baccalaureate School', country: 'United Arab Emirates', currency: 'AED', benchmark: 15800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'North London Collegiate School Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 18500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Royal Grammar School Guildford Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 17500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Jumeirah College', country: 'United Arab Emirates', currency: 'AED', benchmark: 17500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Dubai International Academy Emirates Hills', country: 'United Arab Emirates', currency: 'AED', benchmark: 16500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'The Winchester School Jebel Ali', country: 'United Arab Emirates', currency: 'AED', benchmark: 13500, category: 'MODELLED_ESTIMATE' },
  { name: 'The English College Dubai', country: 'United Arab Emirates', currency: 'AED', benchmark: 16500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Regent International School', country: 'United Arab Emirates', currency: 'AED', benchmark: 15500, category: 'MODELLED_ESTIMATE' },

  // Saudi Arabia
  { name: 'British International School Riyadh', country: 'Saudi Arabia', currency: 'SAR', benchmark: 19500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'British International School Jeddah', country: 'Saudi Arabia', currency: 'SAR', benchmark: 15800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American International School Riyadh', country: 'Saudi Arabia', currency: 'SAR', benchmark: 17000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American International School Jeddah', country: 'Saudi Arabia', currency: 'SAR', benchmark: 16000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Downe House Riyadh', country: 'Saudi Arabia', currency: 'SAR', benchmark: 16200, category: 'MODELLED_ESTIMATE' },
  { name: "King's College Riyadh", country: 'Saudi Arabia', currency: 'SAR', benchmark: 16500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Reigate Grammar School Riyadh', country: 'Saudi Arabia', currency: 'SAR', benchmark: 15800, category: 'MODELLED_ESTIMATE' },
  { name: 'Aldenham Prep School Riyadh', country: 'Saudi Arabia', currency: 'SAR', benchmark: 15500, category: 'MODELLED_ESTIMATE' },
  { name: 'Beech Hall School Riyadh', country: 'Saudi Arabia', currency: 'SAR', benchmark: 15200, category: 'MODELLED_ESTIMATE' },
  { name: 'One World International School Riyadh', country: 'Saudi Arabia', currency: 'SAR', benchmark: 14800, category: 'MODELLED_ESTIMATE' },
  { name: 'SEK International School Riyadh', country: 'Saudi Arabia', currency: 'SAR', benchmark: 15000, category: 'MODELLED_ESTIMATE' },
  { name: 'Dhahran British Grammar School', country: 'Saudi Arabia', currency: 'SAR', benchmark: 16000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International Programs School Al Khobar', country: 'Saudi Arabia', currency: 'SAR', benchmark: 14500, category: 'MODELLED_ESTIMATE' },
  { name: 'Jeddah Prep and Grammar School', country: 'Saudi Arabia', currency: 'SAR', benchmark: 14800, category: 'MODELLED_ESTIMATE' },
  { name: 'British International School Al Khobar', country: 'Saudi Arabia', currency: 'SAR', benchmark: 16000, category: 'STRONG_MARKET_EVIDENCE' },

  // Qatar, Kuwait, Bahrain, Oman, Jordan, Lebanon
  { name: 'Doha British School', country: 'Qatar', currency: 'QAR', benchmark: 14500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Compass International School Doha', country: 'Qatar', currency: 'QAR', benchmark: 15000, category: 'MODELLED_ESTIMATE' },
  { name: 'American School of Doha', country: 'Qatar', currency: 'QAR', benchmark: 16800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Doha College', country: 'Qatar', currency: 'QAR', benchmark: 16200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Sherborne Qatar', country: 'Qatar', currency: 'QAR', benchmark: 14800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: "King's College Doha", country: 'Qatar', currency: 'QAR', benchmark: 15200, category: 'MODELLED_ESTIMATE' },
  { name: 'Oryx International School', country: 'Qatar', currency: 'QAR', benchmark: 14500, category: 'MODELLED_ESTIMATE' },
  { name: 'Qatar Academy', country: 'Qatar', currency: 'QAR', benchmark: 16000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Swiss International School Qatar', country: 'Qatar', currency: 'QAR', benchmark: 14800, category: 'MODELLED_ESTIMATE' },
  { name: 'British School of Kuwait', country: 'Kuwait', currency: 'KWD', benchmark: 1150, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American School of Kuwait', country: 'Kuwait', currency: 'KWD', benchmark: 1250, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American International School Kuwait', country: 'Kuwait', currency: 'KWD', benchmark: 1200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Universal American School Kuwait', country: 'Kuwait', currency: 'KWD', benchmark: 1100, category: 'MODELLED_ESTIMATE' },
  { name: 'New English School Kuwait', country: 'Kuwait', currency: 'KWD', benchmark: 1120, category: 'MODELLED_ESTIMATE' },
  { name: 'Gulf English School Kuwait', country: 'Kuwait', currency: 'KWD', benchmark: 1080, category: 'MODELLED_ESTIMATE' },
  { name: 'The English School Kuwait', country: 'Kuwait', currency: 'KWD', benchmark: 1150, category: 'MODELLED_ESTIMATE' },
  { name: 'Kuwait English School', country: 'Kuwait', currency: 'KWD', benchmark: 1100, category: 'MODELLED_ESTIMATE' },
  { name: "St. Christopher's School Bahrain", country: 'Bahrain', currency: 'BHD', benchmark: 1450, category: 'STRONG_MARKET_EVIDENCE' },
  { name: "St. Christopher's School Senior", country: 'Bahrain', currency: 'BHD', benchmark: 1450, category: 'STRONG_MARKET_EVIDENCE' },
  { name: "St. Christopher's School Primary", country: 'Bahrain', currency: 'BHD', benchmark: 1450, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'British School of Bahrain', country: 'Bahrain', currency: 'BHD', benchmark: 1350, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Bahrain School', country: 'Bahrain', currency: 'BHD', benchmark: 1300, category: 'MODELLED_ESTIMATE' },
  { name: 'Riffa Views International School', country: 'Bahrain', currency: 'BHD', benchmark: 1380, category: 'MODELLED_ESTIMATE' },
  { name: 'British School Muscat', country: 'Oman', currency: 'OMR', benchmark: 1450, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American International School of Muscat', country: 'Oman', currency: 'OMR', benchmark: 1550, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Sultans School', country: 'Oman', currency: 'OMR', benchmark: 1300, category: 'MODELLED_ESTIMATE' },
  { name: 'ABA Oman International School', country: 'Oman', currency: 'OMR', benchmark: 1400, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Amman Academy', country: 'Jordan', currency: 'JOD', benchmark: 1600, category: 'MODELLED_ESTIMATE' },
  { name: "King's Academy", country: 'Jordan', currency: 'USD', benchmark: 3800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American Community School Amman', country: 'Jordan', currency: 'USD', benchmark: 3600, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American Community School Beirut', country: 'Lebanon', currency: 'USD', benchmark: 3500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International College Beirut', country: 'Lebanon', currency: 'USD', benchmark: 3200, category: 'STRONG_MARKET_EVIDENCE' },

  // Europe
  { name: 'British School of Brussels', country: 'Belgium', currency: 'EUR', benchmark: 3200, category: 'VERIFIED_SCALE' },
  { name: 'The British School of Brussels', country: 'Belgium', currency: 'EUR', benchmark: 3200, category: 'VERIFIED_SCALE' },
  { name: 'International School of Brussels', country: 'Belgium', currency: 'EUR', benchmark: 3350, category: 'STRONG_MARKET_EVIDENCE' },
  { name: "St. John's International School Belgium", country: 'Belgium', currency: 'EUR', benchmark: 2950, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Frankfurt International School', country: 'Germany', currency: 'EUR', benchmark: 3480, category: 'VERIFIED_SCALE' },
  { name: "Frankfurt Int'l", country: 'Germany', currency: 'EUR', benchmark: 3480, category: 'VERIFIED_SCALE' },
  { name: 'Munich International School', country: 'Germany', currency: 'EUR', benchmark: 3300, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Berlin Brandenburg International', country: 'Germany', currency: 'EUR', benchmark: 2850, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Bavarian International School', country: 'Germany', currency: 'EUR', benchmark: 3150, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School of Dusseldorf', country: 'Germany', currency: 'EUR', benchmark: 3100, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Dresden International School', country: 'Germany', currency: 'EUR', benchmark: 2750, category: 'MODELLED_ESTIMATE' },
  { name: "St. George's, The British International School Munich", country: 'Germany', currency: 'EUR', benchmark: 3100, category: 'STRONG_MARKET_EVIDENCE' },
  { name: "St George's Munich", country: 'Germany', currency: 'EUR', benchmark: 3100, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American International School Vienna', country: 'Austria', currency: 'EUR', benchmark: 2850, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Danube International School Vienna', country: 'Austria', currency: 'EUR', benchmark: 2700, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'St. Gilgen International School', country: 'Austria', currency: 'EUR', benchmark: 2800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Vienna International School', country: 'Austria', currency: 'EUR', benchmark: 2950, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School of Geneva', country: 'Switzerland', currency: 'CHF', benchmark: 6800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Zurich International School', country: 'Switzerland', currency: 'CHF', benchmark: 5850, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'TASIS Switzerland', country: 'Switzerland', currency: 'CHF', benchmark: 6200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'TASIS The American School in Switzerland', country: 'Switzerland', currency: 'CHF', benchmark: 6200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Le Rosey', country: 'Switzerland', currency: 'CHF', benchmark: 7200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Institut Le Rosey', country: 'Switzerland', currency: 'CHF', benchmark: 7200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'College Alpin Beau Soleil', country: 'Switzerland', currency: 'CHF', benchmark: 6800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Inter-Community School Zurich', country: 'Switzerland', currency: 'CHF', benchmark: 6700, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School of Zug and Luzern', country: 'Switzerland', currency: 'CHF', benchmark: 6800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Aiglon College', country: 'Switzerland', currency: 'CHF', benchmark: 6900, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'British School of Paris', country: 'France', currency: 'EUR', benchmark: 2650, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School of Paris', country: 'France', currency: 'EUR', benchmark: 2750, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Mougins School', country: 'France', currency: 'EUR', benchmark: 2400, category: 'MODELLED_ESTIMATE' },
  { name: 'Marymount International School Paris', country: 'France', currency: 'EUR', benchmark: 2550, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Ermitage International School of France', country: 'France', currency: 'EUR', benchmark: 2350, category: 'MODELLED_ESTIMATE' },
  { name: 'American School of Paris', country: 'France', currency: 'EUR', benchmark: 2850, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'IS Monaco', country: 'Monaco', currency: 'EUR', benchmark: 3100, category: 'STRONG_MARKET_EVIDENCE' },
  { name: "St. George's International School Luxembourg", country: 'Luxembourg', currency: 'EUR', benchmark: 3600, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School of Luxembourg', country: 'Luxembourg', currency: 'EUR', benchmark: 3650, category: 'VERIFIED_SCALE' },
  { name: 'IS Amsterdam', country: 'Netherlands', currency: 'EUR', benchmark: 2900, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School of Amsterdam', country: 'Netherlands', currency: 'EUR', benchmark: 3200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American School of The Hague', country: 'Netherlands', currency: 'EUR', benchmark: 3250, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School of The Hague', country: 'Netherlands', currency: 'EUR', benchmark: 2950, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Rotterdam International Secondary School', country: 'Netherlands', currency: 'EUR', benchmark: 2850, category: 'MODELLED_ESTIMATE' },
  { name: 'International School Eindhoven', country: 'Netherlands', currency: 'EUR', benchmark: 2800, category: 'MODELLED_ESTIMATE' },
  { name: 'Southbank International School', country: 'UK', currency: 'GBP', benchmark: 2600, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'ACS Cobham International School', country: 'UK', currency: 'GBP', benchmark: 2750, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'TASIS The American School in England', country: 'United Kingdom', currency: 'GBP', benchmark: 2700, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'IS Hellerup', country: 'Denmark', currency: 'DKK', benchmark: 24000, category: 'MODELLED_ESTIMATE' },
  { name: 'Copenhagen International School', country: 'Denmark', currency: 'DKK', benchmark: 26000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Oslo International', country: 'Norway', currency: 'NOK', benchmark: 32000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School of Stavanger', country: 'Norway', currency: 'NOK', benchmark: 31000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School of Helsinki', country: 'Finland', currency: 'EUR', benchmark: 2600, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'British School in Helsinki', country: 'Finland', currency: 'EUR', benchmark: 2600, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Stockholm International School', country: 'Sweden', currency: 'SEK', benchmark: 28000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'British International School of Stockholm', country: 'Sweden', currency: 'SEK', benchmark: 28000, category: 'STRONG_MARKET_EVIDENCE' },

  // Asia-Pacific
  { name: 'Dulwich Beijing', country: 'China', currency: 'CNY', benchmark: 27200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Dulwich Pudong', country: 'China', currency: 'CNY', benchmark: 29000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Dulwich Puxi', country: 'China', currency: 'CNY', benchmark: 28500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Dulwich Suzhou', country: 'China', currency: 'CNY', benchmark: 26000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Dulwich College Suzhou', country: 'China', currency: 'CNY', benchmark: 26000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Western Academy of Beijing', country: 'China', currency: 'CNY', benchmark: 29500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Shanghai American School', country: 'China', currency: 'USD', benchmark: 4200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School of Beijing', country: 'China', currency: 'CNY', benchmark: 29800, category: 'VERIFIED_SCALE' },
  { name: 'Malvern College Hong Kong', country: 'Hong Kong', currency: 'HKD', benchmark: 45000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Malvern College Pre-School HK (Island West)', country: 'Hong Kong', currency: 'HKD', benchmark: 38000, category: 'MODELLED_ESTIMATE' },
  { name: 'Malvern College Pre-School HK (Coronation Circle)', country: 'Hong Kong', currency: 'HKD', benchmark: 38000, category: 'MODELLED_ESTIMATE' },
  { name: 'Hong Kong International School', country: 'Hong Kong', currency: 'HKD', benchmark: 43500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Kellett School', country: 'Hong Kong', currency: 'HKD', benchmark: 48000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Chinese International School', country: 'Hong Kong', currency: 'HKD', benchmark: 50000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Discovery Bay International School', country: 'Hong Kong', currency: 'HKD', benchmark: 42000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Bangkok Patana', country: 'Thailand', currency: 'THB', benchmark: 125000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'NIST', country: 'Thailand', currency: 'THB', benchmark: 112000, category: 'VERIFIED_SCALE' },
  { name: 'International School Bangkok (ISB)', country: 'Thailand', currency: 'USD', benchmark: 3800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Harrow International School Bangkok', country: 'Thailand', currency: 'THB', benchmark: 120000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Shrewsbury International School Bangkok', country: 'Thailand', currency: 'THB', benchmark: 125000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: "King's College International School Bangkok", country: 'Thailand', currency: 'THB', benchmark: 120000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Rugby School Thailand', country: 'Thailand', currency: 'THB', benchmark: 115000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Wellington College International Bangkok', country: 'Thailand', currency: 'THB', benchmark: 120000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'British School Jakarta', country: 'Indonesia', currency: 'USD', benchmark: 3200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Jakarta Intercultural School', country: 'Indonesia', currency: 'USD', benchmark: 3800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'ACG School Jakarta', country: 'Indonesia', currency: 'USD', benchmark: 2600, category: 'MODELLED_ESTIMATE' },
  { name: 'Canggu Community School Bali', country: 'Indonesia', currency: 'USD', benchmark: 2400, category: 'MODELLED_ESTIMATE' },
  { name: 'British School Manila', country: 'Philippines', currency: 'USD', benchmark: 3100, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School Manila', country: 'Philippines', currency: 'USD', benchmark: 3600, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Jerudong International School', country: 'Brunei', currency: 'BND', benchmark: 4200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School Brunei', country: 'Brunei', currency: 'BND', benchmark: 3800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Seoul Foreign School', country: 'South Korea', currency: 'KRW', benchmark: 4600000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Korea International School', country: 'South Korea', currency: 'KRW', benchmark: 4000000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Chadwick International', country: 'South Korea', currency: 'KRW', benchmark: 4500000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Dulwich College Seoul', country: 'South Korea', currency: 'KRW', benchmark: 4300000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Taipei American School', country: 'Taiwan', currency: 'TWD', benchmark: 125000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Taipei European School', country: 'Taiwan', currency: 'TWD', benchmark: 115000, category: 'STRONG_MARKET_EVIDENCE' },

  // Americas, Africa, Central Asia
  { name: "St. Paul's School Brazil", country: 'Brazil', currency: 'BRL', benchmark: 16500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'British School Rio de Janeiro', country: 'Brazil', currency: 'BRL', benchmark: 15000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'The British School of Rio de Janeiro', country: 'Brazil', currency: 'BRL', benchmark: 15000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Graded School Sao Paulo', country: 'Brazil', currency: 'USD', benchmark: 3500, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Malvern College São Paulo', country: 'Brazil', currency: 'BRL', benchmark: 15500, category: 'MODELLED_ESTIMATE' },
  { name: "St. Francis' College", country: 'Brazil', currency: 'BRL', benchmark: 14000, category: 'MODELLED_ESTIMATE' },
  { name: 'The American School Foundation Mexico City', country: 'Mexico', currency: 'MXN', benchmark: 48000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American School Foundation of Monterrey', country: 'Mexico', currency: 'MXN', benchmark: 45000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Greengates School', country: 'Mexico', currency: 'MXN', benchmark: 42000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'The American School of Guadalajara', country: 'Mexico', currency: 'MXN', benchmark: 40000, category: 'MODELLED_ESTIMATE' },
  { name: 'John F. Kennedy School Querétaro', country: 'Mexico', currency: 'MXN', benchmark: 38000, category: 'MODELLED_ESTIMATE' },
  { name: 'Colegio Nueva Granada', country: 'Colombia', currency: 'COP', benchmark: 9500000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Colegio Bolívar', country: 'Colombia', currency: 'COP', benchmark: 9000000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'The English School Bogotá', country: 'Colombia', currency: 'COP', benchmark: 8500000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'The Grange School', country: 'Chile', currency: 'CLP', benchmark: 3400000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Craighouse School', country: 'Chile', currency: 'CLP', benchmark: 3599000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Northlands School Argentina', country: 'Argentina', currency: 'USD', benchmark: 2200, category: 'MODELLED_ESTIMATE' },
  { name: 'Markham College Peru', country: 'Peru', currency: 'USD', benchmark: 2800, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'The British Schools Montevideo', country: 'Uruguay', currency: 'UYU', benchmark: 110000, category: 'MODELLED_ESTIMATE' },
  { name: 'The British School of Caracas', country: 'Venezuela', currency: 'USD', benchmark: 2500, category: 'MODELLED_ESTIMATE' },
  { name: 'UWC Costa Rica', country: 'Costa Rica', currency: 'USD', benchmark: 2200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'The British School of Costa Rica', country: 'Costa Rica', currency: 'USD', benchmark: 2400, category: 'MODELLED_ESTIMATE' },
  { name: 'International School of Kenya', country: 'Kenya', currency: 'USD', benchmark: 3200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Brookhouse School', country: 'Kenya', currency: 'KES', benchmark: 320000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Braeburn Garden Estate', country: 'Kenya', currency: 'KES', benchmark: 280000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: "St. Andrew's School, Turi", country: 'Kenya', currency: 'KES', benchmark: 310000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Peponi School', country: 'Kenya', currency: 'KES', benchmark: 300000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'International School of Cape Town', country: 'South Africa', currency: 'ZAR', benchmark: 38000, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American International School of Johannesburg', country: 'South Africa', currency: 'USD', benchmark: 3100, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'American International School of Cape Town', country: 'South Africa', currency: 'USD', benchmark: 2900, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'British International School of Lagos', country: 'Nigeria', currency: 'USD', benchmark: 2600, category: 'MODELLED_ESTIMATE' },
  { name: 'European Azerbaijan', country: 'Azerbaijan', currency: 'USD', benchmark: 2400, category: 'MODELLED_ESTIMATE' },
  { name: 'Azerbaijan British College', country: 'Azerbaijan', currency: 'USD', benchmark: 2500, category: 'MODELLED_ESTIMATE' },
  { name: 'Baku Oxford School', country: 'Azerbaijan', currency: 'USD', benchmark: 2200, category: 'MODELLED_ESTIMATE' },
  { name: 'Modern Educational Complex Named in Honor of Heydar Aliyev', country: 'Azerbaijan', currency: 'USD', benchmark: 2100, category: 'MODELLED_ESTIMATE' },
  { name: 'Haileybury Almaty', country: 'Kazakhstan', currency: 'USD', benchmark: 3200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'Haileybury Astana', country: 'Kazakhstan', currency: 'USD', benchmark: 3200, category: 'STRONG_MARKET_EVIDENCE' },
  { name: 'The British School of Tashkent', country: 'Uzbekistan', currency: 'USD', benchmark: 2600, category: 'MODELLED_ESTIMATE' },
  { name: 'The British International School of Tbilisi', country: 'Georgia', currency: 'USD', benchmark: 2200, category: 'MODELLED_ESTIMATE' },
  { name: 'Istanbul International Community School', country: 'Turkey', currency: 'USD', benchmark: 3100, category: 'STRONG_MARKET_EVIDENCE' }
];

const countryDefaultCurrency: Record<string, string> = {
  'United Arab Emirates': 'AED',
  'Saudi Arabia': 'SAR',
  'Qatar': 'QAR',
  'Kuwait': 'KWD',
  'Bahrain': 'BHD',
  'Oman': 'OMR',
  'Jordan': 'JOD',
  'Lebanon': 'USD',
  'Egypt': 'USD',
  'Kenya': 'KES',
  'South Africa': 'ZAR',
  'Nigeria': 'USD',
  'Tanzania': 'USD',
  'France': 'EUR',
  'Germany': 'EUR',
  'Belgium': 'EUR',
  'Netherlands': 'EUR',
  'Austria': 'EUR',
  'Monaco': 'EUR',
  'Luxembourg': 'EUR',
  'Spain': 'EUR',
  'Italy': 'EUR',
  'Portugal': 'EUR',
  'Greece': 'EUR',
  'Cyprus': 'EUR',
  'Switzerland': 'CHF',
  'United Kingdom': 'GBP',
  'UK': 'GBP',
  'Denmark': 'DKK',
  'Norway': 'NOK',
  'Sweden': 'SEK',
  'Finland': 'EUR',
  'Poland': 'EUR',
  'Czechia': 'CZK',
  'Hungary': 'EUR',
  'Romania': 'EUR',
  'Slovakia': 'EUR',
  'Bulgaria': 'EUR',
  'Serbia': 'EUR',
  'Latvia': 'EUR',
  'Turkey': 'USD',
  'Azerbaijan': 'USD',
  'Kazakhstan': 'USD',
  'Uzbekistan': 'USD',
  'Georgia': 'USD',
  'China': 'CNY',
  'Hong Kong': 'HKD',
  'Hong Kong SAR': 'HKD',
  'Taiwan': 'TWD',
  'Japan': 'JPY',
  'South Korea': 'KRW',
  'Singapore': 'SGD',
  'Thailand': 'THB',
  'Malaysia': 'MYR',
  'Vietnam': 'USD',
  'Indonesia': 'USD',
  'Philippines': 'USD',
  'Brunei': 'BND',
  'India': 'INR',
  'Brazil': 'BRL',
  'Mexico': 'MXN',
  'Colombia': 'COP',
  'Chile': 'CLP',
  'Argentina': 'USD',
  'Peru': 'USD',
  'Uruguay': 'UYU',
  'Venezuela': 'USD',
  'Costa Rica': 'USD'
};

function normalizeName(s: string) {
  return s.toLowerCase()
    .replace(/\bthe\b/g, '')
    .replace(/\bint'l\b/g, 'international')
    .replace(/\bis\b/g, 'international school')
    .replace(/\bbis\b/g, 'british international school')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function reconcileMasterRegistry() {
  console.log('🔄 Reconciling master registry from clean baseline b9df53e...');
  const cleanJsonStr = execSync('git show b9df53e:public/complete_school_fields_export.json', { maxBuffer: 30 * 1024 * 1024 }).toString();
  const cleanSchools: any[] = JSON.parse(cleanJsonStr);

  const exportPath1 = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
  const exportPath2 = path.resolve(process.cwd(), 'complete_school_fields_export.json');

  let batch = db.batch();
  let batchOps = 0;
  let researchedMatchCount = 0;

  for (const school of cleanSchools) {
    // 1. Ensure correct default official currency
    const defaultCurr = countryDefaultCurrency[school.country] || 'USD';
    school.currency = defaultCurr;

    // 2. Try to match with researched list by School Name + Country
    const sNorm = normalizeName(school.name);
    const matchedResearch = researchedList.find(r => {
      if (r.country !== school.country && !(r.country.includes('Hong Kong') && school.country.includes('Hong Kong'))) return false;
      const rNorm = normalizeName(r.name);
      return sNorm === rNorm || sNorm.includes(rNorm) || rNorm.includes(sNorm);
    });

    if (matchedResearch) {
      school.salary_scale_5yr_net = matchedResearch.benchmark;
      school.net_salary = matchedResearch.benchmark;
      school.currency = matchedResearch.currency;
      school.salary_benchmark_category = matchedResearch.category;
      school.salary_confidence = matchedResearch.category === 'MODELLED_ESTIMATE' ? 'Medium' : 'High';
      school.salary_source_year = '2025/2026';
      researchedMatchCount++;
    } else {
      // Retain existing known salary if present, otherwise set PENDING
      const existingNet = school.salary_scale_5yr_net || school.net_salary || school.salary_benchmark || school.benchmark_5yr_net;
      if (existingNet && typeof existingNet === 'number' && existingNet > 0) {
        school.salary_scale_5yr_net = existingNet;
        school.salary_benchmark_category = 'PENDING';
        school.salary_confidence = 'Pending';
      } else {
        school.salary_benchmark_category = 'PENDING';
        school.salary_confidence = 'Pending';
      }
    }

    // Queue update to Firestore
    const docRef = db.collection('schools').doc(school.id);
    batch.set(docRef, {
      name: school.name,
      country: school.country,
      city: school.city,
      currency: school.currency,
      salary_scale_5yr_net: school.salary_scale_5yr_net ?? null,
      net_salary: school.salary_scale_5yr_net ?? null,
      salary_benchmark_category: school.salary_benchmark_category,
      salary_confidence: school.salary_confidence,
      salary_source_year: school.salary_source_year || '2025/2026',
      last_benchmark_update: new Date().toISOString()
    }, { merge: true });
    batchOps++;

    if (batchOps >= 400) {
      await batch.commit();
      batch = db.batch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    await batch.commit();
  }

  // Save clean files
  fs.writeFileSync(exportPath1, JSON.stringify(cleanSchools, null, 2), 'utf8');
  if (fs.existsSync(exportPath2)) fs.writeFileSync(exportPath2, JSON.stringify(cleanSchools, null, 2), 'utf8');

  console.log(`✅ Master reconciliation complete! Total schools: ${cleanSchools.length}, Researched categories: ${researchedMatchCount}`);
}

reconcileMasterRegistry();
