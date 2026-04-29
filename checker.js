import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function checkCase() {
  console.log("🔍 Checking case (API mode)...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  let capturedData = [];

  // 🔥 LISTEN TO ALL NETWORK RESPONSES
  page.on("response", async (response) => {
    try {
      const url = response.url();

      // 🎯 Filter interesting requests
      if (
        url.includes("livewire") ||
        url.includes("case") ||
        url.includes("api")
      ) {
        const contentType = response.headers()["content-type"];

        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();

          console.log("📡 API HIT:", url);
          capturedData.push(data);
        }
      }
    } catch (err) {
      // ignore parsing errors
    }
  });

  try {
    // 🔐 LOGIN
    await page.goto("https://mycase.rscafrica.org/login", {
      waitUntil: "networkidle2"
    });

    await page.type('input[name="email"]', process.env.MYCASE_EMAIL);
    await page.type('input[name="password"]', process.env.MYCASE_PASSWORD);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    console.log("✅ Logged in");

    // 📄 GO TO CASE PAGE
    await page.goto("https://mycase.rscafrica.org/case-information", {
      waitUntil: "networkidle2"
    });

    // ⏳ WAIT for async calls
    await page.waitForTimeout(8000);

    console.log("📡 Captured responses:", capturedData.length);

    // 🔍 EXTRACT MEANINGFUL DATA
    let extracted = {
      status: "Unknown",
      documents: [],
      steps: []
    };

    for (const item of capturedData) {
      const text = JSON.stringify(item);

      // 🧠 STATUS DETECTION
      if (text.includes("Under Review")) extracted.status = "Under Review";
      if (text.includes("Approved")) extracted.status = "Approved";

      // 📄 DOCUMENT DETECTION (basic pattern)
      if (text.toLowerCase().includes("document")) {
        extracted.documents.push(text.slice(0, 200));
      }

      // 📊 STEP DETECTION
      if (text.toLowerCase().includes("step")) {
        extracted.steps.push(text.slice(0, 200));
      }
    }

    console.log("🧠 Extracted:", extracted);

    // 📦 GET OLD DATA
    const { data: oldData } = await supabase
      .from("cases")
      .select("*")
      .eq("case_number", "SF-10267383")
      .single();

    const oldStatus = oldData?.status;

    // 🔁 COMPARE STATUS
    if (extracted.status !== oldStatus) {
      console.log("🚨 STATUS CHANGED:", extracted.status);

      await supabase
        .from("cases")
        .update({
          status: extracted.status,
          raw_data: JSON.stringify(extracted)
        })
        .eq("case_number", "SF-10267383");

      // 🔔 ALERT (for now log)
      console.log("📢 UPDATE:", extracted);
    } else {
      console.log("✅ No change");
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  await browser.close();
}
