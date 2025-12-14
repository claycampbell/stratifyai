/**
 * Targeted KPI Recording Test
 * Specifically tests the user-reported issue: KPI entries not saving
 */

const { chromium } = require('playwright');

const CONFIG = {
  baseUrl: 'https://stratifyai.pro',
  credentials: {
    email: 'clay@seawolfai.net',
    password: 'Camps3116'
  },
  timeout: 30000
};

async function login(page) {
  await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', CONFIG.credentials.email);
  await page.fill('input[type="password"]', CONFIG.credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home)?$/, { timeout: CONFIG.timeout });
  await page.waitForTimeout(2000);
}

async function testKPIRecording() {
  console.log('='.repeat(80));
  console.log('KPI Recording Test - User Issue Verification');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Track API calls
  const apiCalls = [];
  page.on('response', response => {
    if (response.url().includes('/api/kpis')) {
      apiCalls.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method()
      });
    }
  });

  try {
    console.log('\n1. Logging in...');
    await login(page);
    console.log('✓ Logged in successfully');

    console.log('\n2. Navigating to KPIs page...');
    await page.goto(`${CONFIG.baseUrl}/kpis`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✓ On KPIs page');

    console.log('\n3. Looking for "Gameday App" KPI...');
    // Look for any text containing KPI names
    const gamedayKPI = page.locator('text=/gameday/i').first();

    if (await gamedayKPI.count() > 0) {
      console.log('✓ Found Gameday App KPI');
      console.log('\n4. Clicking KPI to open detail modal...');
      await gamedayKPI.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('⚠ Gameday App not found, using first KPI in list');
      // Click any KPI - look for elements with KPI-like structure
      const firstKPI = page.locator('text=/Total|Revenue|Tickets|Followers|Attendance/i').first();
      if (await firstKPI.count() > 0) {
        await firstKPI.click();
        await page.waitForTimeout(3000);
      } else {
        console.log('✗ No KPIs found');
        await browser.close();
        return;
      }
    }

    // Verify modal opened
    const modalVisible = await page.locator('[class*="modal"], [class*="fixed inset"]').isVisible().catch(() => false);
    if (modalVisible) {
      console.log('✓ Modal opened');
    } else {
      console.log('✗ Modal did not open');
      await browser.close();
      return;
    }

    console.log('\n5. Clicking "History" tab...');
    const historyTab = page.locator('button:has-text("History"), [role="tab"]:has-text("History")').first();
    if (await historyTab.count() > 0) {
      await historyTab.click();
      await page.waitForTimeout(1000);
      console.log('✓ Clicked History tab');
    } else {
      console.log('⚠ History tab not found, may already be on History tab');
    }

    console.log('\n6. Clicking "Add Entry" button...');
    const addEntryBtn = page.locator('button:has-text("Add Entry")').first();
    if (await addEntryBtn.count() > 0 && await addEntryBtn.isVisible().catch(() => false)) {
      await addEntryBtn.click();
      await page.waitForTimeout(1000);
      
      console.log('✓ Clicked Add Entry button');
    } else {
      console.log('✗ Add Entry button not found or not visible');
      
      await browser.close();
      return;
    }

    console.log('\n7. Looking for input form...');
    await page.waitForTimeout(500);

    const valueInput = page.locator('input[type="number"]').first();
    const dateInput = page.locator('input[type="date"]').first();

    const valueVisible = await valueInput.isVisible().catch(() => false);
    const dateVisible = await dateInput.isVisible().catch(() => false);

    console.log(`  Value input visible: ${valueVisible}`);
    console.log(`  Date input visible: ${dateVisible}`);

    if (!valueVisible || !dateVisible) {
      console.log('✗ Form inputs not visible');
      

      // Debug: show all visible inputs
      const allInputs = await page.locator('input:visible').all();
      console.log(`  Total visible inputs on page: ${allInputs.length}`);
      for (const input of allInputs) {
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        console.log(`    - Input type="${type}" placeholder="${placeholder}"`);
      }

      await browser.close();
      return;
    }

    console.log('✓ Form is visible');

    console.log('\n8. Filling in test data...');
    const testValue = '10981'; // User's example value
    const testDate = new Date().toISOString().split('T')[0]; // Today's date

    await valueInput.fill(testValue);
    console.log(`  ✓ Entered value: ${testValue}`);

    await dateInput.fill(testDate);
    console.log(`  ✓ Entered date: ${testDate}`);

    await page.waitForTimeout(500);
    

    console.log('\n9. Submitting form...');
    apiCalls.length = 0; // Clear previous API calls

    const submitBtn = page.locator('button:has-text("Add Entry"), button:has-text("Submit")').last();
    if (await submitBtn.count() > 0 && await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      console.log('  ✓ Clicked submit button');
    } else {
      console.log('  ✗ Submit button not found');
      await browser.close();
      return;
    }

    // Wait for API response
    console.log('\n10. Waiting for API response...');
    await page.waitForTimeout(5000);

    console.log('\n11. Checking API calls...');
    const historyApiCalls = apiCalls.filter(call => call.url.includes('/history'));

    console.log(`  Total KPI API calls: ${apiCalls.length}`);
    console.log(`  History API calls: ${historyApiCalls.length}`);

    if (historyApiCalls.length > 0) {
      historyApiCalls.forEach(call => {
        console.log(`    - ${call.method} ${call.url}: ${call.status}`);
      });

      const successCall = historyApiCalls.find(call => call.status >= 200 && call.status < 300);
      if (successCall) {
        console.log('  ✓ API call successful!');
      } else {
        console.log('  ✗ API call failed');
      }
    } else {
      console.log('  ✗ No history API calls detected');
      console.log('  📋 All API calls:');
      apiCalls.forEach(call => {
        console.log(`      ${call.method} ${call.url}: ${call.status}`);
      });
    }

    

    // Check for success/error messages
    console.log('\n12. Checking for feedback messages...');
    const successMsg = await page.locator('text=/success|saved|added/i').isVisible().catch(() => false);
    const errorMsg = await page.locator('text=/error|failed/i').isVisible().catch(() => false);

    if (successMsg) {
      console.log('  ✓ Success message displayed');
    } else if (errorMsg) {
      const errorText = await page.locator('text=/error|failed/i').first().textContent();
      console.log(`  ✗ Error message: ${errorText}`);
    } else {
      console.log('  ⚠ No success or error message visible');
    }

    console.log('\n13. Refreshing page to check if data persisted...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    

    // Look for the value we entered
    const valueFound = await page.locator(`text=/10981/`).isVisible().catch(() => false);
    if (valueFound) {
      console.log('  ✓ Value 10981 found after refresh - DATA PERSISTED!');
    } else {
      console.log('  ✗ Value 10981 NOT found after refresh - data may not have saved');
    }

    // Final verdict
    console.log('\n' + '='.repeat(80));
    console.log('FINAL VERDICT');
    console.log('='.repeat(80));

    if (historyApiCalls.length > 0 && historyApiCalls.some(c => c.status >= 200 && c.status < 300) && valueFound) {
      console.log('✅ KPI RECORDING WORKS CORRECTLY');
      console.log('   - API call was sent');
      console.log('   - API returned success');
      console.log('   - Data persisted after refresh');
    } else {
      console.log('❌ KPI RECORDING BUG CONFIRMED');
      if (historyApiCalls.length === 0) {
        console.log('   - No API call was sent (frontend issue)');
      } else if (!historyApiCalls.some(c => c.status >= 200 && c.status < 300)) {
        console.log('   - API call failed (backend issue)');
      } else if (!valueFound) {
        console.log('   - Data did not persist (database issue)');
      }
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    
  } finally {
    await browser.close();
  }
}

testKPIRecording().catch(console.error);
