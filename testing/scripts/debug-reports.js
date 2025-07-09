// Debug script for Reports page
const puppeteer = require('puppeteer');

async function debugReports() {
  console.log('🔍 Debugging Reports Page...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('Browser Console:', msg.text()));
    page.on('pageerror', error => console.log('Browser Error:', error.message));
    
    // Navigate to reports page directly
    console.log('📊 Navigating to Reports page...');
    await page.goto('http://localhost:3000/reports', { waitUntil: 'networkidle0' });
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get page content
    const pageContent = await page.content();
    console.log('📄 Page HTML length:', pageContent.length);
    
    // Check for specific elements
    const elements = await page.evaluate(() => {
      const results = {};
      
      // Check for main elements
      results.h1 = document.querySelector('h1')?.textContent;
      results.h2 = document.querySelector('h2')?.textContent;
      results.h3 = document.querySelector('h3')?.textContent;
      
      // Check for specific classes
      results.bgWhiteRounded = document.querySelectorAll('.bg-white.rounded-2xl').length;
      results.bgYellow50 = document.querySelectorAll('.bg-yellow-50').length;
      results.textSlate500 = document.querySelectorAll('.text-slate-500').length;
      results.textSlate500Lg = document.querySelectorAll('.text-slate-500.text-lg').length;
      
      // Check for buttons
      results.buttons = document.querySelectorAll('button').length;
      results.downloadButtons = document.querySelectorAll('button:contains("Download")').length;
      
      // Check for navigation
      results.navLinks = document.querySelectorAll('nav a').length;
      
      // Get all text content
      results.bodyText = document.body.textContent.substring(0, 500);
      
      return results;
    });
    
    console.log('🔍 Page Analysis:', JSON.stringify(elements, null, 2));
    
    // Take a screenshot
    await page.screenshot({ path: 'reports-debug.png', fullPage: true });
    console.log('📸 Screenshot saved as reports-debug.png');
    
    // Check if there are any React errors
    const reactErrors = await page.evaluate(() => {
      return window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.getCurrentFiber()?.memoizedState;
    });
    
    if (reactErrors) {
      console.log('⚛️ React state found');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugReports().catch(console.error); 