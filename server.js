import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Use environment variables (from Render)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// ✅ Safety check
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.get("/", (req, res) => {
  res.send("Backend is live 🚀");
});

app.post("/ai", async (req, res) => {
  try {
    const { caseData } = req.body;

    const caseNumber = caseData.case_number.trim();

    // ✅ FIXED QUERY (handles spaces + case issues)
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .ilike("case_number", caseNumber)
      .maybeSingle();

    if (error || !data) {
      return res.json({ reply: "Case not found." });
    }

    const reply = `Your case (${data.case_number}) is currently ${data.status}.`;

    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Render uses dynamic port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Running on port ${PORT}`));
