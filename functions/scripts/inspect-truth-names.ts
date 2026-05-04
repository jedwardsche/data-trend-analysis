/**
 * Inspect Truth record names and campus values for micro-campus students
 */

const BASE_ID = 'appnol2rxwLMp4WfV';

async function main() {
  const token = process.env.AIRTABLE_PAT;
  if (!token) { console.error('AIRTABLE_PAT required'); process.exit(1); }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Fetch Student Truth records with all relevant fields
  console.log('=== Fetching Student Truth records (all fields for campus analysis) ===\n');
  const url = `https://api.airtable.com/v0/${BASE_ID}/Student%20Truth`;

  const fields = [
    'Name (from Truth)',
    'Campus (from Truth)',
    'Name (from MC Coordinator) (from Truth)',
    'Staff (From Truth)',
    'Full Name (from Staff) (from Truth)',
    'Type Campus',
    'Status of Enrollment',
    'School Year',
    'Student Full Name'
  ];

  const params = new URLSearchParams({
    pageSize: '100',
    cellFormat: 'string',
    timeZone: 'America/Denver',
    userLocale: 'en-us'
  });
  for (const f of fields) {
    params.append('fields[]', f);
  }

  const res = await fetch(`${url}?${params}`, { headers });
  const data = await res.json() as any;

  // Aggregate by Campus (from Truth) and Name (from Truth)
  const campusTypes = new Map<string, number>();
  const truthNames = new Map<string, number>();
  const coordinators = new Map<string, number>();
  const typeCampus = new Map<string, number>();

  for (const record of data.records || []) {
    const f = record.fields;
    const campus = f['Campus (from Truth)'] || '(empty)';
    const truthName = f['Name (from Truth)'] || '(empty)';
    const coordinator = f['Name (from MC Coordinator) (from Truth)'] || f['Full Name (from Staff) (from Truth)'] || '(empty)';
    const type = f['Type Campus'] || '(empty)';

    campusTypes.set(campus, (campusTypes.get(campus) || 0) + 1);
    truthNames.set(truthName, (truthNames.get(truthName) || 0) + 1);
    coordinators.set(`${truthName} -> ${coordinator}`, (coordinators.get(`${truthName} -> ${coordinator}`) || 0) + 1);
    typeCampus.set(type, (typeCampus.get(type) || 0) + 1);
  }

  console.log('Campus (from Truth) values:');
  for (const [k, v] of [...campusTypes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v.toString().padStart(4)}  ${k}`);
  }

  console.log('\nName (from Truth) values:');
  for (const [k, v] of [...truthNames.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v.toString().padStart(4)}  ${k}`);
  }

  console.log('\nTruth Name -> MC Coordinator:');
  for (const [k, v] of [...coordinators.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v.toString().padStart(4)}  ${k}`);
  }

  console.log('\nType Campus values:');
  for (const [k, v] of [...typeCampus.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v.toString().padStart(4)}  ${k}`);
  }

  // Show a few full micro-campus records
  console.log('\n=== Sample Micro-Campus records ===');
  const microRecords = (data.records || []).filter((r: any) =>
    (r.fields['Campus (from Truth)'] || '').toLowerCase().includes('micro')
  );
  for (const record of microRecords.slice(0, 5)) {
    console.log(`\n  Student: ${record.fields['Student Full Name']}`);
    console.log(`  Campus (from Truth): ${record.fields['Campus (from Truth)']}`);
    console.log(`  Name (from Truth): ${record.fields['Name (from Truth)']}`);
    console.log(`  MC Coordinator: ${record.fields['Name (from MC Coordinator) (from Truth)']}`);
    console.log(`  Staff: ${record.fields['Full Name (from Staff) (from Truth)']}`);
    console.log(`  Type Campus: ${record.fields['Type Campus']}`);
    console.log(`  Status: ${record.fields['Status of Enrollment']}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
