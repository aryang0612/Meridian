// Test script for custom keywords functionality
const { CustomKeywordManager } = require('./src/data/customKeywords.ts');

// Mock localStorage for Node.js environment
if (typeof window === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  };
}

function testCustomKeywords() {
  console.log('🧪 Testing Custom Keywords Functionality...\n');

  // Get singleton instance
  const manager = CustomKeywordManager.getInstance();
  
  // Test 1: Add single keyword
  console.log('1. Testing single keyword addition...');
  const keyword1 = manager.addKeyword('starbucks', 'Meals & Entertainment', 95, 'Coffee shop purchases');
  console.log(`✅ Added keyword: ${keyword1.keyword} -> ${keyword1.category} (${keyword1.confidence}%)`);
  
  // Test 2: Add rule with multiple keywords
  console.log('\n2. Testing multi-keyword rule addition...');
  const rule1 = manager.addRule(['uber', 'lyft'], 'Motor Vehicle Expenses', 90, 'Ride-sharing services');
  console.log(`✅ Added rule: ${rule1.keywords.join(', ')} -> ${rule1.category} (${rule1.confidence}%)`);
  
  // Test 3: Test keyword matching
  console.log('\n3. Testing keyword matching...');
  const match1 = manager.findMatchingKeyword('STARBUCKS PURCHASE $5.50');
  if (match1) {
    console.log(`✅ Found match: "${match1.keyword.keyword}" -> ${match1.keyword.category} (${match1.confidence}%)`);
  } else {
    console.log('❌ No match found for Starbucks');
  }
  
  const match2 = manager.findMatchingKeyword('UBER RIDE TO AIRPORT');
  if (match2) {
    console.log(`✅ Found match: "${match2.keyword.keyword}" -> ${match2.keyword.category} (${match2.confidence}%)`);
  } else {
    console.log('❌ No match found for Uber');
  }
  
  // Test 4: Test non-matching
  console.log('\n4. Testing non-matching...');
  const noMatch = manager.findMatchingKeyword('RANDOM TRANSACTION');
  if (!noMatch) {
    console.log('✅ Correctly no match found for random transaction');
  } else {
    console.log('❌ Unexpected match found');
  }
  
  // Test 5: Get statistics
  console.log('\n5. Testing statistics...');
  const stats = manager.getStats();
  console.log(`✅ Stats: ${stats.totalKeywords} keywords, ${stats.totalRules} rules, ${stats.categories.length} categories`);
  
  // Test 6: Export functionality
  console.log('\n6. Testing export functionality...');
  const exportData = manager.exportKeywords();
  console.log(`✅ Export data length: ${exportData.length} characters`);
  
  // Test 7: Import functionality
  console.log('\n7. Testing import functionality...');
  const importResult = manager.importKeywords(exportData);
  if (importResult.success) {
    console.log('✅ Import successful');
  } else {
    console.log('❌ Import failed:', importResult.message);
  }
  
  // Test 8: Update functionality
  console.log('\n8. Testing update functionality...');
  const updated = manager.updateKeyword(keyword1.id, { confidence: 85 });
  if (updated) {
    console.log(`✅ Updated keyword confidence to ${updated.confidence}%`);
  } else {
    console.log('❌ Update failed');
  }
  
  // Test 9: Delete functionality
  console.log('\n9. Testing delete functionality...');
  const deleted = manager.removeKeyword(keyword1.id);
  if (deleted) {
    console.log('✅ Keyword deleted successfully');
  } else {
    console.log('❌ Delete failed');
  }
  
  // Test 10: Test rule matching after keyword deletion
  console.log('\n10. Testing rule matching after keyword deletion...');
  const match3 = manager.findMatchingKeyword('LYFT RIDE HOME');
  if (match3) {
    console.log(`✅ Found rule match: "${match3.keyword.keyword}" -> ${match3.keyword.category} (${match3.confidence}%)`);
  } else {
    console.log('❌ No rule match found for Lyft');
  }
  
  // Test 11: Clear all
  console.log('\n11. Testing clear functionality...');
  manager.clearAll();
  const finalStats = manager.getStats();
  if (finalStats.totalKeywords === 0 && finalStats.totalRules === 0) {
    console.log('✅ All keywords cleared successfully');
  } else {
    console.log('❌ Clear failed');
  }
  
  console.log('\n🎉 Custom Keywords Test Complete!');
}

// Run the test
try {
  testCustomKeywords();
} catch (error) {
  console.error('❌ Test failed with error:', error);
} 