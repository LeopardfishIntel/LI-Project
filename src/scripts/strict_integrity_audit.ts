import * as fs from 'fs';
import * as path from 'path';

const file1Path = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
const file2Path = '/Users/roger.keen/.gemini/antigravity-ide/brain/63ac4345-83e5-4993-a7b2-abf84d292e0d/canonical_school_benchmarks_462.json';

const raw1 = fs.readFileSync(file1Path, 'utf-8');
const raw2 = fs.readFileSync(file2Path, 'utf-8');

const list1: any[] = JSON.parse(raw1);
const list2: any[] = JSON.parse(raw2);

const allowedCategories = new Set(['VERIFIED_SCALE', 'STRONG_MARKET_EVIDENCE', 'MODELLED_ESTIMATE', 'PENDING']);
const standardCurrencies = new Set([
  'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'USD', 'KES', 'ZAR',
  'EUR', 'GBP', 'CHF', 'DKK', 'NOK', 'SEK', 'PLN', 'CZK', 'HUF', 'AZN',
  'CNY', 'HKD', 'TWD', 'JPY', 'KRW', 'SGD', 'THB', 'MYR', 'BND', 'INR',
  'BRL', 'MXN', 'COP', 'CLP', 'UYU', 'KYD', 'BMD', 'CAD', 'AUD', 'NZD'
]);

function auditDataset(name: string, list: any[]) {
  const idMap = new Map<string, any[]>();
  const nameCountryMap = new Map<string, any[]>();
  const issues: string[] = [];

  let missingId = 0;
  let missingName = 0;
  let missingCountry = 0;
  let missingCity = 0;
  let missingCurrency = 0;
  let invalidCurrency = 0;
  let invalidCategory = 0;
  let negativeOrZeroSalary = 0;
  let suspiciousSalaries: any[] = [];

  list.forEach((item, idx) => {
    // 1. ID check
    if (!item.id) {
      missingId++;
      issues.push(`Record index ${idx} is missing an 'id'.`);
    } else {
      const arr = idMap.get(item.id) || [];
      arr.push(item);
      idMap.set(item.id, arr);
    }

    // 2. Name check
    if (!item.name) {
      missingName++;
      issues.push(`Record [${item.id || idx}] is missing 'name'.`);
    }

    // 3. Country check
    if (!item.country) {
      missingCountry++;
      issues.push(`Record [${item.id || idx}] (${item.name}) is missing 'country'.`);
    }

    // 4. City check
    if (!item.city || item.city === '—') {
      missingCity++;
    }

    // 5. Currency check
    if (!item.currency) {
      missingCurrency++;
      issues.push(`Record [${item.id}] (${item.name}) is missing 'currency'.`);
    } else if (!standardCurrencies.has(item.currency)) {
      invalidCurrency++;
      issues.push(`Record [${item.id}] (${item.name}) has unrecognised currency '${item.currency}'.`);
    }

    // 6. Name + Country uniqueness
    if (item.name && item.country) {
      const key = `${item.name.toLowerCase().trim()} || ${item.country.toLowerCase().trim()}`;
      const arr = nameCountryMap.get(key) || [];
      arr.push(item);
      nameCountryMap.set(key, arr);
    }

    // 7. Benchmark category
    const cat = item.salary_benchmark_category;
    if (cat && !allowedCategories.has(cat)) {
      invalidCategory++;
      issues.push(`Record [${item.id}] (${item.name}) has invalid category '${cat}'.`);
    }

    // 8. Salary values
    const salary = item.salary_scale_5yr_net ?? item.salary_scale_5yr_net_monthly;
    if (typeof salary === 'number') {
      if (salary <= 0) {
        negativeOrZeroSalary++;
        issues.push(`Record [${item.id}] (${item.name}) has non-positive salary ${salary}.`);
      } else {
        // Check suspicious salary
        const isHighCurr = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'SGD', 'NZD', 'AED', 'SAR', 'QAR', 'BHD', 'KWD', 'OMR', 'AZN'].includes(item.currency);
        if (isHighCurr && salary > 30000) {
          suspiciousSalaries.push({ id: item.id, name: item.name, curr: item.currency, val: salary, reason: 'High-value currency salary > 30,000 / mo' });
        } else if (['USD', 'EUR', 'GBP', 'CHF'].includes(item.currency) && salary < 500) {
          suspiciousSalaries.push({ id: item.id, name: item.name, curr: item.currency, val: salary, reason: 'Major currency monthly salary < 500' });
        }
      }
    }
  });

  const duplicateIds = Array.from(idMap.entries()).filter(([k, v]) => v.length > 1);
  const duplicateNameCountries = Array.from(nameCountryMap.entries()).filter(([k, v]) => v.length > 1);

  return {
    name,
    totalRecords: list.length,
    uniqueIds: idMap.size,
    duplicateIdCount: duplicateIds.length,
    duplicateIds,
    duplicateNameCountryCount: duplicateNameCountries.length,
    duplicateNameCountries,
    missingId,
    missingName,
    missingCountry,
    missingCity,
    missingCurrency,
    invalidCurrency,
    invalidCategory,
    negativeOrZeroSalary,
    suspiciousSalaries,
    rawIssues: issues
  };
}

const audit1 = auditDataset('public/complete_school_fields_export.json', list1);
const audit2 = auditDataset('canonical_school_benchmarks_462.json', list2);

console.log(JSON.stringify({ audit1, audit2 }, null, 2));
