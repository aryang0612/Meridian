const fs = require('fs');
const path = require('path');

// Test the RBC CSV format
function testRBCFormat() {
  console.log('Testing RBC Bank Statement Format...\n');
  
  // Read the sample CSV
  const csvPath = path.join(__dirname, 'docs', 'training-data', 'rbc_statement_sample.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  
  console.log('CSV Content (first 10 lines):');
  console.log('='.repeat(50));
  const lines = csvContent.split('\n').slice(0, 10);
  lines.forEach((line, index) => {
    console.log(`${index + 1}: ${line}`);
  });
  console.log('='.repeat(50));
  
  // Parse CSV manually to test format
  const rows = csvContent.split('\n').filter(line => line.trim());
  const headers = rows[0].split(',');
  const dataRows = rows.slice(1);
  
  console.log('\nHeaders detected:', headers);
  console.log('\nSample transactions:');
  console.log('-'.repeat(50));
  
  let transactionCount = 0;
  dataRows.slice(0, 5).forEach((row, index) => {
    const values = row.split(',');
    if (values.length >= 4) {
      const date = values[0];
      const description = values[1];
      const withdrawal = values[2];
      const deposit = values[3];
      const balance = values[4];
      
      if (date && description && (withdrawal || deposit)) {
        transactionCount++;
        console.log(`Transaction ${transactionCount}:`);
        console.log(`  Date: ${date}`);
        console.log(`  Description: ${description}`);
        console.log(`  Withdrawal: ${withdrawal || 'N/A'}`);
        console.log(`  Deposit: ${deposit || 'N/A'}`);
        console.log(`  Balance: ${balance || 'N/A'}`);
        console.log('');
      }
    }
  });
  
  console.log(`Total valid transactions found: ${transactionCount}`);
  console.log('\n✅ RBC format test completed successfully!');
}

testRBCFormat(); 