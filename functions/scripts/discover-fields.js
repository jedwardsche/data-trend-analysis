const baseIds = ['appnol2rxwLMp4WfV', 'appQpRPypqTqk6emb'];
const pat = process.env.AIRTABLE_PAT;

async function fetchFields(baseId) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: { Authorization: `Bearer ${pat}` }
  });
  const data = await res.json();
  const studentsTable = data.tables?.find(t => t.name === 'Students');
  if (!studentsTable) {
    console.log(`Base ${baseId}: No Students table found. Tables:`, data.tables?.map(t => t.name));
    return;
  }
  console.log(`\n=== Base ${baseId} - Students table ===`);
  console.log(`Fields (${studentsTable.fields.length}):`);
  studentsTable.fields.forEach(f => {
    console.log(`  ${f.type.padEnd(20)} | ${f.name}`);
  });
}

(async () => {
  for (const id of baseIds) {
    await fetchFields(id);
  }
})();
