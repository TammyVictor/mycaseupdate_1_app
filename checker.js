import { chromium } from "playwright";

async function run() {
  console.log("🔍 Checking case (Playwright mode)...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let apiData = [];

  // Capture API responses
  page.on("response", async (response) => {
    try {
      const url = response.url();

      if (url.includes("api") || url.includes("case") || url.includes("livewire")) {
        const text = await response.text();
        apiData.push({ url, body: text });
      }
    } catch {}
  });

  try {
    // ✅ GO DIRECTLY TO LOGIN PAGE
    console.log("🌐 Opening login page...");
    await page.goto("https://mycase.rscafrica.org/login", {
      waitUntil: "domcontentloaded",
    });

    // ✅ WAIT FOR INPUTS PROPERLY
    await page.waitForSelector('input[type="email"]', { timeout: 60000 });

    console.log("🔑 Logging in...");

    await page.fill('input[type="email"]', process.env.MYCASE_EMAIL);
    await page.fill('input[type="password"]', process.env.MYCASE_PASSWORD);

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle" }),
      page.click('button[type="submit"]'),
    ]);

    console.log("✅ Logged in");

    // Wait for dynamic content
    await page.waitForTimeout(10000);

    // Go to case page
    console.log("📂 Opening case page...");
    await page.goto("https://mycase.rscafrica.org/case-information", {
      waitUntil: "networkidle",
    });

    await page.waitForTimeout(10000);

    // -------------------------
    // API DATA
    // -------------------------
    if (apiData.length > 0) {
      console.log(`📡 API DATA FOUND: ${apiData.length}`);
      apiData.slice(0, 3).forEach((d, i) => {
        console.log(`\n--- API ${i + 1} ---`);
        console.log(d.url);
        console.log(d.body.substring(0, 800));
      });
    } else {
      console.log("⚠ No API data captured");
    }

    // -------------------------
    // TEXT
    // -------------------------
    console.log("\n📄 Extracting text...");
    const text = await page.evaluate(() => document.body.innerText);

    if (text && text.trim().length > 0) {
      console.log(text.substring(0, 1500));
    } else {
      console.log("⚠ No visible text");
    }

    // -------------------------
    // HTML
    // -------------------------
    console.log("\n🧠 Extracting HTML...");
    const html = await page.content();

    if (html.length > 1000) {
      console.log(html.substring(0, 2000));
    } else {
      console.log("⚠ No useful HTML");
    }

  } catch (err) {
    console.log("❌ ERROR:", err.message);
  }

  await browser.close();
}

run();
