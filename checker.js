import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function checkCase() {
  console.log("🔍 Checking case (API mode)...");

  let browser;

  try {
    // 🚀 Launch Chromium (Render-compatible)
    browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/chromium-browser",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });

    console.log("✅ Browser launched");

    const page = await browser.newPage();

    // 👀 Log browser console messages
    page.on("console", msg => {
      console.log("🌐 PAGE LOG:", msg.text());
    });

    // 📡 Capture API responses
    let capturedData = [];

    page.on("response", async (response) => {
      try {
        const url = response.url();
        const contentType = response.headers()["content-type"] || "";

        if (
          (url.includes("livewire") ||
            url.includes("case") ||
            url.includes("api")) &&
          contentType.includes("application/json")
        ) {
          const data = await response.json();

          console.log("📡 API HIT:", url);
          capturedData.push(data);
        }
      } catch (err) {
        // ignore JSON parse errors
      }
    });

    // 🔐 STEP 1: Open login page
    console.log("➡️ Opening login page...");
    await page.goto("https://mycase.rscafrica.org/login", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    console.log("✅ Login page loaded");

    // 🔐 STEP 2: Enter credentials
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    await page.type('input[name="email"]', process.env.MYCASE_EMAIL);

    await page.waitForSelector('input[name="password"]', { timeout: 15000 });
    await page.type('input[name="password"]', process.env.MYCASE_PASSWORD);

    console.log("✅ Credentials entered");

    // 🔐 STEP 3: Submit login
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 })
    ]);

    console.log("✅ Logged in");

    // 📄 STEP 4: Open case page
    console.log("➡️ Opening case page...");
    await page.goto("https://mycase.rscafrica.org/case-information", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    console.log("✅ Case page loaded");

    // ⏳ Wait for API calls to finish
    await page.waitForTimeout(10000);

    console.log("📡 Total API responses captured:", capturedData.length);

    // 🧠 Extract useful info
    let extracted = {
      status: "Unknown",
      documents: [],
      steps: []
    };

    for (const item of capturedData) {
      const text = JSON.stringify(item).toLowerCase();

      // 🔎 Status detection
      if (text.includes("under review")) extracted.status = "Under Review";
      if (text.includes("approved")) extracted.status = "Approved";

      // 📄 Documents detection
      if (text.includes("document")) {
        extracted.documents.push(text.slice(0, 200));
      }

      // 📊 Steps detection
      if (text.includes("step")) {
        extracted.steps.push(text.slice(0, 200));
      }
    }

    console.log("🧠 Extracted data:", extracted);

    // 📦 Get previous data
    const { data: oldData } = await supabase
      .from("cases")
      .select("*")
      .eq("case_number", "SF-10267383")
      .single();

    const oldStatus = oldData?.status;

    // 🔁 Compare
    if (extracted.status !== oldStatus) {
      console.log("🚨 STATUS CHANGED:", extracted.status);

      await supabase
        .from("cases")
        .update({
          status: extracted.status,
          raw_data: JSON.stringify(extracted)
        })
        .eq("case_number", "SF-10267383");

      console.log("📢 UPDATE STORED");
    } else {
      console.log("✅ No change");
    }

  } catch (err) {
    console.error("❌ ERROR STEP:", err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log("🧹 Browser closed");
    }
  }
}
