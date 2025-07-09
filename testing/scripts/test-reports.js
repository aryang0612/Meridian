// Test script for Meridian AI Reports functionality
// This script tests the reports page and PDF generation

const puppeteer = require('puppeteer');

async function testReports() {
  console.log('🧪 Starting Reports Functionality Test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to the application
    console.log('📱 Navigating to Meridian AI...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    console.log('✅ Dashboard loaded successfully');
    
    // Check if we're on the dashboard
    const title = await page.$eval('h1', el => el.textContent);
    console.log(`📋 Page title: ${title}`);
    
    // Navigate to reports page
    console.log('📊 Navigating to Reports page...');
    await page.click('a[href="/reports"]');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    const reportsTitle = await page.$eval('h1', el => el.textContent);
    console.log(`📋 Reports page title: ${reportsTitle}`);
    
    // Check if reports page shows the expected content
    const hasProfitLossCard = await page.$('.bg-white.rounded-2xl');
    if (hasProfitLossCard) {
      console.log('✅ Reports page layout loaded correctly');
    } else {
      console.log('❌ Reports page layout not found');
    }
    
    // Check for sample data banner
    const sampleBanner = await page.$('.bg-yellow-50');
    if (sampleBanner) {
      console.log('✅ Sample data banner is visible');
    } else {
      console.log('⚠️ Sample data banner not found');
    }
    
    // Check if "Please select or upload a file" message is shown
    const uploadMessage = await page.$eval('.text-slate-500.text-lg', el => el.textContent);
    console.log(`📝 Upload message: ${uploadMessage}`);
    
    // Test period selector
    console.log('🔄 Testing period selector...');
    const periodSelector = await page.$('select');
    if (periodSelector) {
      console.log('✅ Period selector found');
      
      // Test changing period
      await page.select('select', 'q4');
      await page.waitForTimeout(1000);
      
      const selectedPeriod = await page.$eval('select', el => el.value);
      console.log(`📅 Selected period: ${selectedPeriod}`);
    } else {
      console.log('❌ Period selector not found');
    }
    
    // Navigate back to dashboard to upload test data
    console.log('🔄 Going back to dashboard to upload test data...');
    await page.click('a[href="/"]');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check if file upload area is present
    const uploadArea = await page.$('input[type="file"]');
    if (uploadArea) {
      console.log('✅ File upload area found');
    } else {
      console.log('❌ File upload area not found');
    }
    
    // Test with sample CSV data
    console.log('📁 Testing with sample CSV data...');
    
    // Create a sample CSV file for testing
    const sampleCSV = `Date,Description,Amount,Category
2024-01-15,Service Revenue,5000.00,Consulting Services
2024-02-20,Product Sales,8500.00,Product Sales
2024-03-10,Subscription Revenue,3200.00,Recurring Revenue
2024-01-05,Office Rent,-1200.00,Rent Expense
2024-01-10,Internet & Phone,-150.00,Utilities
2024-02-01,Marketing Campaign,-800.00,Marketing
2024-02-15,Office Supplies,-250.00,Office Expenses`;
    
    // Upload the file
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click('input[type="file"]')
    ]);
    
    // Create a temporary file and upload it
    const fs = require('fs');
    const path = require('path');
    const tempFile = path.join(__dirname, 'test-sample.csv');
    fs.writeFileSync(tempFile, sampleCSV);
    
    await fileChooser.accept([tempFile]);
    
    // Wait for processing
    console.log('⏳ Waiting for file processing...');
    await page.waitForTimeout(5000);
    
    // Check if processing completed
    const processingComplete = await page.$('.text-green-600');
    if (processingComplete) {
      console.log('✅ File processing completed successfully');
    } else {
      console.log('⚠️ File processing status unclear');
    }
    
    // Navigate back to reports to see the data
    console.log('📊 Going back to reports to check data...');
    await page.click('a[href="/reports"]');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check if reports now show data
    await page.waitForTimeout(2000);
    
    // Look for revenue/expense data
    const hasRevenueData = await page.$('.bg-green-50');
    const hasExpenseData = await page.$('.bg-red-50');
    
    if (hasRevenueData || hasExpenseData) {
      console.log('✅ Reports now showing financial data');
    } else {
      console.log('❌ Reports not showing financial data');
    }
    
    // Test PDF download button (if available)
    const pdfButton = await page.$('button:has-text("Download PDF")');
    if (pdfButton) {
      console.log('✅ PDF download button found');
      
      // Test PDF generation
      console.log('📄 Testing PDF generation...');
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("Download PDF")')
      ]);
      
      console.log(`📄 PDF download started: ${download.suggestedFilename()}`);
    } else {
      console.log('⚠️ PDF download button not found (may need file upload first)');
    }
    
    // Clean up
    fs.unlinkSync(tempFile);
    
    console.log('🎉 Reports functionality test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testReports().catch(console.error); 