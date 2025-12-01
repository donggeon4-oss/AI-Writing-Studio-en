// ========================================
// Ultimate AI Writing Studio - PRO Server
//  - Model auto-selection (fast + high quality)
//  - In-memory cache (speed + 비용 절감)
//  - Basic rate limiting (보안 + 안정성)
// ========================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import crypto from "crypto";

// ------------------------------
// 1. ENV & 기본 설정
// ------------------------------
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// 캐시/헤더용
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// 정적 파일
app.use(express.static("public"));

// ------------------------------
// 2. OpenAI 클라이언트 설정
// ------------------------------
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_KEY) {
  console.log("❌ ERROR: OPENAI_API_KEY is missing in .env");
  console.log("➡️  .env 파일에 OPENAI_API_KEY=sk-... 형식으로 넣어줘야 합니다.");
}

const openai = new OpenAI({
  apiKey: OPENAI_KEY || "NO_KEY_PROVIDED"
});

// ------------------------------
// 3. 간단 레이트 리밋 (IP 기준)
// ------------------------------
//
//  - windowMs 동안 maxRequests 회 이상이면 차단
//  - 실제 서비스에서는 Redis 나 DB 로 옮기는 걸 추천
//
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1분
const RATE_LIMIT_MAX_REQUESTS = 20;     // 1분에 20번

function rateLimit(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()
    || req.socket.remoteAddress
    || "unknown";

  const now = Date.now();
  const record = rateLimitStore.get(ip) || { count: 0, start: now };

  if (now - record.start > RATE_LIMIT_WINDOW_MS) {
    // 새 윈도우
    rateLimitStore.set(ip, { count: 1, start: now });
    return next();
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      error: "Too many requests. Please wait a moment and try again."
    });
  }

  record.count += 1;
  rateLimitStore.set(ip, record);
  next();
}

// 모든 API 에 레이트 리밋 적용
app.use("/generate", rateLimit);

// ------------------------------
// 4. In-memory 캐시 (간단 LRU 느낌)
// ------------------------------
//
//  - key: 입력 + 모드 + 길이 + 톤 을 해시로 묶어서 사용
//  - value: { result, createdAt }
//
const cacheStore = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분
const CACHE_MAX_ITEMS = 200;

function makeCacheKey(payload) {
  const str = JSON.stringify(payload);
  return crypto.createHash("sha256").update(str).digest("hex");
}

function getFromCache(key) {
  const item = cacheStore.get(key);
  if (!item) return null;
  if (Date.now() - item.createdAt > CACHE_TTL_MS) {
    cacheStore.delete(key);
    return null;
  }
  return item.result;
}

function setCache(key, result) {
  if (cacheStore.size >= CACHE_MAX_ITEMS) {
    // 가장 오래된 것 하나 삭제 (대충 LRU 비슷하게)
    const firstKey = cacheStore.keys().next().value;
    cacheStore.delete(firstKey);
  }
  cacheStore.set(key, { result, createdAt: Date.now() });
}

// ------------------------------
// 5. 모드별 모델 선택 (성능 + 비용 최적화)
// ------------------------------
//
//  - 가벼운 작업: gpt-4o-mini
//  - 무거운 자동생성/블로그: gpt-4o
//
const MODE_MODEL_MAP = {
  auto: "gpt-4o",
  blog: "gpt-4o",
  blog_step3: "gpt-4o",
  summary: "gpt-4o-mini",
  email: "gpt-4o-mini",
  reply: "gpt-4o-mini",
  report: "gpt-4o-mini",
  rewrite_soft: "gpt-4o-mini",
  rewrite_pro: "gpt-4o-mini",
  rewrite_short: "gpt-4o-mini",
  rewrite_long: "gpt-4o-mini",
  seo: "gpt-4o-mini",
  multi: "gpt-4o-mini",
  blog_step1: "gpt-4o-mini",
  blog_step2: "gpt-4o-mini",
  idea: "gpt-4o-mini",
  analyze: "gpt-4o-mini",
  imgprompt: "gpt-4o-mini"
};

function getModelForMode(mode) {
  return MODE_MODEL_MAP[mode] || "gpt-4o-mini";
}

// ========================================
// 6. 메인 AI 엔진
// ========================================
app.post("/generate", async (req, res) => {
  // 키가 아예 없는 경우 방어
  if (!OPENAI_KEY || OPENAI_KEY === "NO_KEY_PROVIDED") {
    return res.status(500).json({
      error: "Server is missing OPENAI_API_KEY. Please set it in .env."
    });
  }

  const { userInput, mode, length, tone } = req.body || {};

  if (!userInput || !mode) {
    return res.status(400).json({
      error: "Missing 'userInput' or 'mode' in request body."
    });
  }

  // --------------------------
  // 길이 옵션
  // --------------------------
  let style = "";
  if (length === "short") style = "Write about 700 characters concisely.";
  if (length === "normal") style = "Write about 1500 characters naturally.";
  if (length === "long") style = "Write about 2500–3500 characters with rich detail.";

  // --------------------------
  // 톤 옵션
  // --------------------------
  const toneMap = {
    default: "",
    warm: "Write in a warm and gentle tone.",
    professional: "Write in a clean and professional tone.",
    emotional: "Write with emotional and expressive language.",
    mz: "Write in a witty Gen-Z style.",
    news: "Write concisely like a news article.",
    thesis: "Write formally in academic style.",
    copy: "Write in a marketing / copywriting tone.",
    sns: "Write casually like a social media post.",
    lecture: "Explain clearly like a lecturer."
  };
  const toneGuide = toneMap[tone] || "";

  // --------------------------
  // 캐시 키 생성 & 조회
  // --------------------------
  const cacheKey = makeCacheKey({ userInput, mode, length, tone });
  const cached = getFromCache(cacheKey);
  if (cached) {
    return res.json({
      result: cached,
      fromCache: true
    });
  }

  // --------------------------
  // 모드별 프롬프트 작성
  // --------------------------
  let prompt = "";

  if (mode === "auto") {
    prompt = `
You are a premium writing assistant generating a full high-quality article.

[Topic]
${userInput}

[Requirements]
- ${style}
- ${toneGuide}
- Include SEO optimization naturally
- Include one H1 title
- Include 3–6 H2 sections
- Each H2 contains 2–4 paragraphs
- Include a clear conclusion
- Avoid repetition
- Human-like tone
- High readability
    `;
  } else {
    const MODE_PROMPTS = {
      summary: `
Summarize the following text.
${style}
${toneGuide}

${userInput}
`,

      email: `
Write a natural, polite email based on the content below.
${toneGuide}

${userInput}
`,

      reply: `
Write a warm, friendly reply to the following message.
${toneGuide}

${userInput}
`,

      report: `
Write a one-page report based on the content below.
${style}
${toneGuide}

${userInput}
`,

      blog: `
Write a full blog article on the following topic:

${userInput}

${style}
${toneGuide}
`,

      rewrite_soft: `
Rewrite the passage below in a softer and more natural tone.
${toneGuide}

${userInput}
`,

      rewrite_pro: `
Rewrite the passage below in a professional business tone.
${toneGuide}

${userInput}
`,

      rewrite_short: `
Rewrite the passage below concisely, keeping only core points.
${toneGuide}

${userInput}
`,

      rewrite_long: `
Expand the passage below using richer detail and examples.
${toneGuide}

${userInput}
`,

      seo: `
Perform SEO analysis for the following text:

${userInput}

Include:
- 8–12 suggested keywords
- Overall search intent
- One 150-character meta description
- 5 improvement suggestions
`,

      multi: `
Rewrite the text below in 3 different styles.

A) Warm & friendly  
B) Professional business  
C) Casual SNS  

Text:
${userInput}
`,

      blog_step1: `
Perform keyword and intent analysis for:

${userInput}

Include:
- Search intent
- Core keywords
- Target audience
- Recommended writing direction
`,

      blog_step2: `
Create a detailed blog outline based on:

${userInput}

Requirements:
- 4–6 H2 sections
- Each H2 includes 2–3 H3 subsections
`,

      blog_step3: `
Write a full 2000–3000-character blog article using the outline below.

${userInput}

Requirements:
- Keep the H2 / H3 structure
- Apply SEO keywords naturally
- Use a warm, easy-to-read tone
`,

      idea: `
Generate 10 content ideas based on this keyword or topic:
${userInput}

For each idea, include a one-line explanation.
`,

      analyze: `
Analyze the following writing:

${userInput}

Include:
- Score breakdown (clarity, structure, tone, engagement)
- 3 strengths
- 3 weaknesses
- Final summary
`,

      imgprompt: `
Create an image-generation prompt based on:

${userInput}

Provide:
- Short simple prompt (one line)
- Detailed descriptive prompt
- English version
`
    };

    prompt = MODE_PROMPTS[mode];
  }

  if (!prompt) {
    return res.status(400).json({ error: `Unknown mode: ${mode}` });
  }

  // --------------------------
  // OpenAI 호출
  // --------------------------
  const modelName = getModelForMode(mode);

  try {
    const response = await openai.chat.completions.create({
      model: modelName,
      temperature: mode === "seo" || mode === "analyze" ? 0.3 : 0.7,
      max_tokens: mode === "auto" || mode === "blog" || mode === "blog_step3"
        ? 2600
        : 1400,
      messages: [
        { role: "system", content: "You are a premium writing AI assistant." },
        { role: "user", content: prompt }
      ]
    });

    const resultText = response.choices[0]?.message?.content || "";

    // 캐시에 저장
    setCache(cacheKey, resultText);

    return res.json({
      result: resultText,
      fromCache: false,
      model: modelName
    });

  } catch (err) {
    console.error("🔴 AI ERROR:", err);
    return res.status(500).json({
      error: "Generation failed. Please try again in a moment."
    });
  }
});

// ========================================
// 7. 서버 시작
// ========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("========================================");
  console.log(" Ultimate AI Writing Studio - PRO Server");
  console.log(" PORT :", PORT);
  if (!OPENAI_KEY) {
    console.log(" ⚠️  OPENAI_API_KEY is NOT set. API calls will fail.");
  } else {
    console.log(" ✅ OPENAI_API_KEY loaded.");
  }
  console.log("========================================");
});
