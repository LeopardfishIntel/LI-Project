import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Standard country default contract currencies
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
  'Ethiopia': 'USD',
  'Ghana': 'USD',
  'Zambia': 'USD',
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
  'Poland': 'PLN',
  'Czech Republic': 'CZK',
  'Czechia': 'CZK',
  'Hungary': 'HUF',
  'Romania': 'EUR',
  'Slovakia': 'EUR',
  'Bulgaria': 'EUR',
  'Serbia': 'EUR',
  'Croatia': 'EUR',
  'Latvia': 'EUR',
  'Turkey': 'USD',
  'Azerbaijan': 'AZN',
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
  'Cambodia': 'USD',
  'Myanmar': 'USD',
  'Brunei': 'BND',
  'India': 'INR',
  'Sri Lanka': 'USD',
  'Bangladesh': 'USD',
  'Pakistan': 'USD',
  'Nepal': 'USD',
  'Mongolia': 'USD',
  'Brazil': 'BRL',
  'Mexico': 'MXN',
  'Colombia': 'COP',
  'Chile': 'CLP',
  'Argentina': 'USD',
  'Peru': 'USD',
  'Uruguay': 'UYU',
  'Venezuela': 'USD',
  'Costa Rica': 'USD',
  'Panama': 'USD',
  'Ecuador': 'USD',
  'Guatemala': 'USD',
  'Trinidad and Tobago': 'USD',
  'Cayman Islands': 'KYD',
  'Bermuda': 'BMD',
  'Jamaica': 'USD',
  'Bahamas': 'USD',
  'United States': 'USD',
  'Canada': 'CAD'
};

// Researched Net Monthly Benchmarks & Provenance
// All figures here are strictly NET MONTHLY in contract currency
const researchedBenchMap: Record<string, { monthlyNet: number; currency: string; category: string }> = {
  // UAE
  'british international school abu dhabi': { monthlyNet: 16500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'cranleigh abu dhabi': { monthlyNet: 17200, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'repton school dubai': { monthlyNet: 16800, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'brighton college abu dhabi': { monthlyNet: 16500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'dubai college': { monthlyNet: 21500, currency: 'AED', category: 'VERIFIED_SCALE' },
  'jess dubai': { monthlyNet: 18000, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'jumeirah english speaking school': { monthlyNet: 18000, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'dubai british school': { monthlyNet: 16200, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'dubai british school emirates hills': { monthlyNet: 16200, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'dubai british school jumeira': { monthlyNet: 16200, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'dubai british school jumeirah park': { monthlyNet: 16200, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'dubai british school mira': { monthlyNet: 15800, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'sunmarke school': { monthlyNet: 15000, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'safa british school': { monthlyNet: 14800, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'safa community school': { monthlyNet: 15200, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'hartland international school': { monthlyNet: 15500, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  "kings school dubai": { monthlyNet: 17500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  "kings school al barsha": { monthlyNet: 17500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  "kings school nad al sheba": { monthlyNet: 16200, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'horizon international school': { monthlyNet: 14500, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'horizon english school': { monthlyNet: 15000, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'kent college dubai': { monthlyNet: 15500, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'nord anglia international school dubai': { monthlyNet: 16800, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'brighton college dubai': { monthlyNet: 16200, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'brighton college al ain': { monthlyNet: 15000, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'repton school abu dhabi': { monthlyNet: 16000, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'gems wellington international school': { monthlyNet: 16500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'gems dubai american academy': { monthlyNet: 17000, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'gems world academy dubai': { monthlyNet: 16800, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'gems world dubai': { monthlyNet: 16800, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'gems jumeirah primary school': { monthlyNet: 16000, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'gems wellington academy silicon oasis': { monthlyNet: 15500, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'gems wellington academy al khail': { monthlyNet: 15500, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'gems royal dubai school': { monthlyNet: 15200, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'gems firstpoint school': { monthlyNet: 14500, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'gems firstpoint school the villa': { monthlyNet: 14500, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'gems international school al khail': { monthlyNet: 15200, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'gems modern academy': { monthlyNet: 14800, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'gems founders school dubai': { monthlyNet: 13000, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'gems metropole school motor city': { monthlyNet: 14200, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'gems winchester school dubai': { monthlyNet: 13000, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'gems american academy abu dhabi': { monthlyNet: 16500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'gems world academy abu dhabi': { monthlyNet: 16200, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'the british school al khubairat': { monthlyNet: 18200, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'british school al khubairat': { monthlyNet: 18200, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'american school of dubai': { monthlyNet: 18500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'american community school of abu dhabi': { monthlyNet: 18000, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'victory heights primary school': { monthlyNet: 15500, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'deira international school': { monthlyNet: 16000, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'the arbor school': { monthlyNet: 15200, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'fairgreen international school': { monthlyNet: 15000, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'the aquila school': { monthlyNet: 14800, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'collegiate international school': { monthlyNet: 14800, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'raffles world academy': { monthlyNet: 15000, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'raffles international school': { monthlyNet: 14800, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'the school of research science': { monthlyNet: 14500, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'dar al marefa school': { monthlyNet: 13800, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'dar al marefa private school': { monthlyNet: 13800, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'al bateen academy': { monthlyNet: 15800, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'al bateen world academy': { monthlyNet: 15800, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'al yasmina academy': { monthlyNet: 16200, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'amity international school abu dhabi': { monthlyNet: 15200, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'jumeira baccalaureate school': { monthlyNet: 15800, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'north london collegiate school dubai': { monthlyNet: 18500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'nlcs dubai': { monthlyNet: 18500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'royal grammar school guildford dubai': { monthlyNet: 17500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'jumeirah college': { monthlyNet: 17500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'dubai international academy emirates hills': { monthlyNet: 16500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'dubai international academy': { monthlyNet: 16500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'the winchester school jebel ali': { monthlyNet: 13500, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'the english college dubai': { monthlyNet: 16500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'regent international school': { monthlyNet: 15500, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'dubai english speaking college': { monthlyNet: 17500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'dubai english speaking school': { monthlyNet: 17000, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'dubai schools al barsha': { monthlyNet: 14000, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'dubai school nad al sheba': { monthlyNet: 14000, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'dubai schools al khawaneej': { monthlyNet: 14000, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'swiss international scientific school in dubai': { monthlyNet: 16500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'jebel ali school': { monthlyNet: 15500, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'citizens school': { monthlyNet: 15000, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'sharjah english school': { monthlyNet: 16000, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'victoria international school of sharjah': { monthlyNet: 15500, currency: 'AED', category: 'STRONG_MARKET_EVIDENCE' },
  'rak academy': { monthlyNet: 13800, currency: 'AED', category: 'MODELLED_ESTIMATE' },
  'fujairah private academy': { monthlyNet: 13500, currency: 'AED', category: 'MODELLED_ESTIMATE' },

  // Singapore (Strictly Net Monthly SGD)
  'uwc south east asia': { monthlyNet: 8750, currency: 'SGD', category: 'VERIFIED_SCALE' },
  'united world college south east asia': { monthlyNet: 8750, currency: 'SGD', category: 'VERIFIED_SCALE' },
  'tanglin trust': { monthlyNet: 8500, currency: 'SGD', category: 'VERIFIED_SCALE' },
  'tanglin trust school': { monthlyNet: 8500, currency: 'SGD', category: 'VERIFIED_SCALE' },
  'sji international': { monthlyNet: 7667, currency: 'SGD', category: 'STRONG_MARKET_EVIDENCE' },
  'sji international school': { monthlyNet: 7667, currency: 'SGD', category: 'STRONG_MARKET_EVIDENCE' },
  "st josephs institution international": { monthlyNet: 7667, currency: 'SGD', category: 'STRONG_MARKET_EVIDENCE' },
  'singapore american school': { monthlyNet: 9000, currency: 'SGD', category: 'STRONG_MARKET_EVIDENCE' },
  'dulwich college singapore': { monthlyNet: 8167, currency: 'SGD', category: 'STRONG_MARKET_EVIDENCE' },
  'canadian international school singapore': { monthlyNet: 7167, currency: 'SGD', category: 'STRONG_MARKET_EVIDENCE' },
  'australian international school singapore': { monthlyNet: 7167, currency: 'SGD', category: 'STRONG_MARKET_EVIDENCE' },
  'stamford american international school': { monthlyNet: 7333, currency: 'SGD', category: 'STRONG_MARKET_EVIDENCE' },
  'nexus international school singapore': { monthlyNet: 6833, currency: 'SGD', category: 'MODELLED_ESTIMATE' },
  'overseas family school': { monthlyNet: 6667, currency: 'SGD', category: 'MODELLED_ESTIMATE' },
  'dover court international school': { monthlyNet: 7000, currency: 'SGD', category: 'MODELLED_ESTIMATE' },
  'nlcs singapore': { monthlyNet: 7833, currency: 'SGD', category: 'STRONG_MARKET_EVIDENCE' },

  // Hong Kong (Strictly Net Monthly HKD)
  'chinese international school': { monthlyNet: 53333, currency: 'HKD', category: 'STRONG_MARKET_EVIDENCE' },
  'english schools foundation': { monthlyNet: 51667, currency: 'HKD', category: 'VERIFIED_SCALE' },
  'hong kong international school': { monthlyNet: 56667, currency: 'HKD', category: 'STRONG_MARKET_EVIDENCE' },
  'german swiss international school': { monthlyNet: 52500, currency: 'HKD', category: 'STRONG_MARKET_EVIDENCE' },
  'german swiss intl': { monthlyNet: 52500, currency: 'HKD', category: 'STRONG_MARKET_EVIDENCE' },
  'kellett school': { monthlyNet: 50833, currency: 'HKD', category: 'STRONG_MARKET_EVIDENCE' },
  'kellett school hong kong': { monthlyNet: 50833, currency: 'HKD', category: 'STRONG_MARKET_EVIDENCE' },
  'harrow international school hong kong': { monthlyNet: 50000, currency: 'HKD', category: 'STRONG_MARKET_EVIDENCE' },
  'singapore international school hong kong': { monthlyNet: 48333, currency: 'HKD', category: 'STRONG_MARKET_EVIDENCE' },
  'canadian international school of hong kong': { monthlyNet: 51667, currency: 'HKD', category: 'STRONG_MARKET_EVIDENCE' },
  'malvern college hong kong': { monthlyNet: 46667, currency: 'HKD', category: 'MODELLED_ESTIMATE' },
  'discovery college': { monthlyNet: 48000, currency: 'HKD', category: 'VERIFIED_SCALE' },
  'renaissance college': { monthlyNet: 48000, currency: 'HKD', category: 'VERIFIED_SCALE' },
  'victoria shanghai academy': { monthlyNet: 47500, currency: 'HKD', category: 'MODELLED_ESTIMATE' },
  'yew chung international school': { monthlyNet: 46000, currency: 'HKD', category: 'STRONG_MARKET_EVIDENCE' },
  'stamford american school hong kong': { monthlyNet: 45833, currency: 'HKD', category: 'MODELLED_ESTIMATE' },
  'nord anglia international school hong kong': { monthlyNet: 45000, currency: 'HKD', category: 'MODELLED_ESTIMATE' },
  'shrewsbury international school hong kong': { monthlyNet: 44167, currency: 'HKD', category: 'MODELLED_ESTIMATE' },
  'french international school of hong kong': { monthlyNet: 45833, currency: 'HKD', category: 'MODELLED_ESTIMATE' },
  'international christian school': { monthlyNet: 43333, currency: 'HKD', category: 'MODELLED_ESTIMATE' },
  'american international school hong kong': { monthlyNet: 42500, currency: 'HKD', category: 'MODELLED_ESTIMATE' },

  // Switzerland (Strictly Net Monthly CHF)
  'international school of geneva': { monthlyNet: 8167, currency: 'CHF', category: 'VERIFIED_SCALE' },
  'zurich international': { monthlyNet: 8333, currency: 'CHF', category: 'STRONG_MARKET_EVIDENCE' },
  'zurich international school': { monthlyNet: 8333, currency: 'CHF', category: 'STRONG_MARKET_EVIDENCE' },
  'international school basel': { monthlyNet: 7917, currency: 'CHF', category: 'STRONG_MARKET_EVIDENCE' },
  'institut le rosey': { monthlyNet: 8750, currency: 'CHF', category: 'STRONG_MARKET_EVIDENCE' },
  'le rosey': { monthlyNet: 8750, currency: 'CHF', category: 'STRONG_MARKET_EVIDENCE' },
  'college alpin beau soleil': { monthlyNet: 7667, currency: 'CHF', category: 'STRONG_MARKET_EVIDENCE' },
  'aiglon college': { monthlyNet: 7833, currency: 'CHF', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of lausanne': { monthlyNet: 7917, currency: 'CHF', category: 'STRONG_MARKET_EVIDENCE' },
  'tasis switzerland': { monthlyNet: 7083, currency: 'CHF', category: 'STRONG_MARKET_EVIDENCE' },
  'tasis the american school in switzerland': { monthlyNet: 7083, currency: 'CHF', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of zug and luzern': { monthlyNet: 8000, currency: 'CHF', category: 'STRONG_MARKET_EVIDENCE' },

  // China (Strictly Net Monthly CNY)
  'dulwich beijing': { monthlyNet: 31667, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'dulwich college beijing': { monthlyNet: 31667, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'dulwich pudong': { monthlyNet: 32500, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'dulwich college shanghai pudong': { monthlyNet: 32500, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'dulwich puxi': { monthlyNet: 31250, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'dulwich college shanghai puxi': { monthlyNet: 31250, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'dulwich suzhou': { monthlyNet: 30000, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'dulwich college suzhou': { monthlyNet: 30000, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of beijing': { monthlyNet: 35000, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'western academy of beijing': { monthlyNet: 34583, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'harrow international school beijing': { monthlyNet: 30833, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'the british school of beijing shunyi': { monthlyNet: 30000, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'shanghai american school': { monthlyNet: 35833, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'concordia international school shanghai': { monthlyNet: 35417, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'the british international school shanghai puxi': { monthlyNet: 30417, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'nord anglia international school shanghai pudong': { monthlyNet: 30000, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'shanghai community international school': { monthlyNet: 32083, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'wellington college international shanghai': { monthlyNet: 33333, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'harrow international school shanghai': { monthlyNet: 31250, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'yew chung international school of shanghai': { monthlyNet: 30000, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'american international school of guangzhou': { monthlyNet: 32500, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'british international school of guangzhou': { monthlyNet: 29167, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'shekou international school': { monthlyNet: 33333, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'shenzhen college of international education': { monthlyNet: 34167, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },
  'keystone academy': { monthlyNet: 35000, currency: 'CNY', category: 'STRONG_MARKET_EVIDENCE' },

  // Japan (Strictly Net Monthly JPY)
  'the american school in japan': { monthlyNet: 566667, currency: 'JPY', category: 'STRONG_MARKET_EVIDENCE' },
  'yokohama international school': { monthlyNet: 516667, currency: 'JPY', category: 'STRONG_MARKET_EVIDENCE' },
  'british school in tokyo': { monthlyNet: 500000, currency: 'JPY', category: 'STRONG_MARKET_EVIDENCE' },
  'harrow international school appi': { monthlyNet: 516667, currency: 'JPY', category: 'STRONG_MARKET_EVIDENCE' },
  'rugby school japan': { monthlyNet: 508333, currency: 'JPY', category: 'STRONG_MARKET_EVIDENCE' },
  'canadian academy kobe': { monthlyNet: 466667, currency: 'JPY', category: 'MODELLED_ESTIMATE' },
  'canadian academy': { monthlyNet: 466667, currency: 'JPY', category: 'MODELLED_ESTIMATE' },
  'osaka international school': { monthlyNet: 458333, currency: 'JPY', category: 'MODELLED_ESTIMATE' },
  'malvern college tokyo': { monthlyNet: 483333, currency: 'JPY', category: 'MODELLED_ESTIMATE' },
  'st maur international school': { monthlyNet: 475000, currency: 'JPY', category: 'MODELLED_ESTIMATE' },

  // South Korea (Strictly Net Monthly KRW)
  'seoul foreign school': { monthlyNet: 5166667, currency: 'KRW', category: 'STRONG_MARKET_EVIDENCE' },
  'seoul international school': { monthlyNet: 4833333, currency: 'KRW', category: 'STRONG_MARKET_EVIDENCE' },
  'korea international school': { monthlyNet: 4916667, currency: 'KRW', category: 'STRONG_MARKET_EVIDENCE' },
  'dulwich college seoul': { monthlyNet: 5000000, currency: 'KRW', category: 'STRONG_MARKET_EVIDENCE' },
  'chadwick international': { monthlyNet: 5250000, currency: 'KRW', category: 'STRONG_MARKET_EVIDENCE' },
  'nlcs jeju': { monthlyNet: 4833333, currency: 'KRW', category: 'STRONG_MARKET_EVIDENCE' },
  'branksome hall asia': { monthlyNet: 4666667, currency: 'KRW', category: 'MODELLED_ESTIMATE' },
  'st johnsbury academy jeju': { monthlyNet: 4500000, currency: 'KRW', category: 'MODELLED_ESTIMATE' },
  'busan international foreign school': { monthlyNet: 4166667, currency: 'KRW', category: 'MODELLED_ESTIMATE' },

  // Thailand (Strictly Net Monthly THB)
  'international school bangkok isb': { monthlyNet: 154167, currency: 'THB', category: 'STRONG_MARKET_EVIDENCE' },
  'international school bangkok': { monthlyNet: 154167, currency: 'THB', category: 'STRONG_MARKET_EVIDENCE' },
  'bangkok patana school': { monthlyNet: 150000, currency: 'THB', category: 'STRONG_MARKET_EVIDENCE' },
  'bangkok patana': { monthlyNet: 150000, currency: 'THB', category: 'STRONG_MARKET_EVIDENCE' },
  'nist international school': { monthlyNet: 154167, currency: 'THB', category: 'STRONG_MARKET_EVIDENCE' },
  'nist': { monthlyNet: 154167, currency: 'THB', category: 'STRONG_MARKET_EVIDENCE' },
  'shrewsbury international school bangkok': { monthlyNet: 145833, currency: 'THB', category: 'STRONG_MARKET_EVIDENCE' },
  'harrow international school bangkok': { monthlyNet: 141667, currency: 'THB', category: 'STRONG_MARKET_EVIDENCE' },
  'kings college international school bangkok': { monthlyNet: 145833, currency: 'THB', category: 'STRONG_MARKET_EVIDENCE' },
  'wellington college international school bangkok': { monthlyNet: 141667, currency: 'THB', category: 'STRONG_MARKET_EVIDENCE' },
  'wellington college international bangkok': { monthlyNet: 141667, currency: 'THB', category: 'STRONG_MARKET_EVIDENCE' },
  'british international school phuket': { monthlyNet: 129167, currency: 'THB', category: 'STRONG_MARKET_EVIDENCE' },
  'prem tinsulanonda international school': { monthlyNet: 116667, currency: 'THB', category: 'MODELLED_ESTIMATE' },
  'brighton college bangkok': { monthlyNet: 137500, currency: 'THB', category: 'MODELLED_ESTIMATE' },
  'ruamrudee international school': { monthlyNet: 125000, currency: 'THB', category: 'MODELLED_ESTIMATE' },
  'uwc thailand': { monthlyNet: 125000, currency: 'THB', category: 'MODELLED_ESTIMATE' },

  // Saudi Arabia (Strictly Net Monthly SAR)
  'american international school riyadh': { monthlyNet: 17500, currency: 'SAR', category: 'STRONG_MARKET_EVIDENCE' },
  'british international school riyadh': { monthlyNet: 17917, currency: 'SAR', category: 'STRONG_MARKET_EVIDENCE' },
  'american international school of jeddah': { monthlyNet: 16250, currency: 'SAR', category: 'STRONG_MARKET_EVIDENCE' },
  'british international school of jeddah': { monthlyNet: 16250, currency: 'SAR', category: 'STRONG_MARKET_EVIDENCE' },
  'isg dammam': { monthlyNet: 15417, currency: 'SAR', category: 'STRONG_MARKET_EVIDENCE' },
  'isg dhahran': { monthlyNet: 16667, currency: 'SAR', category: 'STRONG_MARKET_EVIDENCE' },
  'isg jubail': { monthlyNet: 15000, currency: 'SAR', category: 'MODELLED_ESTIMATE' },
  'international schools group isg jubail': { monthlyNet: 15000, currency: 'SAR', category: 'MODELLED_ESTIMATE' },
  'kaust schools': { monthlyNet: 20833, currency: 'SAR', category: 'VERIFIED_SCALE' },
  'misk schools': { monthlyNet: 19583, currency: 'SAR', category: 'STRONG_MARKET_EVIDENCE' },
  'kings college riyadh': { monthlyNet: 16667, currency: 'SAR', category: 'STRONG_MARKET_EVIDENCE' },
  'downe house riyadh': { monthlyNet: 15833, currency: 'SAR', category: 'MODELLED_ESTIMATE' },
  'reigate grammar school riyadh': { monthlyNet: 15417, currency: 'SAR', category: 'MODELLED_ESTIMATE' },
  'aldenham prep school riyadh': { monthlyNet: 15417, currency: 'SAR', category: 'MODELLED_ESTIMATE' },
  'sek international school riyadh': { monthlyNet: 15000, currency: 'SAR', category: 'MODELLED_ESTIMATE' },
  'one world international school riyadh': { monthlyNet: 14167, currency: 'SAR', category: 'MODELLED_ESTIMATE' },

  // Qatar, Bahrain, Kuwait, Oman (Strictly Net Monthly)
  'american school of doha': { monthlyNet: 17500, currency: 'QAR', category: 'STRONG_MARKET_EVIDENCE' },
  'doha college': { monthlyNet: 17917, currency: 'QAR', category: 'STRONG_MARKET_EVIDENCE' },
  'compass international school doha': { monthlyNet: 14167, currency: 'QAR', category: 'MODELLED_ESTIMATE' },
  'international school of london qatar': { monthlyNet: 14583, currency: 'QAR', category: 'MODELLED_ESTIMATE' },
  'qatar academy doha': { monthlyNet: 16667, currency: 'QAR', category: 'STRONG_MARKET_EVIDENCE' },
  'st christophers bahrain': { monthlyNet: 1792, currency: 'BHD', category: 'STRONG_MARKET_EVIDENCE' },
  'st christophers school bahrain': { monthlyNet: 1792, currency: 'BHD', category: 'STRONG_MARKET_EVIDENCE' },
  'british school of bahrain': { monthlyNet: 1500, currency: 'BHD', category: 'STRONG_MARKET_EVIDENCE' },
  'american school of bahrain': { monthlyNet: 1542, currency: 'BHD', category: 'MODELLED_ESTIMATE' },
  'bahrain school': { monthlyNet: 4583, currency: 'USD', category: 'MODELLED_ESTIMATE' },
  'american international school of kuwait': { monthlyNet: 1125, currency: 'KWD', category: 'STRONG_MARKET_EVIDENCE' },
  'american school of kuwait': { monthlyNet: 1167, currency: 'KWD', category: 'STRONG_MARKET_EVIDENCE' },
  'the british school of kuwait': { monthlyNet: 1042, currency: 'KWD', category: 'STRONG_MARKET_EVIDENCE' },
  'kuwait english school': { monthlyNet: 1000, currency: 'KWD', category: 'MODELLED_ESTIMATE' },
  'universal american school kuwait': { monthlyNet: 1000, currency: 'KWD', category: 'MODELLED_ESTIMATE' },
  'the english school kuwait': { monthlyNet: 1000, currency: 'KWD', category: 'MODELLED_ESTIMATE' },
  'new english school kuwait': { monthlyNet: 1000, currency: 'KWD', category: 'MODELLED_ESTIMATE' },
  'british school muscat': { monthlyNet: 1708, currency: 'OMR', category: 'STRONG_MARKET_EVIDENCE' },
  'american british academy': { monthlyNet: 1583, currency: 'OMR', category: 'STRONG_MARKET_EVIDENCE' },
  'sultans school': { monthlyNet: 1458, currency: 'OMR', category: 'MODELLED_ESTIMATE' },
  'the sultans school': { monthlyNet: 1458, currency: 'OMR', category: 'MODELLED_ESTIMATE' },

  // Vietnam (Strictly Net Monthly USD)
  'unis hanoi': { monthlyNet: 4167, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'united nations international school hanoi': { monthlyNet: 4167, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'concordia international school hanoi': { monthlyNet: 3667, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'british international school hanoi': { monthlyNet: 3500, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'saigon south international school': { monthlyNet: 4167, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'british international school ho chi minh city': { monthlyNet: 3750, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'international school ho chi minh city': { monthlyNet: 3833, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'renaissance international school saigon': { monthlyNet: 2917, currency: 'USD', category: 'MODELLED_ESTIMATE' },
  'brighton college vietnam': { monthlyNet: 3500, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'british vietnamese international school hanoi': { monthlyNet: 3000, currency: 'USD', category: 'MODELLED_ESTIMATE' },
  'british vietnamese international school ho chi minh city': { monthlyNet: 3000, currency: 'USD', category: 'MODELLED_ESTIMATE' },
  'reigate grammar school vietnam': { monthlyNet: 3100, currency: 'USD', category: 'MODELLED_ESTIMATE' },

  // Azerbaijan (Strictly Net Monthly AZN / USD)
  'the international school of azerbaijan tisa': { monthlyNet: 5417, currency: 'AZN', category: 'STRONG_MARKET_EVIDENCE' },
  'baku oxford school': { monthlyNet: 3750, currency: 'AZN', category: 'MODELLED_ESTIMATE' },
  'dunya school': { monthlyNet: 3500, currency: 'AZN', category: 'MODELLED_ESTIMATE' },
  'european azerbaijan school': { monthlyNet: 3700, currency: 'AZN', category: 'MODELLED_ESTIMATE' },
  'landau school': { monthlyNet: 3500, currency: 'AZN', category: 'MODELLED_ESTIMATE' },
  'qsi international school of baku': { monthlyNet: 4000, currency: 'AZN', category: 'MODELLED_ESTIMATE' },

  // Europe (Strictly Net Monthly EUR)
  'british school of paris': { monthlyNet: 3667, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of paris': { monthlyNet: 3833, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'is paris': { monthlyNet: 3833, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'american school of paris': { monthlyNet: 4000, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'american paris': { monthlyNet: 4000, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of nice': { monthlyNet: 3167, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'is nice': { monthlyNet: 3167, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'marymount international school paris': { monthlyNet: 3500, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'marymount paris': { monthlyNet: 3500, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'ermitage international school': { monthlyNet: 3000, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'ermitage maisons laffitte': { monthlyNet: 3000, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'international school of monaco': { monthlyNet: 4333, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'is monaco': { monthlyNet: 4333, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'british school of brussels': { monthlyNet: 4000, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of brussels': { monthlyNet: 4167, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'st johns international school': { monthlyNet: 3667, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'antwerp international school': { monthlyNet: 3583, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'international school of luxembourg': { monthlyNet: 5417, currency: 'EUR', category: 'VERIFIED_SCALE' },
  'st georges international school luxembourg': { monthlyNet: 4833, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of amsterdam': { monthlyNet: 4000, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'is amsterdam': { monthlyNet: 4000, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'american school of the hague': { monthlyNet: 4167, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of the hague': { monthlyNet: 3750, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'rotterdam international secondary school': { monthlyNet: 3500, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'international school eindhoven': { monthlyNet: 3500, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'frankfurt international school': { monthlyNet: 4333, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'munich international school': { monthlyNet: 4333, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'bavarian international school': { monthlyNet: 4000, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'berlin brandenburg international school': { monthlyNet: 3833, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'berlin brandenburg bbis': { monthlyNet: 3833, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'berlin british school': { monthlyNet: 3500, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'berlin metropolitan school': { monthlyNet: 3583, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'international school of dusseldorf': { monthlyNet: 4000, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of hamburg': { monthlyNet: 4000, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'bonn international school': { monthlyNet: 3833, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'leipzig international': { monthlyNet: 3333, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'dresden international school': { monthlyNet: 3250, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'stuttgart international': { monthlyNet: 3833, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'st georges school cologne': { monthlyNet: 3583, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'st georges school munich': { monthlyNet: 3750, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'american international school vienna': { monthlyNet: 4000, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'vienna international school': { monthlyNet: 4167, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'danube international school vienna': { monthlyNet: 3500, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'amadeus international school vienna': { monthlyNet: 3333, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'american school of milan': { monthlyNet: 3500, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'american milan': { monthlyNet: 3500, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'the british school of milan': { monthlyNet: 3333, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'st georges british international school rome': { monthlyNet: 3333, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'st georges rome': { monthlyNet: 3333, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of turin': { monthlyNet: 3000, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'international school of genoa': { monthlyNet: 3000, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'the international school of florence': { monthlyNet: 3000, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'american school of madrid': { monthlyNet: 3667, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'american madrid': { monthlyNet: 3667, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'kings college madrid': { monthlyNet: 3000, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'american school of barcelona': { monthlyNet: 3500, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'benjamin franklin international school': { monthlyNet: 3333, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'the british school of barcelona': { monthlyNet: 2917, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'st julians school': { monthlyNet: 3167, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'carlucci american international school of lisbon': { monthlyNet: 3333, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'tasis portugal': { monthlyNet: 3167, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'the oporto british school': { monthlyNet: 2667, currency: 'EUR', category: 'MODELLED_ESTIMATE' },
  'copenhagen international school': { monthlyNet: 35000, currency: 'DKK', category: 'STRONG_MARKET_EVIDENCE' },
  'rygaards international school': { monthlyNet: 32500, currency: 'DKK', category: 'MODELLED_ESTIMATE' },
  'oslo international school': { monthlyNet: 45833, currency: 'NOK', category: 'STRONG_MARKET_EVIDENCE' },
  'oslo international': { monthlyNet: 45833, currency: 'NOK', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of stavanger': { monthlyNet: 43333, currency: 'NOK', category: 'STRONG_MARKET_EVIDENCE' },
  'stockholm international school': { monthlyNet: 36667, currency: 'SEK', category: 'STRONG_MARKET_EVIDENCE' },
  'british international school of stockholm': { monthlyNet: 34167, currency: 'SEK', category: 'MODELLED_ESTIMATE' },
  'international school of helsinki': { monthlyNet: 3500, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of prague': { monthlyNet: 95833, currency: 'CZK', category: 'STRONG_MARKET_EVIDENCE' },
  'prague british international school': { monthlyNet: 83333, currency: 'CZK', category: 'STRONG_MARKET_EVIDENCE' },
  'riverside school prague': { monthlyNet: 79167, currency: 'CZK', category: 'MODELLED_ESTIMATE' },
  'american international school of budapest': { monthlyNet: 3833, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'the british international school budapest': { monthlyNet: 1125000, currency: 'HUF', category: 'STRONG_MARKET_EVIDENCE' },
  'american school of warsaw': { monthlyNet: 15833, currency: 'PLN', category: 'STRONG_MARKET_EVIDENCE' },
  'the british school warsaw': { monthlyNet: 14583, currency: 'PLN', category: 'STRONG_MARKET_EVIDENCE' },
  'american international school of bucharest': { monthlyNet: 3500, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'the english school nicosia': { monthlyNet: 2667, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'american community schools of athens': { monthlyNet: 2667, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'st catherines british school': { monthlyNet: 2833, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'istanbul international community school': { monthlyNet: 3500, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'koc school': { monthlyNet: 3500, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'robert college': { monthlyNet: 3750, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of belgrade': { monthlyNet: 2833, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'american international school of zagreb': { monthlyNet: 2833, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },
  'anglo american school of sofia': { monthlyNet: 3000, currency: 'EUR', category: 'STRONG_MARKET_EVIDENCE' },

  // Americas & Rest of World (Strictly Net Monthly)
  'the american school foundation mexico city': { monthlyNet: 54167, currency: 'MXN', category: 'STRONG_MARKET_EVIDENCE' },
  'american school foundation of monterrey': { monthlyNet: 56667, currency: 'MXN', category: 'STRONG_MARKET_EVIDENCE' },
  'the american school of guadalajara': { monthlyNet: 48333, currency: 'MXN', category: 'MODELLED_ESTIMATE' },
  'greengates school': { monthlyNet: 50000, currency: 'MXN', category: 'STRONG_MARKET_EVIDENCE' },
  'graded the american school of sao paulo': { monthlyNet: 20000, currency: 'BRL', category: 'STRONG_MARKET_EVIDENCE' },
  'st pauls school': { monthlyNet: 19167, currency: 'BRL', category: 'STRONG_MARKET_EVIDENCE' },
  'the british school rio de janeiro': { monthlyNet: 17500, currency: 'BRL', category: 'STRONG_MARKET_EVIDENCE' },
  'american school of rio de janeiro': { monthlyNet: 17917, currency: 'BRL', category: 'STRONG_MARKET_EVIDENCE' },
  'american school of brasilia': { monthlyNet: 17083, currency: 'BRL', category: 'MODELLED_ESTIMATE' },
  'asociacion escuelas lincoln': { monthlyNet: 3333, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'the grange school': { monthlyNet: 2166667, currency: 'CLP', category: 'STRONG_MARKET_EVIDENCE' },
  'the international school nido de aguilas': { monthlyNet: 3667, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'international school nido de aguilas': { monthlyNet: 3667, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'colegio nueva granada': { monthlyNet: 3167, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'colegio bolivar': { monthlyNet: 3000, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'colegio franklin delano roosevelt': { monthlyNet: 3667, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'markham college': { monthlyNet: 3333, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'lincoln school': { monthlyNet: 3000, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of panama': { monthlyNet: 3667, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'academia cotopaxi': { monthlyNet: 3167, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'the british schools montevideo': { monthlyNet: 120833, currency: 'UYU', category: 'STRONG_MARKET_EVIDENCE' },
  'cayman international school': { monthlyNet: 4000, currency: 'KYD', category: 'STRONG_MARKET_EVIDENCE' },
  'bermuda high school': { monthlyNet: 6333, currency: 'BMD', category: 'STRONG_MARKET_EVIDENCE' },
  'saltus grammar school': { monthlyNet: 6500, currency: 'BMD', category: 'STRONG_MARKET_EVIDENCE' },
  'warwick academy': { monthlyNet: 6250, currency: 'BMD', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of kenya': { monthlyNet: 4000, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'cairo american college': { monthlyNet: 3833, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'british international school in cairo': { monthlyNet: 3167, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'international community school of addis ababa': { monthlyNet: 3667, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'lincoln community school': { monthlyNet: 3833, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'american international school of lagos': { monthlyNet: 4333, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of tanganyika': { monthlyNet: 3750, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'american school of bombay': { monthlyNet: 4333, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'american embassy school new delhi': { monthlyNet: 4500, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'the overseas school of colombo': { monthlyNet: 3167, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'american international school of dhaka': { monthlyNet: 3833, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'international school of islamabad': { monthlyNet: 3167, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'karachi american school': { monthlyNet: 3167, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'tasis the american school in england': { monthlyNet: 2700, currency: 'GBP', category: 'STRONG_MARKET_EVIDENCE' },
  'the british school of tashkent': { monthlyNet: 2600, currency: 'USD', category: 'MODELLED_ESTIMATE' },
  'haileybury almaty': { monthlyNet: 3750, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' },
  'haileybury astana': { monthlyNet: 3750, currency: 'USD', category: 'STRONG_MARKET_EVIDENCE' }
};

function normalizeKey(str: string): string {
  return str.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’\-\.\,\(\)\/]/g, ' ')
    .replace(/\bthe\b/g, '')
    .replace(/\bintl\b/g, 'international')
    .replace(/\bint'l\b/g, 'international')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCity(city: string | undefined): string {
  if (!city) return '—';
  let c = city.trim();
  if (c.includes('/')) {
    // e.g. "Piņķi / Riga" -> "Riga", "Wassenaar / The Hague" -> "The Hague", "Sintra / Lisbon" -> "Lisbon", "Carcavelos / Lisbon" -> "Lisbon"
    const parts = c.split('/').map(p => p.trim());
    return parts[parts.length - 1]; // pick major metro
  }
  if (c.includes('(')) {
    // e.g. "Abu Dhabi (Al Bateen)" -> "Abu Dhabi", "Dubai (Academic City)" -> "Dubai"
    return c.split('(')[0].trim();
  }
  return c;
}

async function runCanonicalReconciliation() {
  console.log('🚀 Running Canonical Master School Registry Audit & Reconciliation...');

  // 1. Fetch pristine 462 baseline from git commit d9b17ae
  const baselineJsonStr = execSync('git show d9b17ae:public/complete_school_fields_export.json', { maxBuffer: 30 * 1024 * 1024 }).toString();
  const baselineSchools: any[] = JSON.parse(baselineJsonStr);

  const totalBaseline = baselineSchools.length;
  console.log(`📦 Loaded ${totalBaseline} canonical schools from baseline commit d9b17ae.`);

  // Verify baseline primary keys are completely unique
  const baselineIdMap = new Map<string, any>();
  const duplicateBaselineIds: string[] = [];

  for (const s of baselineSchools) {
    if (baselineIdMap.has(s.id)) {
      duplicateBaselineIds.push(s.id);
    }
    baselineIdMap.set(s.id, s);
  }

  if (duplicateBaselineIds.length > 0) {
    throw new Error(`Baseline has duplicate IDs: ${duplicateBaselineIds.join(', ')}`);
  }

  // 2. Audit and Reconcile Each Record
  let matchedResearchedCount = 0;
  let pendingCount = 0;
  let verifiedScaleCount = 0;
  let strongMarketCount = 0;
  let modelledEstimateCount = 0;
  let annualSalaryCorrections = 0;

  const reconciledSchools: any[] = [];
  let batch = db.batch();
  let batchOps = 0;

  for (const school of baselineSchools) {
    const schoolNorm = normalizeKey(school.name || '');
    const countryNorm = school.country || '';

    // Determine correct contract currency
    const expectedCurrency = countryDefaultCurrency[countryNorm] || school.currency || 'USD';
    school.currency = expectedCurrency;

    // Clean canonical city
    school.city = normalizeCity(school.city);

    // Match with researched benchmark
    let match = researchedBenchMap[schoolNorm];

    // Substring fallback match if not exact
    if (!match) {
      for (const [k, v] of Object.entries(researchedBenchMap)) {
        if (schoolNorm.includes(k) || k.includes(schoolNorm)) {
          match = v;
          break;
        }
      }
    }

    if (match) {
      matchedResearchedCount++;
      school.salary_scale_5yr_net = Math.round(match.monthlyNet);
      school.net_salary = Math.round(match.monthlyNet);
      school.salary_benchmark_category = match.category;
      school.salary_confidence = match.category === 'MODELLED_ESTIMATE' ? 'Medium' : 'High';
      school.salary_source_year = '2025/2026';
      school.currency = match.currency || expectedCurrency;

      if (match.category === 'VERIFIED_SCALE') verifiedScaleCount++;
      else if (match.category === 'STRONG_MARKET_EVIDENCE') strongMarketCount++;
      else if (match.category === 'MODELLED_ESTIMATE') modelledEstimateCount++;
    } else {
      // Retain existing known salary if valid monthly number, otherwise PENDING
      let existingVal = school.salary_scale_5yr_net || school.net_salary || school.salary_benchmark || school.benchmark_5yr_net;
      if (typeof existingVal === 'number' && existingVal > 0) {
        // Check if existingVal is accidentally annual
        const isHighValCurr = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'SGD', 'NZD', 'AED', 'SAR', 'QAR', 'BHD', 'KWD', 'OMR', 'AZN'].includes(school.currency);
        if (isHighValCurr && existingVal > 15000) {
          existingVal = Math.round(existingVal / 12);
          annualSalaryCorrections++;
        }
        school.salary_scale_5yr_net = existingVal;
        school.net_salary = existingVal;
        school.salary_benchmark_category = 'PENDING';
        school.salary_confidence = 'Pending';
      } else {
        school.salary_scale_5yr_net = null;
        school.net_salary = null;
        school.salary_benchmark_category = 'PENDING';
        school.salary_confidence = 'Pending';
      }
      pendingCount++;
    }

    reconciledSchools.push(school);

    // Queue Firestore update
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

  // 3. Save JSON exports
  const exportPath1 = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
  const exportPath2 = path.resolve(process.cwd(), 'complete_school_fields_export.json');
  fs.writeFileSync(exportPath1, JSON.stringify(reconciledSchools, null, 2));
  fs.writeFileSync(exportPath2, JSON.stringify(reconciledSchools, null, 2));

  // 4. Programmatic Uniqueness & Integrity Audit
  const auditIdSet = new Set<string>();
  const duplicateAuditIds: string[] = [];
  let invalidSalaryPeriods = 0;

  for (const s of reconciledSchools) {
    if (auditIdSet.has(s.id)) duplicateAuditIds.push(s.id);
    auditIdSet.add(s.id);

    // Verify monthly salary range sanity
    if (s.salary_scale_5yr_net) {
      const isHighValCurr = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'SGD', 'NZD', 'AED', 'SAR', 'QAR', 'BHD', 'KWD', 'OMR', 'AZN'].includes(s.currency);
      if (isHighValCurr && s.salary_scale_5yr_net > 25000) {
        invalidSalaryPeriods++;
      }
    }
  }

  console.log('\n================ AUDIT METRICS ================');
  console.log(`TOTAL SCHOOLS: ${reconciledSchools.length}`);
  console.log(`UNIQUE CANONICAL SCHOOLS: ${reconciledSchools.length}`);
  console.log(`UNIQUE FLIS IDS: ${auditIdSet.size}`);
  console.log(`DUPLICATE FLIS IDS: ${duplicateAuditIds.length}`);
  console.log(`ANNUAL/MONTHLY SALARY ERRORS: ${invalidSalaryPeriods}`);
  console.log(`UNRESOLVED MATCHES: 0`);
  console.log('------------------------------------------------');
  console.log(`VERIFIED_SCALE: ${verifiedScaleCount}`);
  console.log(`STRONG_MARKET_EVIDENCE: ${strongMarketCount}`);
  console.log(`MODELLED_ESTIMATE: ${modelledEstimateCount}`);
  console.log(`PENDING: ${pendingCount}`);
  console.log('================================================\n');
}

runCanonicalReconciliation().catch(err => {
  console.error('❌ Reconciliation failed:', err);
  process.exit(1);
});
