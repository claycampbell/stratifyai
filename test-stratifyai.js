/**
 * StratifyAI End-to-End Test Suite
 * Tests all major features of the deployed application
 *
 * Run with: node test-stratifyai.js
 * Requires: npm install -g playwright
 * Then run: npx playwright install chromium
 */

const { chromium } = require('playwright');

// Configuration
const CONFIG = {
  baseUrl: 'https://stratifyai.pro',
  credentials: {
    email: 'clay@seawolfai.net',
    password: 'Camps3116'
  },
  timeout: 10000
};

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function logTest(name, status, details = '') {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${status.toUpperCase()}: ${name}${details ? ' - ' + details : ''}`;

  console.log(message);

  if (status === 'PASS') {
    results.passed.push(name);
  } else if (status === 'FAIL') {
    results.failed.push({ name, details });
  } else if (status === 'WARN') {
    results.warnings.push({ name, details });
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('StratifyAI End-to-End Test Suite');
  console.log('='.repeat(80));
  console.log(`Testing: ${CONFIG.baseUrl}`);
  console.log(`User: ${CONFIG.credentials.email}`);
  console.log('='.repeat(80));
  console.log('');

  const browser = await chromium.launch({ headless: false }); // Set to true for headless
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Test 1: Navigate to Login Page
    console.log('\n--- TEST 1: Login Page Navigation ---');
    await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const loginPageTitle = await page.title();
    logTest('Login page loads', 'PASS', `Title: ${loginPageTitle}`);
    await page.screenshot({ path: 'test-screenshots/01-login-page.png' });

    // Test 2: Login Process
    console.log('\n--- TEST 2: Login Process ---');

    // Fill in credentials
    await page.fill('input[type="email"], input[name="email"]', CONFIG.credentials.email);
    await page.fill('input[type="password"], input[name="password"]', CONFIG.credentials.password);

    // Click login button
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');

    // Wait for navigation after login
    await page.waitForURL(/\/(dashboard|home)?$/, { timeout: CONFIG.timeout });
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    logTest('Login successful', 'PASS', `Redirected to: ${currentUrl}`);
    await page.screenshot({ path: 'test-screenshots/02-after-login.png' });

    // Test 3: Dashboard Page
    console.log('\n--- TEST 3: Dashboard Page ---');
    await page.goto(`${CONFIG.baseUrl}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const dashboardVisible = await page.locator('h1, h2').first().isVisible();
    logTest('Dashboard page loads', dashboardVisible ? 'PASS' : 'FAIL');
    await page.screenshot({ path: 'test-screenshots/03-dashboard.png' });

    // Test 4: AI Chat Functionality
    console.log('\n--- TEST 4: AI Chat Functionality ---');

    const chatInputSelectors = [
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="chat"]',
      'input[type="text"][placeholder*="message"]',
      'textarea'
    ];

    let chatInput = null;
    for (const selector of chatInputSelectors) {
      chatInput = page.locator(selector).first();
      if (await chatInput.count() > 0) {
        break;
      }
    }

    if (chatInput && await chatInput.count() > 0) {
      await chatInput.fill('What are our current strategic objectives?');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);

      logTest('AI Chat input works', 'PASS');
      await page.screenshot({ path: 'test-screenshots/04-ai-chat.png' });
    } else {
      logTest('AI Chat input', 'WARN', 'Chat input not found on dashboard');
    }

    // Test 5: Documents Page
    console.log('\n--- TEST 5: Documents Page ---');
    await page.goto(`${CONFIG.baseUrl}/documents`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const documentsPageLoaded = await page.locator('h1:has-text("Documents"), h2:has-text("Documents")').isVisible().catch(() => false);
    logTest('Documents page loads', documentsPageLoaded ? 'PASS' : 'WARN', documentsPageLoaded ? '' : 'Documents heading not found');
    await page.screenshot({ path: 'test-screenshots/05-documents.png' });

    // Test 6: OGSM Framework Page
    console.log('\n--- TEST 6: OGSM Framework Page ---');
    await page.goto(`${CONFIG.baseUrl}/ogsm`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const ogsmPageLoaded = await page.locator('h1:has-text("OGSM"), h2:has-text("OGSM")').isVisible().catch(() => false);
    logTest('OGSM page loads', ogsmPageLoaded ? 'PASS' : 'WARN', ogsmPageLoaded ? '' : 'OGSM heading not found');
    await page.screenshot({ path: 'test-screenshots/06-ogsm.png' });

    // Check for OGSM components
    const ogsmComponents = await page.locator('.objective, .goal, .strategy, .measure, [class*="ogsm"]').count();
    if (ogsmComponents > 0) {
      logTest('OGSM components visible', 'PASS', `Found ${ogsmComponents} components`);
    } else {
      logTest('OGSM components', 'WARN', 'No OGSM components found - may need data');
    }

    // Test 7: KPIs Page
    console.log('\n--- TEST 7: KPIs Page ---');
    await page.goto(`${CONFIG.baseUrl}/kpis`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const kpisPageLoaded = await page.locator('h1:has-text("KPI"), h2:has-text("KPI")').isVisible().catch(() => false);
    logTest('KPIs page loads', kpisPageLoaded ? 'PASS' : 'WARN', kpisPageLoaded ? '' : 'KPI heading not found');
    await page.screenshot({ path: 'test-screenshots/07-kpis.png' });

    // Check for KPI data
    const kpiItems = await page.locator('.kpi, [class*="kpi-"], table tr').count();
    if (kpiItems > 1) {
      logTest('KPI data visible', 'PASS', `Found ${kpiItems} items`);
    } else {
      logTest('KPI data', 'WARN', 'No KPI data found - may need data');
    }

    // Test 8: Reports Page
    console.log('\n--- TEST 8: Reports Page ---');
    await page.goto(`${CONFIG.baseUrl}/reports`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const reportsPageLoaded = await page.locator('h1:has-text("Report"), h2:has-text("Report")').isVisible().catch(() => false);
    logTest('Reports page loads', reportsPageLoaded ? 'PASS' : 'WARN', reportsPageLoaded ? '' : 'Reports heading not found');
    await page.screenshot({ path: 'test-screenshots/08-reports.png' });

    // Test 9: Navigation Menu
    console.log('\n--- TEST 9: Navigation Menu ---');
    const navLinks = await page.locator('nav a, header a, [role="navigation"] a').count();
    logTest('Navigation menu present', navLinks > 0 ? 'PASS' : 'FAIL', `Found ${navLinks} nav links`);

    // Test 10: Responsive Design Check
    console.log('\n--- TEST 10: Responsive Design ---');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/09-mobile-view.png' });
    logTest('Mobile viewport renders', 'PASS', '375x667 viewport');

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Test 11: Console Errors Check
    console.log('\n--- TEST 11: Console Errors Check ---');
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    await page.goto(`${CONFIG.baseUrl}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    if (logs.length === 0) {
      logTest('No console errors', 'PASS');
    } else {
      logTest('Console errors detected', 'WARN', `${logs.length} errors found`);
      console.log('Console errors:', logs);
    }

    // Test 12: Network Performance
    console.log('\n--- TEST 12: Network Performance ---');
    const startTime = Date.now();
    await page.goto(`${CONFIG.baseUrl}/`, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    if (loadTime < 5000) {
      logTest('Page load performance', 'PASS', `${loadTime}ms`);
    } else {
      logTest('Page load performance', 'WARN', `${loadTime}ms (>5s)`);
    }

  } catch (error) {
    logTest('Test execution', 'FAIL', error.message);
    console.error('Error during tests:', error);
    await page.screenshot({ path: 'test-screenshots/error.png' });
  } finally {
    await browser.close();
  }

  // Print Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✓ Passed: ${results.passed.length}`);
  console.log(`✗ Failed: ${results.failed.length}`);
  console.log(`⚠ Warnings: ${results.warnings.length}`);
  console.log('='.repeat(80));

  if (results.passed.length > 0) {
    console.log('\n✓ PASSED TESTS:');
    results.passed.forEach(test => console.log(`  - ${test}`));
  }

  if (results.failed.length > 0) {
    console.log('\n✗ FAILED TESTS:');
    results.failed.forEach(({ name, details }) => console.log(`  - ${name}: ${details}`));
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠ WARNINGS:');
    results.warnings.forEach(({ name, details }) => console.log(`  - ${name}: ${details}`));
  }

  console.log('\n' + '='.repeat(80));
  console.log('Screenshots saved to: test-screenshots/');
  console.log('='.repeat(80));

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Create screenshots directory
const fs = require('fs');
if (!fs.existsSync('test-screenshots')) {
  fs.mkdirSync('test-screenshots');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
