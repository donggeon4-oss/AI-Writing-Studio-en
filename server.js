// =======================================
//  Ultimate AI Writing Studio — SaaS Server
// =======================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));

// No cache
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Serve static
app.use(express.static("public"));

// ===== OPENAI CLIENT =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== LICENSE VERIFY (LEMON SQUEEZY) =====
app.post("/verify-license", async (req, res) => {
  const { key } = req.body;

  try {
    const response = await fetch(`https://api.lemonsqueezy.com/v1/licenses/validate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.LEMON_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        license_key: key
      })
    });

    const result = await response.json();

    if (result.valid) {
      return res.json({ valid: true });
    }

    return res.json({ valid: false });

  } catch (err) {
    console.log("License error:", err);
    return res.json({ valid: false });
  }
});

// =======================================
//   MULTI-PASS QUALITY BOOST ENGINE
// =======================================
async function multiPass(prompt, systemPrompt) {

  // 1단계: 초안 생성
  const first = await openai.chat.completions.create({
    model: "gpt-4o-mini-tts",
    temperature: 0.85,
    max_tokens: 1200,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ]
  });

  const pass1 = first.choices[0].message.content;

  // 2단계: 문장 품질 향상
  const second = await openai.chat.completions.create({
    model: "gpt-4o-mini-tts",
    temperature: 0.7,
    max_tokens: 1100,
    messages: [
      {
        role: "system",
        content: "Rewrite the text to be clearer, more polished, more natural and professional."
      },
      { role: "user", content: pass1 }
    ]
  });

  const pass2 = second.choices[0].message.content;

  // 3단계: 최종 정제
  const third = await openai.chat.completions.create({
    model: "gpt-4o-mini-tts",
    temperature: 0.55,
    max_tokens: 950,
    messages: [
      {
        role: "system",
        content:
          "Refine the text to be premium-quality, smooth, elegant and ready for publication."
      },
      { role: "user", content: pass2 }
    ]
  });

  return third.choices[0].message.content;
}

// =======================================
//  GENERATE ROUTE
// =======================================
app.post("/generate", async (req, res) => {
  const { userInput, mode, length, tone } = req.body;

  // Length
  const lengthMap = {
    short: "Around 400–700 characters",
    normal: "Around 1200–1600 characters",
    long: "Around 2500–3500 characters"
  };
  const lengthGuide = lengthMap[length] || "";

  // Tone
  const toneMap = {
    default: "",
    warm: "Write in warm, friendly tone",
    professional: "Write in professional tone",
    emotional: "Use emotional, expressive tone",
    mz: "Use modern, casual Gen Z tone",
    news: "Write concisely like news",
    thesis: "Write in academic tone",
    copy: "Write in persuasive copywriting tone",
    sns: "Write casually like social media",
    lecture: "Write like a teacher explaining clearly"
  };
  const toneGuide = toneMap[tone] || "";

  // System presets
  const SYSTEM = {
    summary: "You are an elite summarization AI.",
    email: "You are a business email writing expert.",
    reply: "You craft warm, friendly replies.",
    report: "You are a professional report writer.",
    blog: "You generate premium-quality blog articles.",
    rewrite_soft: "Rewrite softly, naturally.",
    rewrite_pro: "Rewrite professionally.",
    rewrite_short: "Rewrite concisely.",
    rewrite_long: "Rewrite with expansions.",
    seo: "You are an SEO analyzer.",
    idea: "You generate creative ideas.",
    analyze: "You analyze writing quality.",
    imgprompt: "You generate image prompts."
  };

  // AUTO MODE: 4o full creative mode
  if (mode === "auto") {
    const autoPrompt = `
Write a complete high-quality article.

Topic:
${userInput}

Requirements:
- ${lengthGuide}
- ${toneGuide}
- Include H1, H2 sections
- Include SEO naturally
- No repetition
- Smooth and human-like writing
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.75,
        max_tokens: 2600,
        messages: [
          { role: "system", content: "You are a premium blog content writer." },
          { role: "user", content: autoPrompt }
        ]
      });

      return res.json({ result: response.choices[0].message.content });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Auto mode error" });
    }
  }

  // ==== Non-auto → Multi-Pass high quality ====
  const systemPrompt = SYSTEM[mode] || "You are a premium writing assistant.";

  const finalPrompt = `
User text:
${userInput}

Instructions:
- Length: ${lengthGuide}
- Tone: ${toneGuide}
- Write naturally, clearly, professionally
  `;

  try {
    const result = await multiPass(finalPrompt, systemPrompt);
    res.json({ result });
  } catch (err) {
    console.log("Generation error:", err);
    res.status(500).json({ error: "Generation failed" });
  }
});

// =======================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 AI Writing Studio SaaS Running on ${PORT}`)
);
