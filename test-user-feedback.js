/**
 * StratifyAI User Feedback Testing
 * Tests specific issues reported by users:
 * 1. AI Strategy Generator failing with "Generation Failed"
 * 2. KPI entries not recording after hitting "Add Entry"
 *
 * Run with: node test-user-feedback.js
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  baseUrl: 'https://stratifyai.pro',
  credentials: {
    email: 'clay@seawolfai.net',
    password: 'Camps3116'
  },
  timeout: 30000
};

const results = {
  passed: [],
  failed: [],
  issues: []
};

function logTest(name, status, details = '') {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${status.toUpperCase()}: ${name}${details ? ' - ' + details : ''}`;
  console.log(message);

  if (status === 'PASS') {
    results.passed.push({ name, details });
  } else if (status === 'FAIL') {
    results.failed.push({ name, details });
  } else if (status === 'ISSUE') {
    results.issues.push({ name, details });
  }
}

async function login(page) {
  await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', CONFIG.credentials.email);
  await page.fill('input[type="password"], input[name="password"]', CONFIG.credentials.password);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForURL(/\/(dashboard|home)?$/, { timeout: CONFIG.timeout });
  await page.waitForTimeout(2000);
}

async function runUserFeedbackTests() {
  console.log('='.repeat(80));
  console.log('StratifyAI User Feedback Testing');
  console.log('Testing specific user-reported issues');
  console.log('='.repeat(80));
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track network activity
  const networkRequests = [];
  const networkResponses = [];

  page.on('request', request => {
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      postData: request.postData()
    });
  });

  page.on('response', async response => {
    networkResponses.push({
      url: response.url(),
      status: response.status(),
      statusText: response.statusText()
    });
  });

  try {
    await login(page);

    // ==================== ISSUE 1: AI STRATEGY GENERATOR ====================
    console.log('\n' + '='.repeat(80));
    console.log('ISSUE 1: AI Strategy Generator - "Generation Failed"');
    console.log('='.repeat(80));

    console.log('\n--- Navigating to AI Strategy Generator ---');
    await page.goto(`${CONFIG.baseUrl}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for AI Strategy Generator link in navigation
    const strategyGenLinks = [
      'a:has-text("AI Strategy Generator")',
      'button:has-text("AI Strategy Generator")',
      '[href*="strategy"]',
      'nav a:has-text("Generator")'
    ];

    let found = false;
    for (const selector of strategyGenLinks) {
      const link = page.locator(selector).first();
      if (await link.count() > 0 && await link.isVisible().catch(() => false)) {
        console.log(`Found AI Strategy Generator using selector: ${selector}`);
        await link.click();
        await page.waitForTimeout(2000);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('Trying direct navigation to /ai-strategy-generator or similar...');
      const possibleUrls = [
        '/ai-strategy-generator',
        '/strategy-generator',
        '/generator',
        '/ai-generator',
        '/strategic-planning'
      ];

      for (const url of possibleUrls) {
        try {
          await page.goto(`${CONFIG.baseUrl}${url}`, { waitUntil: 'networkidle', timeout: 5000 });
          if (!page.url().includes('login') && !page.url().endsWith('/')) {
            console.log(`Found page at: ${url}`);
            found = true;
            break;
          }
        } catch (error) {
          // Try next URL
        }
      }
    }

    if (found) {
      await page.screenshot({ path: 'test-screenshots/feedback-01-strategy-gen-page.png' });

      console.log('\n--- Testing Strategy Generation ---');

      // Look for input fields or generate button
      const generateSelectors = [
        'button:has-text("Generate")',
        'button:has-text("Generate Strategies")',
        'button:has-text("Create")',
        'button[type="submit"]'
      ];

      let generateBtn = null;
      for (const selector of generateSelectors) {
        const btn = page.locator(selector).first();
        if (await btn.count() > 0 && await btn.isVisible().catch(() => false)) {
          generateBtn = btn;
          console.log(`Found generate button: ${selector}`);
          break;
        }
      }

      if (generateBtn) {
        // Fill in any required fields first
        const textInputs = await page.locator('input[type="text"], textarea').all();
        for (const input of textInputs) {
          if (await input.isVisible().catch(() => false)) {
            await input.fill('Test objective: Improve student-athlete performance');
            await page.waitForTimeout(500);
          }
        }

        // Clear network tracking before clicking
        networkRequests.length = 0;
        networkResponses.length = 0;

        console.log('Clicking generate button...');
        await generateBtn.click();
        await page.waitForTimeout(5000); // Wait for API call

        // Check for error messages
        const errorSelectors = [
          'text=/generation failed/i',
          'text=/failed to generate/i',
          'text=/error/i',
          '[class*="error"]',
          '[role="alert"]'
        ];

        let errorFound = false;
        let errorText = '';

        for (const selector of errorSelectors) {
          const error = page.locator(selector).first();
          if (await error.isVisible().catch(() => false)) {
            errorText = await error.textContent();
            if (errorText && (errorText.toLowerCase().includes('failed') || errorText.toLowerCase().includes('error'))) {
              errorFound = true;
              break;
            }
          }
        }

        await page.screenshot({ path: 'test-screenshots/feedback-02-strategy-gen-result.png' });

        if (errorFound) {
          logTest('AI Strategy Generator', 'ISSUE', `Error displayed: "${errorText}"`);

          // Check network requests for the API call
          const strategyRequests = networkRequests.filter(r =>
            r.url.includes('/api/ai') ||
            r.url.includes('strategy') ||
            r.url.includes('generate')
          );

          const strategyResponses = networkResponses.filter(r =>
            r.url.includes('/api/ai') ||
            r.url.includes('strategy') ||
            r.url.includes('generate')
          );

          console.log('\n🔍 Network Analysis:');
          console.log('Strategy generation requests:', strategyRequests.length);
          if (strategyRequests.length > 0) {
            console.log('Request details:', JSON.stringify(strategyRequests[0], null, 2));
          }

          console.log('\nStrategy generation responses:', strategyResponses.length);
          if (strategyResponses.length > 0) {
            strategyResponses.forEach(resp => {
              console.log(`  - ${resp.url}: ${resp.status} ${resp.statusText}`);
            });
          }

          // Check for 500 errors or API failures
          const failedResponses = strategyResponses.filter(r => r.status >= 400);
          if (failedResponses.length > 0) {
            console.log('\n❌ Failed API calls detected:');
            failedResponses.forEach(resp => {
              console.log(`  - ${resp.url}: ${resp.status} ${resp.statusText}`);
            });
          }

        } else {
          logTest('AI Strategy Generator', 'PASS', 'Strategies generated successfully');
        }

      } else {
        logTest('AI Strategy Generator', 'ISSUE', 'Generate button not found on page');
      }

    } else {
      logTest('AI Strategy Generator', 'ISSUE', 'Could not find AI Strategy Generator page');
    }

    // ==================== ISSUE 2: KPI RECORDING ====================
    console.log('\n' + '='.repeat(80));
    console.log('ISSUE 2: KPI Recording - Entries Not Saving');
    console.log('='.repeat(80));

    console.log('\n--- Navigating to KPIs page ---');
    await page.goto(`${CONFIG.baseUrl}/kpis`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/feedback-03-kpis-page.png' });

    // Look for a KPI to test with
    console.log('\n--- Looking for "Gameday App" KPI or any KPI to test ---');

    const kpiSelectors = [
      'text=/gameday app/i',
      'text=/followers/i',
      '[class*="kpi"]',
      'button:has-text("Gameday")',
      'div:has-text("Gameday")'
    ];

    let kpiElement = null;
    for (const selector of kpiSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0 && await element.isVisible().catch(() => false)) {
        kpiElement = element;
        const text = await element.textContent();
        console.log(`Found KPI element: ${text?.substring(0, 50)}...`);
        break;
      }
    }

    // If specific KPI not found, try clicking any KPI card
    if (!kpiElement) {
      console.log('Gameday App KPI not found, trying first available KPI...');
      const allKpis = await page.locator('[class*="kpi"], [class*="card"]').all();
      if (allKpis.length > 0) {
        kpiElement = allKpis[0];
      }
    }

    if (kpiElement) {
      console.log('Clicking KPI to open details...');
      await kpiElement.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-screenshots/feedback-04-kpi-clicked.png' });

      // Look for "Add Entry" or "Update" button
      console.log('\n--- Looking for Add Entry functionality ---');
      const addEntrySelectors = [
        'button:has-text("Add Entry")',
        'button:has-text("Update")',
        'button:has-text("Add")',
        'button:has-text("Save")',
        'button[type="submit"]'
      ];

      let addEntryBtn = null;
      for (const selector of addEntrySelectors) {
        const btn = page.locator(selector).first();
        if (await btn.count() > 0 && await btn.isVisible().catch(() => false)) {
          addEntryBtn = btn;
          console.log(`Found button: ${selector}`);
          break;
        }
      }

      if (addEntryBtn) {
        // Look for input fields
        const numberInputs = await page.locator('input[type="number"]').all();
        const textInputs = await page.locator('input[type="text"]').all();

        console.log(`Found ${numberInputs.length} number inputs and ${textInputs.length} text inputs`);

        // Fill in test data (like user's 10,981 followers example)
        if (numberInputs.length > 0) {
          console.log('Filling in test value: 10981');
          await numberInputs[0].fill('10981');
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'test-screenshots/feedback-05-kpi-value-entered.png' });
        }

        // Clear network tracking
        networkRequests.length = 0;
        networkResponses.length = 0;

        console.log('Clicking Add Entry button...');
        await addEntryBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-screenshots/feedback-06-kpi-after-submit.png' });

        // Check if value was saved
        const kpiUpdateRequests = networkRequests.filter(r =>
          r.url.includes('/api/kpi') ||
          r.url.includes('/kpis')
        );

        const kpiUpdateResponses = networkResponses.filter(r =>
          r.url.includes('/api/kpi') ||
          r.url.includes('/kpis')
        );

        console.log('\n🔍 Network Analysis for KPI Update:');
        console.log('KPI update requests:', kpiUpdateRequests.length);
        if (kpiUpdateRequests.length > 0) {
          console.log('Request details:');
          kpiUpdateRequests.forEach(req => {
            console.log(`  - ${req.method} ${req.url}`);
            if (req.postData) {
              console.log(`    Data: ${req.postData.substring(0, 200)}`);
            }
          });
        }

        console.log('\nKPI update responses:', kpiUpdateResponses.length);
        if (kpiUpdateResponses.length > 0) {
          kpiUpdateResponses.forEach(resp => {
            console.log(`  - ${resp.url}: ${resp.status} ${resp.statusText}`);
          });
        }

        // Check for success or error messages
        const successVisible = await page.locator('text=/success|saved|updated/i').isVisible().catch(() => false);
        const errorVisible = await page.locator('text=/error|failed/i').isVisible().catch(() => false);

        if (errorVisible) {
          const errorText = await page.locator('text=/error|failed/i').first().textContent();
          logTest('KPI Recording', 'ISSUE', `Error message shown: "${errorText}"`);
        } else if (successVisible) {
          logTest('KPI Recording', 'PASS', 'Success message displayed');
        } else if (kpiUpdateResponses.length === 0) {
          logTest('KPI Recording', 'ISSUE', 'No API request sent when Add Entry clicked - frontend may not be calling backend');
        } else if (kpiUpdateResponses.some(r => r.status >= 400)) {
          const failedResp = kpiUpdateResponses.find(r => r.status >= 400);
          logTest('KPI Recording', 'ISSUE', `API request failed with status ${failedResp.status}`);
        } else {
          logTest('KPI Recording', 'PASS', 'KPI update request sent successfully');
        }

        // Refresh page and check if value persisted
        console.log('\n--- Checking if value persisted after refresh ---');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-screenshots/feedback-07-kpi-after-refresh.png' });

        // Try to find the value we entered
        const valueVisible = await page.locator('text=/10981/').isVisible().catch(() => false);
        if (valueVisible) {
          logTest('KPI Persistence', 'PASS', 'Value 10981 found after page refresh');
        } else {
          logTest('KPI Persistence', 'ISSUE', 'Value 10981 not found after refresh - data may not have been saved');
        }

      } else {
        logTest('KPI Recording', 'ISSUE', 'Add Entry button not found');
      }

    } else {
      logTest('KPI Recording', 'ISSUE', 'Could not find any KPI to test with');
    }

    // ==================== ISSUE 3: AI STRATEGY OFFICER (Verify it works) ====================
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION: AI Strategy Officer (User reports this works)');
    console.log('='.repeat(80));

    await page.goto(`${CONFIG.baseUrl}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const aiOfficerBtn = page.locator('button:has-text("AI Strategy Officer")').first();
    if (await aiOfficerBtn.count() > 0) {
      await aiOfficerBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-screenshots/feedback-08-ai-officer-opened.png' });

      const chatInput = page.locator('textarea, input[type="text"]').last();
      if (await chatInput.count() > 0 && await chatInput.isVisible().catch(() => false)) {
        networkRequests.length = 0;
        networkResponses.length = 0;

        await chatInput.fill('What are our top 3 strategic objectives?');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        await page.screenshot({ path: 'test-screenshots/feedback-09-ai-officer-response.png' });

        const chatRequests = networkRequests.filter(r => r.url.includes('/api/ai'));
        const chatResponses = networkResponses.filter(r => r.url.includes('/api/ai'));

        if (chatResponses.some(r => r.status === 200)) {
          logTest('AI Strategy Officer', 'PASS', 'Chat working as expected');
        } else if (chatResponses.some(r => r.status >= 400)) {
          logTest('AI Strategy Officer', 'ISSUE', 'API returned error');
        } else {
          logTest('AI Strategy Officer', 'WARN', 'No clear success/failure indicator');
        }
      }
    }

  } catch (error) {
    console.error('Error during user feedback tests:', error);
    await page.screenshot({ path: 'test-screenshots/feedback-error.png' });
  } finally {
    await browser.close();
  }

  // Print Summary
  console.log('\n' + '='.repeat(80));
  console.log('USER FEEDBACK TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✓ Passed: ${results.passed.length}`);
  console.log(`✗ Failed: ${results.failed.length}`);
  console.log(`⚠ Issues Confirmed: ${results.issues.length}`);
  console.log('='.repeat(80));

  if (results.issues.length > 0) {
    console.log('\n⚠ CONFIRMED ISSUES:');
    results.issues.forEach(({ name, details }) => {
      console.log(`\n  ${name}:`);
      console.log(`    ${details}`);
    });
  }

  if (results.passed.length > 0) {
    console.log('\n✓ WORKING FEATURES:');
    results.passed.forEach(({ name, details }) => {
      console.log(`  - ${name}${details ? ': ' + details : ''}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('Screenshots saved to: test-screenshots/');
  console.log('='.repeat(80));

  process.exit(results.issues.length > 0 ? 1 : 0);
}

// Create screenshots directory
if (!fs.existsSync('test-screenshots')) {
  fs.mkdirSync('test-screenshots');
}

runUserFeedbackTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
