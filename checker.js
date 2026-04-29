import { chromium } from "playwright";

async function run() {
  console.log("🔍 Checking case (Playwright mode)...");

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  let apiData = [];

  // Capture API responses
  page.on("response", async (response) => {
    try {
      const url = response.url();

      if (url.includes("api") || url.includes("case") || url.includes("livewire")) {
        const text = await response.text();

        apiData.push({
          url,
          body: text
        });
      }
    } catch (err) {
      // ignore
    }
  });

  try {
    console.log("🌐 Opening login page...");
    await page.goto("https://mycase.rscafrica.org", { waitUntil: "networkidle" });

    console.log("🔑 Logging in...");

    await page.fill('input[type="email"]', process.env.MYCASE_EMAIL);
    await page.fill('input[type="password"]', process.env.MYCASE_PASSWORD);

    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle" }),
      page.click('button[type="submit"]')
    ]);

    console.log("✅ Logged in");

    // Wait for dynamic content
    await page.waitForTimeout(8000);

    // Go to case page explicitly (important)
    await page.goto("https://mycase.rscafrica.org/case-information", {
      waitUntil: "networkidle"
    });

    await page.waitForTimeout(8000);

    // -------------------------
    // 1. API DATA CHECK
    // -------------------------
    if (apiData.length > 0) {
      console.log(`📡 API DATA FOUND: ${apiData.length} responses`);

      apiData.slice(0, 3).forEach((entry, i) => {
        console.log(`\n--- API RESPONSE ${i + 1} ---`);
        console.log("URL:", entry.url);
        console.log(entry.body.substring(0, 1000));
      });
    } else {
      console.log("⚠ No API data captured");
    }

    // -------------------------
    // 2. EXTRACT PAGE TEXT
    // -------------------------
    console.log("\n📄 Extracting visible text...");

    const text = await page.evaluate(() => document.body.innerText);

    if (text && text.trim().length > 0) {
      console.log("📄 PAGE TEXT FOUND:");
      console.log(text.substring(0, 1500));
    } else {
      console.log("⚠ No visible text");
    }

    // -------------------------
    // 3. EXTRACT FULL HTML
    // -------------------------
    console.log("\n🧠 Extracting HTML...");

    const html = await page.content();

    if (html.includes("livewire") || html.includes("case") || html.length > 1000) {
      console.log("📦 RAW HTML DATA FOUND:");
      console.log(html.substring(0, 2000));
    } else {
      console.log("⚠ No useful HTML detected");
    }

  } catch (error) {
    console.log("❌ ERROR:", error.message);
  }

  await browser.close();
}

run();
