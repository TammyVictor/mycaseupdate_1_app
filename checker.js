import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.MYCASE_EMAIL;
const PASSWORD = process.env.MYCASE_PASSWORD;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  console.log("🔍 Checking case (Playwright mode)...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. Go to MyCase login
    console.log("➡️ Opening login page...");
    await page.goto('https://mycase.rscafrica.org/login', { waitUntil: 'networkidle' });

    // 2. Fill login form
    console.log("🔐 Logging in...");
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);

    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]')
    ]);

    console.log("✅ Logged in");

    // 3. Wait for dashboard
    await page.waitForTimeout(5000);

    // 4. Capture API response
    let caseData = null;

    page.on('response', async (response) => {
      const url = response.url();

      if (url.includes('/livewire/message')) {
        try {
          const json = await response.json();
          console.log("📡 API HIT:", url);
          caseData = JSON.stringify(json);
        } catch {}
      }
    });

    // 5. Reload to trigger API
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    if (!caseData) {
      console.log("⚠️ No API data captured");
    } else {
      console.log("✅ Data captured");

      // 6. Save to Supabase
      const { error } = await supabase
        .from('cases')
        .update({
          raw_data: caseData,
          updated_at: new Date().toISOString()
        })
        .eq('case_number', 'SF-10267383');

      if (error) {
        console.log("❌ Supabase error:", error.message);
      } else {
        console.log("💾 Saved to Supabase");
      }
    }

  } catch (err) {
    console.log("❌ ERROR:", err.message);
  }

  await browser.close();
})();
