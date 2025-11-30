// ========================================
// Ultimate AI Writing Studio - Server
// Auto .env Creation Version
// ========================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";

// ========================================
// 1) AUTO CREATE .env IF NOT EXISTS
// ========================================
const envPath = "./.env";

if (!fs.existsSync(envPath)) {
  console.log("⚠️  .env not found — creating new .env file...");
  fs.writeFileSync(envPath, "OPENAI_API_KEY=\n");
  console.log("✅  Created .env");
  console.log("⚠️  Please open .env and put your API key:");
  console.log("OPENAI_API_KEY=sk-xxxxxx\n");
}

// Now load env
dotenv.config();

// ========================================
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// If key still missing → warn but DO NOT crash
if (!OPENAI_KEY) {
  console.log("❌ WARNING: OPENAI_API_KEY is empty in .env");
  console.log("➡️  Go to .env and paste your key: sk-xxxx");
}

// ========================================
// Express App Setup
// ========================================
const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Prevent caching
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Static files
app.use(express.static("public"));

// ========================================
// OPENAI CLIENT — handles missing key safely
// ========================================
const openai = new OpenAI({
  apiKey: OPENAI_KEY || "MISSING_KEY"
});

// ========================================
// MAIN AI ENGINE
// ========================================
app.post("/generate", async (req, res) => {
  if (!OPENAI_KEY) {
    return res.status(500).json({
      error: "OpenAI API Key is missing. Add it to .env"
    });
  }

  const { userInput, mode, length, tone } = req.body;

  // Length options
  let style = "";
  if (length === "short") style = "Write about 700 characters concisely.";
  if (length === "normal") style = "Write about 1500 characters naturally.";
  if (length === "long") style = "Write about 2500–3500 characters with detail.";

  // Tone options
  const toneMap = {
    default: "",
    warm: "Write in a warm and gentle tone.",
    professional: "Write in a professional business tone.",
    emotional: "Write with emotional expression.",
    mz: "Write in a witty Gen-Z style.",
    news: "Write concisely like a news reporter.",
    thesis: "Write formally like an academic paper.",
    copy: "Write in powerful marketing style.",
    sns: "Write casually like social media.",
    lecture: "Explain like a lecturer."
  };

  const toneGuide = toneMap[tone] || "";

  // ========================================
  // AUTO MODE
  // ========================================
  if (mode === "auto") {
    const prompt = `
You are a premium writing assistant.

Topic:
${userInput}

Requirements:
- ${style}
- ${toneGuide}
- SEO optimized
- H1 title
- 3–6 H2 sections
- Paragraphs under each
- Conclusion included
- Human-like flow
- No repetition
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 2600,
        messages: [
          { role: "system", content: "You are a premium content writer." },
          { role: "user", content: prompt }
        ]
      });

      return res.json({ result: response.choices[0].message.content });
    } catch (err) {
      console.error("AUTO ERROR:", err);
      return res.status(500).json({ error: "Auto-generation failed." });
    }
  }

  // ========================================
  // OTHER MODES
  // ========================================
  const MODE_PROMPTS = {
    summary: `
Summarize:
${style}
${toneGuide}

${userInput}
`,

    email: `
Write a natural email:
${toneGuide}

${userInput}
`,

    reply: `
Write a friendly reply:
${toneGuide}

${userInput}
`,

    report: `
Write a 1-page report:
${style}
${toneGuide}

${userInput}
`,

    blog: `
Write a full blog post:
${userInput}
${style}
${toneGuide}
`,

    rewrite_soft: `
Rewrite softly:
${toneGuide}

${userInput}
`,

    rewrite_pro: `
Rewrite professionally:
${toneGuide}

${userInput}
`,

    rewrite_short: `
Summarize concisely:
${toneGuide}

${userInput}
`,

    rewrite_long: `
Expand in detail:
${toneGuide}

${userInput}
`,

    seo: `
SEO analysis for:
${userInput}

Include:
- 8–12 keywords
- Search intent
- Meta description
- 5 improvement suggestions
`,

    multi: `
Rewrite in 3 styles:

A) Warm  
B) Professional  
C) SNS style  

${userInput}
`,

    blog_step1: `
Keyword analysis:
${userInput}

Include:
- Search intent
- Target audience
- Core keywords
- Direction
`,

    blog_step2: `
Create outline:
${userInput}

- 4–6 H2
- Each H2 has 2–3 H3
`,

    blog_step3: `
Write full article (2000–3000 chars)
Keep H2/H3 structure
${toneGuide}

${userInput}
`,

    idea: `
Generate 10 ideas with explanations:
Keyword: ${userInput}
`,

    analyze: `
Analyze the writing:

${userInput}

Include:
- Scores
- Strengths x3
- Weaknesses x3
- Summary
`,

    imgprompt: `
Create an image prompt for:
${userInput}

Provide:
- Short
- Detailed
- English version
`
  };

  const prompt = MODE_PROMPTS[mode];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 2200,
      messages: [
        { role: "system", content: "You are a premium writing AI." },
        { role: "user", content: prompt }
      ]
    });

    return res.json({ result: response.choices[0].message.content });

  } catch (err) {
    console.error("AI ERROR:", err);
    return res.status(500).json({ error: "Generation failed." });
  }
});

// ========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Ultimate AI Writing Studio Running on ${PORT}`)
);
