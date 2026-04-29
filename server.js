import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ OpenAI setup (only used in PRO mode)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Backend is live 🚀");
});

// ✅ AI route (FREE + PRO)
app.post("/ai", async (req, res) => {
  try {
    console.log("AI endpoint hit:", req.body);

    const { question, caseData, isPro } = req.body;

    // ❌ No question
    if (!question) {
      return res.json({ reply: "Please ask a question." });
    }

    // =========================
    // 🟢 FREE MODE (no cost)
    // =========================
    if (!isPro) {
      let reply = "Basic mode: limited response.";

      if (question.toLowerCase().includes("status")) {
        reply = `Your case (${caseData?.case_number || "Unknown"}) is currently ${caseData?.case_status || "Unknown"}.`;
      } else if (question.toLowerCase().includes("review")) {
        reply = "Under review means your case is being evaluated by immigration officers. This stage can take time depending on complexity.";
      } else if (question.toLowerCase().includes("how long")) {
        reply = "Processing times vary, but review stages can take weeks to months depending on your case.";
      } else {
        reply = "Upgrade to Pro for detailed AI answers.";
      }

      return res.json({ reply });
    }

    // =========================
    // 🔵 PRO MODE (real AI)
    // =========================
    const prompt = `
You are a helpful case assistant.

Case Number: ${caseData?.case_number || "Unknown"}
Status: ${caseData?.case_status || "Unknown"}

User question:
${question}

Give a clear, helpful, human-like answer.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "No response from AI.";

    res.json({ reply });

  } catch (err) {
    console.error("ERROR:", err);

    // 🔁 Fallback if AI fails (quota, etc.)
    res.json({
      reply:
        "AI is temporarily unavailable. You are currently in basic mode. Please try again later or upgrade."
    });
  }
});

// ✅ IMPORTANT: Use Render port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Running on port " + PORT);
});
