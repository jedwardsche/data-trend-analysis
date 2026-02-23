// Trace the exact source of 2023-24 records — fetch from Airtable and see what years are extracted
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'che-kpi-analytics'
});
const db = admin.firestore();

async function fetchPage(baseId, token, offset) {
  let url = `https://api.airtable.com/v0/${baseId}/Students?pageSize=100&cellFormat=string&timeZone=America%2FDenver&userLocale=en-us`;
  if (offset) url += `&offset=${offset}`;
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  return resp.json();
}

async function run() {
  const token = process.env.AIRTABLE_PAT;
  if (!token) { console.log('AIRTABLE_PAT not set'); process.exit(1); }

  // Fetch the 23-24/24-25 base (appQpRPypqTqk6emb) — first 200 records
  const BASE_ID = 'appQpRPypqTqk6emb';
  console.log(`Fetching records from 23-24/24-25 base ${BASE_ID}...`);

  const page1 = await fetchPage(BASE_ID, token, null);
  const page2 = page1.offset ? await fetchPage(BASE_ID, token, page1.offset) : { records: [] };
  const records = [...(page1.records || []), ...(page2.records || [])];
  console.log(`Fetched ${records.length} records`);

  // Analyze the School Year Text field values
  const yearTextValues = {};
  let noYear = 0;
  for (const r of records) {
    const yearText = r.fields['School Year Text'];
    if (!yearText) { noYear++; continue; }
    yearTextValues[yearText] = (yearTextValues[yearText] || 0) + 1;
  }
  console.log(`\nRecords with no School Year Text: ${noYear}`);
  console.log(`\nSchool Year Text values (top 15):`);
  Object.entries(yearTextValues).sort((a,b) => b[1]-a[1]).slice(0, 15).forEach(([v, c]) => {
    console.log(`  [${c}x] "${v}"`);
  });

  // What years do we extract?
  function normalizeSchoolYear(yearStr) {
    const cleaned = yearStr.trim();
    const match = cleaned.match(/(\d{4})\s*[-–—]\s*(\d{2,4})/);
    if (!match) return cleaned.toLowerCase();
    const start = match[1];
    const end = match[2].length === 4 ? match[2].slice(2) : match[2];
    return `${start}-${end}`;
  }

  function extractSchoolYears(yearStr) {
    if (!yearStr) return [];
    const parts = yearStr.split(',').map(s => s.trim()).filter(Boolean);
    const years = [];
    for (const part of parts) {
      const normalized = normalizeSchoolYear(part);
      if (normalized && /^\d{4}-\d{2}$/.test(normalized)) {
        years.push(normalized);
      }
    }
    return [...new Set(years)];
  }

  const yearCounts = {};
  let unmatched = 0;
  for (const r of records) {
    const yearText = r.fields['School Year Text'];
    if (!yearText) { unmatched++; continue; }
    const years = extractSchoolYears(yearText);
    if (years.length === 0) { unmatched++; continue; }
    years.forEach(y => { yearCounts[y] = (yearCounts[y] || 0) + 1; });
  }
  console.log(`\nExtracted year distribution from ${records.length} records:`);
  Object.entries(yearCounts).sort().forEach(([y, c]) => console.log(`  ${y}: ${c}`));
  console.log(`  Unmatched: ${unmatched}`);

  // So if School Year Text only contains "2025-2026: ...", we only extract "2025-26"
  // Which means no records match "2023-24" or "2024-25"
  // Which means the fallback runs... but wait:

  // Check: does base 1 (appnol2rxwLMp4WfV) produce any students for 2025-26?
  // If it does, totalFetched > 0, so the fallback won't fire
  // But if the ONLY base producing students is base 1, and base 2 produces 0 matches,
  // then the 23-24 and 24-25 records in Firestore came from... where?

  // Let me check: do the existing 2023-24 Firestore records have syncedAt timestamps
  // that match the manual sync runs?
  const snap2324 = await db.collection('students')
    .where('schoolYear', '==', '2023-24')
    .orderBy('syncedAt', 'desc')
    .limit(5)
    .get();
  console.log('\nMost recently synced 2023-24 students:');
  snap2324.docs.forEach(d => {
    const data = d.data();
    console.log(`  ${data.firstName} ${data.lastName}: syncedAt=${data.syncedAt}, id=${data.id}`);
  });

  const snap2526 = await db.collection('students')
    .where('schoolYear', '==', '2025-26')
    .orderBy('syncedAt', 'desc')
    .limit(5)
    .get();
  console.log('\nMost recently synced 2025-26 students:');
  snap2526.docs.forEach(d => {
    const data = d.data();
    console.log(`  ${data.firstName} ${data.lastName}: syncedAt=${data.syncedAt}`);
  });

  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
