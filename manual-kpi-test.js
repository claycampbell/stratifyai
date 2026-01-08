const { chromium } = require('playwright');

const CONFIG = {
  baseUrl: 'https://stratifyai.pro',
  credentials: {
    email: 'clay@seawolfai.net',
    password: 'Camps3116'
  }
};

(async () => {
  console.log('================================================================================');
  console.log('Manual KPI Testing - Interactive Mode');
  console.log('================================================================================');
  console.log('');
  console.log('🌐 WATCH FOR CHROME BROWSER WINDOW TO OPEN! 🌐');
  console.log('The browser will open in a few seconds and perform actions automatically.');
  console.log('You can watch it navigate through the site and add a KPI entry.');
  console.log('');
  console.log('Starting in 3 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000, // Slow down actions so you can see them
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Enable console logging from the page
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  try {
    console.log('Step 1: Logging in...');
    await page.goto(`${CONFIG.baseUrl}/login`);
    await page.fill('input[type="email"]', CONFIG.credentials.email);
    await page.fill('input[type="password"]', CONFIG.credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${CONFIG.baseUrl}/`, { timeout: 30000 });
    console.log('✓ Logged in successfully\n');

    console.log('Step 2: Navigating to KPIs page...');
    await page.goto(`${CONFIG.baseUrl}/kpis`);
    await page.waitForTimeout(2000);
    console.log('✓ On KPIs page\n');

    console.log('Step 3: Finding Gameday App KPI...');
    await page.waitForSelector('text=/Gameday/i');
    console.log('✓ Found Gameday KPI\n');

    console.log('Step 4: Clicking to open details...');
    const kpiCard = page.locator('text=/Gameday App/i').first();
    await kpiCard.click();
    await page.waitForTimeout(1500);
    console.log('✓ Modal opened\n');

    console.log('Step 5: Clicking History tab...');

    // Try different selectors for History tab
    const historyTabSelectors = [
      'button:has-text("History")',
      '[role="tab"]:has-text("History")',
      'div:has-text("History")',
      'text=History'
    ];

    let historyTabFound = false;
    for (const selector of historyTabSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        historyTabFound = true;
        console.log(`✓ Clicked History tab using: ${selector}`);
        break;
      } catch (e) {
        console.log(`  ⚠ Selector didn't work: ${selector}`);
      }
    }

    if (!historyTabFound) {
      console.log('  ❌ Could not find History tab!');
      await page.screenshot({ path: 'history-tab-error.png' });
    }

    await page.waitForTimeout(2000);
    console.log('');

    console.log('Step 6: Looking for Add Entry button...');

    // Take a screenshot to see what we have
    await page.screenshot({ path: 'before-add-entry.png' });
    console.log('  📸 Screenshot saved: before-add-entry.png');

    // Try different selectors for Add Entry button
    const addButtonSelectors = [
      'button:has-text("Add Entry")',
      'button:has-text("Add")',
      'button[type="button"]:has-text("Add")',
      'text=Add Entry',
      '[class*="add"]'
    ];

    let buttonFound = false;
    for (const selector of addButtonSelectors) {
      try {
        const button = page.locator(selector).first();
        const count = await button.count();
        console.log(`  Found ${count} elements with selector: ${selector}`);
        if (count > 0) {
          await button.click({ timeout: 2000 });
          buttonFound = true;
          console.log(`✓ Clicked Add button using: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`  ⚠ Selector didn't work: ${selector}`);
      }
    }

    if (!buttonFound) {
      console.log('  ❌ Could not find Add Entry button!');
      await page.screenshot({ path: 'add-button-error.png' });
      throw new Error('Add Entry button not found');
    }

    await page.waitForTimeout(2000);
    console.log('✓ Add Entry form opened\n');

    // Generate a unique test value
    const testValue = Math.floor(Math.random() * 1000) + 15000;
    const today = new Date().toISOString().split('T')[0];

    console.log(`Step 7: Entering test data (Value: ${testValue}, Date: ${today})...`);

    await page.screenshot({ path: 'form-visible.png' });
    console.log('  📸 Screenshot saved: form-visible.png');

    // Find and fill the value input
    console.log('  Looking for value input field...');
    const valueInputSelectors = [
      'input[type="number"]',
      'input[placeholder*="value" i]',
      'input[name*="value" i]',
      'input'
    ];

    let valueEntered = false;
    for (const selector of valueInputSelectors) {
      try {
        const input = page.locator(selector).first();
        const count = await input.count();
        if (count > 0) {
          await input.fill(testValue.toString(), { timeout: 2000 });
          valueEntered = true;
          console.log(`  ✓ Entered value ${testValue} using: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`  ⚠ Value input selector didn't work: ${selector}`);
      }
    }

    if (!valueEntered) {
      console.log('  ❌ Could not find value input field!');
      console.log('  💡 Please manually enter the value: ' + testValue);
    }

    // Find and fill the date input
    console.log('  Looking for date input field...');
    const dateInputSelectors = [
      'input[type="date"]',
      'input[placeholder*="date" i]',
      'input[name*="date" i]'
    ];

    let dateEntered = false;
    for (const selector of dateInputSelectors) {
      try {
        const input = page.locator(selector).first();
        const count = await input.count();
        if (count > 0) {
          await input.fill(today, { timeout: 2000 });
          dateEntered = true;
          console.log(`  ✓ Entered date ${today} using: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`  ⚠ Date input selector didn't work: ${selector}`);
      }
    }

    if (!dateEntered) {
      console.log('  ❌ Could not find date input field!');
      console.log('  💡 Please manually enter the date: ' + today);
    }

    console.log('');

    console.log('Step 8: Submitting the form...');

    // Monitor network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/kpis/') && request.method() === 'POST') {
        requests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    const responses = [];
    page.on('response', response => {
      if (response.url().includes('/api/kpis/') && response.request().method() === 'POST') {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Click submit button
    const submitButton = page.locator('button:has-text("Add"), button:has-text("Submit"), button[type="submit"]').last();
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(3000);

    console.log('\n================================================================================');
    console.log('NETWORK ACTIVITY');
    console.log('================================================================================');

    if (responses.length > 0) {
      responses.forEach(res => {
        const status = res.status === 201 ? '✅' : '❌';
        console.log(`${status} ${res.method} ${res.url}`);
        console.log(`   Status: ${res.status} ${res.statusText}`);
      });
    } else {
      console.log('⚠️  No POST requests detected');
    }

    console.log('\n================================================================================');
    console.log('TEST COMPLETE');
    console.log('================================================================================');

    if (responses.length > 0 && responses[0].status === 201) {
      console.log(`✅ SUCCESS! KPI entry added: ${testValue} on ${today}`);
      console.log('✅ API returned HTTP 201 Created');
      console.log('✅ Data was saved to the database');
    } else {
      console.log(`⚠️  Automated entry may not have completed fully`);
      console.log(`💡 Please manually complete the form if needed:`);
      console.log(`   - Value: ${testValue}`);
      console.log(`   - Date: ${today}`);
      console.log(`   - Then click the Submit/Add button`);
    }

    console.log('\n🔍 Browser will stay open for 60 seconds so you can:');
    console.log('   1. Verify the entry was added to the History tab');
    console.log('   2. Manually complete the form if the script got stuck');
    console.log('   3. Try adding another entry manually\n');

    // Wait so user can see the result and manually interact
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nBrowser will stay open for inspection...');
    await page.waitForTimeout(30000);
  } finally {
    await browser.close();
    console.log('\nTest complete!');
  }
})();
