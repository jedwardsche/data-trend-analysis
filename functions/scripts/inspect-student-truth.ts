/**
 * Inspect Student Truth table fields and sample micro-campus records
 */
import * as admin from 'firebase-admin';

admin.initializeApp({ projectId: 'che-kpi-analytics' });

const BASE_ID = 'appnol2rxwLMp4WfV'; // 25-26 & 26-27 base

async function main() {
  const token = process.env.AIRTABLE_PAT;
  if (!token) {
    console.error('AIRTABLE_PAT required');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 1. Fetch metadata for Student Truth table
  console.log('=== Student Truth Table Fields ===');
  const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, { headers });
  const metaData = await metaRes.json() as any;
  const truthTable = metaData.tables?.find((t: any) => t.name === 'Student Truth');
  if (truthTable) {
    for (const field of truthTable.fields) {
      console.log(`  ${field.name} (${field.type})`);
    }
  }

  // 2. Fetch a few Student Truth records with Campus = Micro-Campus
  console.log('\n=== Sample Micro-Campus Student Truth Records ===');
  const url = `https://api.airtable.com/v0/${BASE_ID}/Student Truth`;
  const params = new URLSearchParams({
    filterByFormula: "{Campus}='Micro-Campus'",
    pageSize: '5',
    cellFormat: 'string',
    timeZone: 'America/Denver',
    userLocale: 'en-us'
  });

  const res = await fetch(`${url}?${params}`, { headers });
  const data = await res.json() as any;
  for (const record of (data.records || []).slice(0, 5)) {
    console.log(`\n  Record ID: ${record.id}`);
    console.log(`  Fields:`);
    for (const [key, value] of Object.entries(record.fields)) {
      const val = typeof value === 'string' ? value.substring(0, 100) : JSON.stringify(value);
      console.log(`    ${key}: ${val}`);
    }
  }

  // 3. Also check a few branch campus truth records for comparison
  console.log('\n=== Sample Branch Campus Student Truth Records ===');
  const params2 = new URLSearchParams({
    filterByFormula: "AND({Campus}!='Micro-Campus', {Campus}!='')",
    pageSize: '3',
    cellFormat: 'string',
    timeZone: 'America/Denver',
    userLocale: 'en-us'
  });

  const res2 = await fetch(`${url}?${params2}`, { headers });
  const data2 = await res2.json() as any;
  for (const record of (data2.records || []).slice(0, 3)) {
    console.log(`\n  Record ID: ${record.id}`);
    for (const [key, value] of Object.entries(record.fields)) {
      const val = typeof value === 'string' ? value.substring(0, 100) : JSON.stringify(value);
      console.log(`    ${key}: ${val}`);
    }
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
