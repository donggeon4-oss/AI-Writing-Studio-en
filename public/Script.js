let currentMode = "auto";

function setMode(mode) {
  currentMode = mode;

  const title = document.getElementById("functionTitle");
  const desc = document.getElementById("functionDesc");

  const modeText = {
    auto: ["✨ Auto Generate", "Enter a keyword and let AI create a high-quality article."],
    summary: ["📝 Summary", "Summarizes long text into key points."],
    email: ["📧 Email", "Creates natural and friendly email messages."],
    reply: ["💬 Reply", "Generates warm, positive replies."],
    report: ["📄 Report", "Creates a one-page structured report."],
    blog: ["✍ Full Blog Writing", "AI writes a complete blog post."],
    blog_step1: ["1️⃣ Step 1 – Keyword Analysis", "Analyzes search intent and main keywords."],
    blog_step2: ["2️⃣ Step 2 – Outline", "Generates an SEO-optimized outline."],
    blog_step3: ["3️⃣ Step 3 – Full Article", "Writes a 2000+ word article."],
    rewrite_soft: ["♻ Softer Tone", "Rewrites in a smoother and warmer tone."],
    rewrite_pro: ["💼 Professional Rewrite", "Rewrites in a formal business tone."],
    rewrite_short: ["🔍 Shorten", "Compresses the content into essentials."],
    rewrite_long: ["🔎 Expand", "Expands the content with more detail."],
    seo: ["⚡ SEO Analysis", "Provides keywords, meta description, and improvements."],
    multi: ["🎨 3 Versions", "Rewrites your text in three different tones."],
    idea: ["💡 Ideas", "Generates 10 fresh content ideas."],
    analyze: ["📚 Score Analysis", "Evaluates writing with scoring."],
    imgprompt: ["🖼 Image Prompt", "Creates prompts for image generation."]
  };

  title.innerText = modeText[mode][0];
  desc.innerText = modeText[mode][1];
}

async function generate() {
  const input = document.getElementById("userInput").value;
  const length = document.getElementById("length").value;
  const tone = document.getElementById("tone").value;
  const output = document.getElementById("resultBox");

  output.innerText = "⏳ Generating…";

  try {
    const res = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userInput: input,
        mode: currentMode,
        length,
        tone
      })
    });

    const data = await res.json();
    output.innerText = data.result || "⚠️ No result.";

  } catch {
    output.innerText = "⚠️ Error occurred.";
  }
}

function resetFields() {
  document.getElementById("userInput").value = "";
  document.getElementById("resultBox").innerText = "Your result will appear here.";
}

function copyText() {
  navigator.clipboard.writeText(
    document.getElementById("resultBox").innerText
  );
  alert("📋 Copied!");
}
