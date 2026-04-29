import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Use environment variables (already set in Render)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// ✅ Safety check
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test route
app.get("/", (req, res) => {
  res.send("Backend is live 🚀");
});

// 🔥 FIXED AI ROUTE
app.post("/ai", async (req, res) => {
  try {
    let { caseData } = req.body;

    if (!caseData || !caseData.case_number) {
      return res.json({ reply: "No case number provided." });
    }

    // ✅ Clean input (IMPORTANT)
    const caseNumber = caseData.case_number.trim();

    console.log("Searching for:", caseNumber);

    // ✅ Use ilike (case-insensitive match)
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .ilike("case_number", caseNumber)
      .single();

    if (error || !data) {
      console.log("Not found in DB");
      return res.json({ reply: "Case not found." });
    }

    const reply = `Your case (${data.case_number}) is currently ${data.status}.`;

    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Render requires dynamic port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
