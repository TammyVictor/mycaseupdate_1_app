import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { checkCase } from "./checker.js";

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Supabase (SERVICE ROLE)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ ROOT ROUTE (test backend)
app.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.from("cases").select("*");

    if (error) {
      return res.json({
        status: "ERROR",
        message: error.message,
      });
    }

    return res.json({
      status: "SUCCESS",
      message: "Backend running 🚀",
      rows_found: data.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🤖 AI / CASE CHECK ENDPOINT
app.post("/ai", async (req, res) => {
  try {
    const case_number = req.body?.caseData?.case_number;

    if (!case_number) {
      return res.json({
        reply: "Please provide a case number.",
      });
    }

    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("case_number", case_number)
      .single();

    if (error || !data) {
      return res.json({
        reply: "Case not found.",
      });
    }

    return res.json({
      reply: `Your case (${data.case_number}) is currently ${data.status}.`,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔁 MANUAL TRIGGER FOR AUTO-CHECK
app.get("/check", async (req, res) => {
  try {
    await checkCase();
    res.send("Case check completed ✅");
  } catch (err) {
    res.status(500).send("Check failed ❌");
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
