// Fetch more records from the 23-24 base and look for any year-identifying fields
async function run() {
  const token = process.env.AIRTABLE_PAT;
  if (!token) { console.log('AIRTABLE_PAT not set'); process.exit(1); }

  const BASE_ID = 'appQpRPypqTqk6emb';

  // Fetch 50 records to look at all fields
  let url = `https://api.airtable.com/v0/${BASE_ID}/Students?pageSize=50&cellFormat=string&timeZone=America%2FDenver&userLocale=en-us`;
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await resp.json();

  console.log(`Fetched ${data.records.length} records`);

  // Look at School Year (the raw linked record field, not the formula)
  // and other potentially year-identifying fields
  const targetFields = [
    'School Year Text',
    'School Year',
    'Enrollment History',
    'Enrollment Date',
    'Created',
    'Last Modified',
    'New/Returning (from Student Truth)',
    'Status of Enrollment (from Student Truth)',
    'Current Time',
    'Public School Finance Funding - Effective Date',
    'Public School Finance Funding - Status',
  ];

  // Tally unique values for each field
  const fieldValues = {};
  for (const r of data.records) {
    for (const field of targetFields) {
      if (r.fields[field] !== undefined) {
        if (!fieldValues[field]) fieldValues[field] = {};
        const v = JSON.stringify(r.fields[field]);
        fieldValues[field][v] = (fieldValues[field][v] || 0) + 1;
      }
    }
  }

  for (const [field, values] of Object.entries(fieldValues)) {
    console.log(`\n=== ${field} ===`);
    const sorted = Object.entries(values).sort((a, b) => b[1] - a[1]);
    sorted.slice(0, 10).forEach(([v, c]) => console.log(`  [${c}x] ${v}`));
  }

  // Also look at 5 specific records in detail
  console.log('\n\n=== Full details for first 5 records ===');
  data.records.slice(0, 5).forEach((r, i) => {
    console.log(`\nRecord ${i+1}: ${r.fields["Student's Legal First Name (as stated on their birth certificate)"]} ${r.fields["Student's Legal Last Name"]}`);
    Object.entries(r.fields).forEach(([k, v]) => {
      if (v && JSON.stringify(v) !== '""' && JSON.stringify(v) !== '[]') {
        console.log(`  ${k}: ${JSON.stringify(v).substring(0, 100)}`);
      }
    });
  });

  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
