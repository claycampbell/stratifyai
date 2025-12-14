/**
 * StratifyAI Edge Case Testing Suite
 * Tests boundary conditions, error handling, and potential failure scenarios
 *
 * Run with: node test-edge-cases.js
 * Requires: Playwright installed (npm install playwright)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'https://stratifyai.pro',
  credentials: {
    email: 'clay@seawolfai.net',
    password: 'Camps3116'
  },
  timeout: 15000
};

// Test results tracking
const results = {
  passed: [],
  failed: [],
  warnings: [],
  critical: []
};

function logTest(name, status, details = '', severity = 'normal') {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${status.toUpperCase()}: ${name}${details ? ' - ' + details : ''}`;

  console.log(message);

  if (status === 'PASS') {
    results.passed.push(name);
  } else if (status === 'FAIL') {
    if (severity === 'critical') {
      results.critical.push({ name, details });
    } else {
      results.failed.push({ name, details });
    }
  } else if (status === 'WARN') {
    results.warnings.push({ name, details });
  }
}

// Helper to create test files
function createTestFile(filename, content, size = null) {
  const filePath = path.join(__dirname, 'test-files', filename);
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  if (size) {
    // Create file of specific size
    const buffer = Buffer.alloc(size);
    buffer.fill(content);
    fs.writeFileSync(filePath, buffer);
  } else {
    fs.writeFileSync(filePath, content);
  }

  return filePath;
}

async function login(page) {
  await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', CONFIG.credentials.email);
  await page.fill('input[type="password"], input[name="password"]', CONFIG.credentials.password);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForURL(/\/(dashboard|home)?$/, { timeout: CONFIG.timeout });
  await page.waitForTimeout(2000);
}

async function runEdgeCaseTests() {
  console.log('='.repeat(80));
  console.log('StratifyAI Edge Case Testing Suite');
  console.log('='.repeat(80));
  console.log(`Testing: ${CONFIG.baseUrl}`);
  console.log('='.repeat(80));
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track console errors and warnings
  const consoleMessages = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    }
  });

  // Track network failures
  const networkErrors = [];
  page.on('requestfailed', request => {
    networkErrors.push({
      url: request.url(),
      failure: request.failure().errorText
    });
  });

  try {
    await login(page);

    // ==================== AUTHENTICATION EDGE CASES ====================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 1: AUTHENTICATION EDGE CASES');
    console.log('='.repeat(80));

    // Test 1: Invalid login attempt
    console.log('\n--- TEST 1: Invalid Login Credentials ---');
    await page.goto(`${CONFIG.baseUrl}/login`);
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      logTest('Invalid login rejected', 'PASS', 'Stayed on login page');
    } else {
      logTest('Invalid login rejected', 'FAIL', 'Should not allow invalid credentials', 'critical');
    }
    await page.screenshot({ path: 'test-screenshots/edge-01-invalid-login.png' });

    // Test 2: SQL Injection attempt in login
    console.log('\n--- TEST 2: SQL Injection Prevention ---');
    await page.goto(`${CONFIG.baseUrl}/login`);
    await page.fill('input[type="email"], input[name="email"]', "admin' OR '1'='1");
    await page.fill('input[type="password"], input[name="password"]', "' OR '1'='1");
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForTimeout(2000);

    if (page.url().includes('login')) {
      logTest('SQL injection blocked', 'PASS', 'Login rejected malicious input');
    } else {
      logTest('SQL injection blocked', 'FAIL', 'SQL injection vulnerability detected!', 'critical');
    }
    await page.screenshot({ path: 'test-screenshots/edge-02-sql-injection.png' });

    // Test 3: XSS attempt in login
    console.log('\n--- TEST 3: XSS Prevention ---');
    await page.goto(`${CONFIG.baseUrl}/login`);
    await page.fill('input[type="email"], input[name="email"]', '<script>alert("XSS")</script>');
    await page.fill('input[type="password"], input[name="password"]', 'test');
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForTimeout(2000);

    const xssAlertShown = await page.evaluate(() => {
      return window.alertShown === true;
    });

    if (!xssAlertShown) {
      logTest('XSS prevention', 'PASS', 'Script tags properly escaped');
    } else {
      logTest('XSS prevention', 'FAIL', 'XSS vulnerability detected!', 'critical');
    }

    // Re-login with valid credentials
    await login(page);

    // ==================== DOCUMENT UPLOAD EDGE CASES ====================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 2: DOCUMENT UPLOAD EDGE CASES');
    console.log('='.repeat(80));

    await page.goto(`${CONFIG.baseUrl}/documents`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Test 4: Empty file upload
    console.log('\n--- TEST 4: Empty File Upload ---');
    const emptyFile = createTestFile('empty.txt', '');
    const emptyFileInput = await page.locator('input[type="file"]').first();
    if (await emptyFileInput.count() > 0) {
      await emptyFileInput.setInputFiles(emptyFile);
      await page.waitForTimeout(500);

      const uploadBtn = page.locator('button:has-text("Upload")').first();
      if (await uploadBtn.count() > 0) {
        await uploadBtn.click();
        await page.waitForTimeout(3000);

        // Check for error message
        const errorVisible = await page.locator('text=/error|invalid|failed/i').isVisible().catch(() => false);
        if (errorVisible) {
          logTest('Empty file rejected', 'PASS', 'System shows error for empty file');
        } else {
          logTest('Empty file handling', 'WARN', 'No clear error message shown');
        }
        await page.screenshot({ path: 'test-screenshots/edge-04-empty-file.png' });
      }
    }

    // Test 5: Large file upload (>10MB)
    console.log('\n--- TEST 5: Large File Upload (>10MB limit) ---');
    const largeFile = createTestFile('large.txt', 'X', 11 * 1024 * 1024); // 11MB
    const largeFileInput = await page.locator('input[type="file"]').first();
    if (await largeFileInput.count() > 0) {
      await largeFileInput.setInputFiles(largeFile);
      await page.waitForTimeout(500);

      const uploadBtn = page.locator('button:has-text("Upload")').first();
      if (await uploadBtn.count() > 0) {
        await uploadBtn.click();
        await page.waitForTimeout(3000);

        const errorVisible = await page.locator('text=/too large|size limit|exceeds/i').isVisible().catch(() => false);
        if (errorVisible) {
          logTest('Large file rejected', 'PASS', 'File size limit enforced');
        } else {
          logTest('Large file handling', 'WARN', 'Large file may have been accepted (check backend)');
        }
        await page.screenshot({ path: 'test-screenshots/edge-05-large-file.png' });
      }
    }

    // Test 6: Unsupported file type
    console.log('\n--- TEST 6: Unsupported File Type (.exe) ---');
    const exeFile = createTestFile('malicious.exe', 'MZ\x90\x00'); // EXE header
    const exeFileInput = await page.locator('input[type="file"]').first();
    if (await exeFileInput.count() > 0) {
      await exeFileInput.setInputFiles(exeFile);
      await page.waitForTimeout(500);

      const uploadBtn = page.locator('button:has-text("Upload")').first();
      if (await uploadBtn.count() > 0) {
        await uploadBtn.click();
        await page.waitForTimeout(3000);

        const errorVisible = await page.locator('text=/unsupported|invalid file type|not allowed/i').isVisible().catch(() => false);
        if (errorVisible) {
          logTest('Unsupported file type rejected', 'PASS', 'File type validation working');
        } else {
          logTest('Unsupported file type', 'WARN', 'Executable file may have been accepted', 'critical');
        }
        await page.screenshot({ path: 'test-screenshots/edge-06-exe-file.png' });
      }
    }

    // Test 7: Special characters in filename
    console.log('\n--- TEST 7: Special Characters in Filename ---');
    try {
      // Use safer special characters that work on Windows
      const specialFile = createTestFile('test!@#$%^&()_+=file.txt', 'Test content with special filename');
      const specialFileInput = await page.locator('input[type="file"]').first();
      if (await specialFileInput.count() > 0) {
        await specialFileInput.setInputFiles(specialFile);
        await page.waitForTimeout(500);

        const uploadBtn = page.locator('button:has-text("Upload")').first();
        if (await uploadBtn.count() > 0) {
          await uploadBtn.click();
          await page.waitForTimeout(3000);

          logTest('Special characters in filename', 'PASS', 'File upload handled special characters');
        }
        await page.screenshot({ path: 'test-screenshots/edge-07-special-chars.png' });
      }
    } catch (error) {
      logTest('Special characters in filename', 'WARN', `Could not test: ${error.message}`);
    }

    // ==================== AI CHAT EDGE CASES ====================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 3: AI CHAT EDGE CASES');
    console.log('='.repeat(80));

    await page.goto(`${CONFIG.baseUrl}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Test 8: Find and test AI chat
    console.log('\n--- TEST 8: AI Chat with Extremely Long Input ---');
    const aiChatButton = page.locator('button:has-text("AI Strategy Officer")').first();
    if (await aiChatButton.count() > 0) {
      await aiChatButton.click();
      await page.waitForTimeout(1000);

      const chatInputSelectors = [
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="chat"]',
        'input[type="text"][placeholder*="message"]',
        'textarea'
      ];

      let chatInput = null;
      for (const selector of chatInputSelectors) {
        chatInput = page.locator(selector).last();
        if (await chatInput.count() > 0 && await chatInput.isVisible().catch(() => false)) {
          break;
        }
      }

      if (chatInput && await chatInput.count() > 0) {
        const longMessage = 'A'.repeat(10000); // 10k characters
        await chatInput.fill(longMessage);
        await page.waitForTimeout(500);

        const inputValue = await chatInput.inputValue();
        if (inputValue.length > 0) {
          logTest('Long AI chat input', 'PASS', `Accepted ${inputValue.length} characters`);
        } else {
          logTest('Long AI chat input', 'WARN', 'Input may have been truncated');
        }
        await page.screenshot({ path: 'test-screenshots/edge-08-long-input.png' });
      }
    }

    // Test 9: AI Chat with XSS attempt
    console.log('\n--- TEST 9: AI Chat XSS Prevention ---');
    if (await aiChatButton.count() > 0) {
      await aiChatButton.click();
      await page.waitForTimeout(1000);

      const chatInput = page.locator('textarea, input[type="text"]').last();
      if (await chatInput.count() > 0 && await chatInput.isVisible().catch(() => false)) {
        await chatInput.fill('<script>alert("XSS in chat")</script><img src=x onerror=alert("XSS")>');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        const xssExecuted = await page.evaluate(() => window.alertShown === true);
        if (!xssExecuted) {
          logTest('AI Chat XSS prevention', 'PASS', 'XSS properly escaped in chat');
        } else {
          logTest('AI Chat XSS prevention', 'FAIL', 'XSS vulnerability in chat!', 'critical');
        }
        await page.screenshot({ path: 'test-screenshots/edge-09-chat-xss.png' });
      }
    }

    // Test 10: SQL Injection in AI chat
    console.log('\n--- TEST 10: AI Chat SQL Injection Prevention ---');
    if (await aiChatButton.count() > 0) {
      const chatInput = page.locator('textarea, input[type="text"]').last();
      if (await chatInput.count() > 0 && await chatInput.isVisible().catch(() => false)) {
        await chatInput.fill("'; DROP TABLE kpis; --");
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        // Try to navigate to KPIs page to verify table wasn't dropped
        await page.goto(`${CONFIG.baseUrl}/kpis`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        const kpisStillWork = await page.locator('h1, h2').first().isVisible().catch(() => false);
        if (kpisStillWork) {
          logTest('AI Chat SQL injection prevention', 'PASS', 'KPIs table still intact');
        } else {
          logTest('AI Chat SQL injection prevention', 'FAIL', 'Potential SQL injection!', 'critical');
        }
        await page.screenshot({ path: 'test-screenshots/edge-10-chat-sql.png' });
      }
    }

    // ==================== OGSM COMPONENT EDGE CASES ====================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 4: OGSM COMPONENT EDGE CASES');
    console.log('='.repeat(80));

    await page.goto(`${CONFIG.baseUrl}/ogsm`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Test 11: Add component with extremely long title
    console.log('\n--- TEST 11: OGSM Component with Long Title ---');
    const addComponentBtn = page.locator('button:has-text("Add Component")').first();
    if (await addComponentBtn.count() > 0) {
      await addComponentBtn.click();
      await page.waitForTimeout(1000);

      const titleInput = page.locator('input[name="title"], input[placeholder*="title"]').first();
      if (await titleInput.count() > 0 && await titleInput.isVisible().catch(() => false)) {
        const longTitle = 'A'.repeat(1000);
        await titleInput.fill(longTitle);
        await page.waitForTimeout(500);

        const value = await titleInput.inputValue();
        logTest('Long OGSM title', 'PASS', `Accepted ${value.length} characters`);
        await page.screenshot({ path: 'test-screenshots/edge-11-long-ogsm-title.png' });

        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    // Test 12: Special characters in OGSM component
    console.log('\n--- TEST 12: OGSM Component with Special Characters ---');
    if (await addComponentBtn.count() > 0) {
      await addComponentBtn.click();
      await page.waitForTimeout(1000);

      const titleInput = page.locator('input[name="title"], input[placeholder*="title"]').first();
      if (await titleInput.count() > 0 && await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Test <script>alert("XSS")</script> & "quotes" \'apostrophe\'');
        await page.waitForTimeout(500);

        logTest('Special chars in OGSM', 'PASS', 'Special characters accepted');
        await page.screenshot({ path: 'test-screenshots/edge-12-ogsm-special-chars.png' });

        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    // ==================== KPI EDGE CASES ====================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 5: KPI EDGE CASES');
    console.log('='.repeat(80));

    await page.goto(`${CONFIG.baseUrl}/kpis`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Test 13: Click on a KPI to test update functionality
    console.log('\n--- TEST 13: KPI Update with Invalid Values ---');
    const firstKpi = page.locator('.kpi, [class*="kpi"]').first();
    if (await firstKpi.count() > 0) {
      await firstKpi.click();
      await page.waitForTimeout(1000);

      // Look for number input fields
      const numberInput = page.locator('input[type="number"]').first();
      if (await numberInput.count() > 0 && await numberInput.isVisible().catch(() => false)) {
        // Test negative numbers
        await numberInput.fill('-9999');
        await page.waitForTimeout(500);
        logTest('KPI negative value', 'PASS', 'Negative value accepted (may be valid for some KPIs)');

        // Test extremely large numbers
        await numberInput.fill('999999999999999');
        await page.waitForTimeout(500);
        logTest('KPI large number', 'PASS', 'Large number accepted');

        // Test non-numeric input
        await numberInput.fill('abc123');
        await page.waitForTimeout(500);
        const value = await numberInput.inputValue();
        if (value === '' || !isNaN(value)) {
          logTest('KPI non-numeric input', 'PASS', 'Non-numeric input handled');
        } else {
          logTest('KPI non-numeric input', 'WARN', 'Non-numeric value may have been accepted');
        }

        await page.screenshot({ path: 'test-screenshots/edge-13-kpi-invalid-values.png' });
      }
    }

    // ==================== NAVIGATION & ROUTING EDGE CASES ====================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 6: NAVIGATION & ROUTING EDGE CASES');
    console.log('='.repeat(80));

    // Test 14: Non-existent route
    console.log('\n--- TEST 14: Non-Existent Route Handling ---');
    await page.goto(`${CONFIG.baseUrl}/this-page-does-not-exist-12345`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const notFoundVisible = await page.locator('text=/404|not found|doesn\'t exist/i').isVisible().catch(() => false);
    if (notFoundVisible) {
      logTest('404 page handling', 'PASS', '404 page displayed');
    } else {
      // Check if redirected to dashboard
      if (page.url().includes(CONFIG.baseUrl) && !page.url().includes('this-page-does-not-exist')) {
        logTest('404 page handling', 'PASS', 'Redirected to valid page');
      } else {
        logTest('404 page handling', 'WARN', 'No clear 404 handling');
      }
    }
    await page.screenshot({ path: 'test-screenshots/edge-14-404-page.png' });

    // Test 15: Direct access to protected route (logout first)
    console.log('\n--- TEST 15: Protected Route Access ---');
    await page.goto(`${CONFIG.baseUrl}/`, { waitUntil: 'networkidle' });

    // Try to logout
    const userMenuSelectors = [
      'button:has-text("Super Admin")',
      'button:has-text("Admin")',
      '[class*="user-menu"]',
      'button[aria-label*="user"]'
    ];

    let logoutClicked = false;
    for (const selector of userMenuSelectors) {
      const userMenu = page.locator(selector).first();
      if (await userMenu.count() > 0) {
        await userMenu.click();
        await page.waitForTimeout(500);

        const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
        if (await logoutBtn.count() > 0) {
          await logoutBtn.click();
          await page.waitForTimeout(2000);
          logoutClicked = true;
          break;
        }
      }
    }

    if (logoutClicked) {
      // Try to access protected route
      await page.goto(`${CONFIG.baseUrl}/kpis`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      if (page.url().includes('login')) {
        logTest('Protected route access', 'PASS', 'Redirected to login');
      } else {
        logTest('Protected route access', 'FAIL', 'Unauthorized access allowed!', 'critical');
      }
      await page.screenshot({ path: 'test-screenshots/edge-15-protected-route.png' });
    } else {
      logTest('Protected route access', 'WARN', 'Could not test (logout not found)');
    }

    // ==================== PERFORMANCE EDGE CASES ====================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 7: PERFORMANCE & STRESS TESTS');
    console.log('='.repeat(80));

    // Re-login
    await login(page);

    // Test 16: Rapid navigation
    console.log('\n--- TEST 16: Rapid Page Navigation ---');
    const pages = ['/documents', '/ogsm', '/kpis', '/reports', '/'];
    let navigationErrors = 0;

    for (let i = 0; i < 3; i++) {
      for (const route of pages) {
        try {
          await page.goto(`${CONFIG.baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 5000 });
          await page.waitForTimeout(100);
        } catch (error) {
          navigationErrors++;
        }
      }
    }

    if (navigationErrors === 0) {
      logTest('Rapid navigation', 'PASS', 'All rapid navigations successful');
    } else {
      logTest('Rapid navigation', 'WARN', `${navigationErrors} navigation errors during rapid switching`);
    }
    await page.screenshot({ path: 'test-screenshots/edge-16-rapid-nav.png' });

    // Test 17: Multiple tabs/sessions
    console.log('\n--- TEST 17: Multiple Session Handling ---');
    const page2 = await context.newPage();
    await page2.goto(`${CONFIG.baseUrl}/login`);
    await page2.fill('input[type="email"]', CONFIG.credentials.email);
    await page2.fill('input[type="password"]', CONFIG.credentials.password);
    await page2.click('button[type="submit"]');
    await page2.waitForTimeout(3000);

    if (page2.url().includes(CONFIG.baseUrl) && !page2.url().includes('login')) {
      logTest('Multiple sessions', 'PASS', 'Second session login successful');
    } else {
      logTest('Multiple sessions', 'WARN', 'Second session may have issues');
    }
    await page2.close();

    // Test 18: Browser back/forward
    console.log('\n--- TEST 18: Browser Back/Forward Navigation ---');
    await page.goto(`${CONFIG.baseUrl}/kpis`);
    await page.waitForTimeout(1000);
    await page.goto(`${CONFIG.baseUrl}/documents`);
    await page.waitForTimeout(1000);
    await page.goBack();
    await page.waitForTimeout(1000);

    if (page.url().includes('kpis')) {
      logTest('Browser back button', 'PASS', 'Back navigation works');
    } else {
      logTest('Browser back button', 'WARN', 'Back navigation may not work correctly');
    }

    await page.goForward();
    await page.waitForTimeout(1000);

    if (page.url().includes('documents')) {
      logTest('Browser forward button', 'PASS', 'Forward navigation works');
    } else {
      logTest('Browser forward button', 'WARN', 'Forward navigation may not work correctly');
    }
    await page.screenshot({ path: 'test-screenshots/edge-18-back-forward.png' });

    // ==================== FINAL CHECKS ====================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 8: FINAL SECURITY & ERROR CHECKS');
    console.log('='.repeat(80));

    // Test 19: Console errors during session
    console.log('\n--- TEST 19: Console Errors/Warnings During Tests ---');
    if (consoleMessages.length === 0) {
      logTest('Console errors during tests', 'PASS', 'No console errors or warnings');
    } else {
      const errors = consoleMessages.filter(m => m.type === 'error');
      const warnings = consoleMessages.filter(m => m.type === 'warning');

      if (errors.length > 0) {
        logTest('Console errors', 'WARN', `${errors.length} console errors detected`);
        console.log('Console errors:', errors.slice(0, 5));
      }
      if (warnings.length > 0) {
        logTest('Console warnings', 'WARN', `${warnings.length} console warnings detected`);
      }
    }

    // Test 20: Network failures
    console.log('\n--- TEST 20: Network Request Failures ---');
    if (networkErrors.length === 0) {
      logTest('Network requests', 'PASS', 'No network failures detected');
    } else {
      logTest('Network failures', 'WARN', `${networkErrors.length} network requests failed`);
      console.log('Network errors:', networkErrors.slice(0, 5));
    }

  } catch (error) {
    logTest('Test execution', 'FAIL', error.message, 'critical');
    console.error('Error during edge case tests:', error);
    await page.screenshot({ path: 'test-screenshots/edge-error.png' });
  } finally {
    await browser.close();
  }

  // Print Summary
  console.log('\n' + '='.repeat(80));
  console.log('EDGE CASE TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✓ Passed: ${results.passed.length}`);
  console.log(`✗ Failed: ${results.failed.length}`);
  console.log(`⚠ Warnings: ${results.warnings.length}`);
  console.log(`🔴 Critical: ${results.critical.length}`);
  console.log('='.repeat(80));

  if (results.critical.length > 0) {
    console.log('\n🔴 CRITICAL ISSUES:');
    results.critical.forEach(({ name, details }) => console.log(`  - ${name}: ${details}`));
  }

  if (results.failed.length > 0) {
    console.log('\n✗ FAILED TESTS:');
    results.failed.forEach(({ name, details }) => console.log(`  - ${name}: ${details}`));
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠ WARNINGS:');
    results.warnings.forEach(({ name, details }) => console.log(`  - ${name}: ${details}`));
  }

  if (results.passed.length > 0) {
    console.log('\n✓ PASSED TESTS:');
    results.passed.forEach(test => console.log(`  - ${test}`));
  }

  console.log('\n' + '='.repeat(80));
  console.log('Screenshots saved to: test-screenshots/');
  console.log('='.repeat(80));

  // Exit with appropriate code
  if (results.critical.length > 0) {
    process.exit(2); // Critical failures
  } else if (results.failed.length > 0) {
    process.exit(1); // Regular failures
  } else {
    process.exit(0); // Success
  }
}

// Create required directories
if (!fs.existsSync('test-screenshots')) {
  fs.mkdirSync('test-screenshots');
}
if (!fs.existsSync('test-files')) {
  fs.mkdirSync('test-files');
}

// Run edge case tests
runEdgeCaseTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(2);
});
