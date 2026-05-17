const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/admin/AdminDashboard.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const query = process.argv[2] || 'Stripe';
console.log(`Searching for "${query}" in ${filePath}...`);

let count = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].toLowerCase().includes(query.toLowerCase())) {
    console.log(`${i + 1}: ${lines[i].trim()}`);
    count++;
    if (count > 50) {
      console.log('Too many results, stopping...');
      break;
    }
  }
}
console.log(`Found ${count} matches.`);
