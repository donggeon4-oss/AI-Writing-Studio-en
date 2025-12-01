let currentMode = "auto";

function setMode(mode) {
  currentMode = mode;

  const title = document.getElementById("functionTitle");
  const desc = document.getElementById("functionDesc");

  const modeText = {
    auto: ["✨ Auto Generate", "Create a full-quality article from a keyword."],
    summary: ["📝 Summary", "Summarize long text into core insights."],
    email: ["📧 Email", "Write natural, polite emails effortlessly."],
    reply: ["💬 Reply", "Craft friendly and emotional replies."],
    report: ["📄 Report", "Generate a structured professional report."],
    blog: ["✍ Blog", "Write a complete blog article automatically."],
    blog_step1: ["① Step 1 - Analysis", "Keyword and intent analysis."],
    blog_step2: ["② Step 2 - Outline", "SEO-optimized outline generation."],
    blog_step3: ["③ Step 3 - Writing", "Write full article from outline."],
    rewrite_soft: ["♻ Soft Rewrite", "Rewrite naturally and softly."],
    rewrite_pro: ["💼 Pro Rewrite", "Rewrite professionally."],
    rewrite_short: ["🔍 Shorten", "Condense the text to essentials."],
    rewrite_long: ["🔎 Expand", "Expand text with more richness."],
    seo: ["⚡ SEO Analysis", "Analyze SEO improvements."],
    multi: ["🎨 3 Versions", "Produce 3 different writing styles."],
    idea: ["💡 Ideas", "Generate creative content ideas."],
    analyze: ["📚 Writing Analysis", "Analyze writing quality."],
    imgprompt: ["🖼 Image Prompt", "Create image-generation prompts."]
  };

  title.innerText = modeText[mode][0];
  desc.innerText = modeText[mode][1];
}

async function generate() {
  const input = document.getElementById("userInput").value;
  const length = document.getElementById("length").value;
  const tone = document.getElementById("tone").value;
  const output = document.getElementById("resultBox");

  output.innerText = "⏳ Generating...";

  const res = await fetch("/generate", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      userInput: input,
      mode: currentMode,
      length,
      tone
    })
  });

  const data = await res.json();
  output.innerText = data.result || "⚠️ No result.";
}

function resetFields() {
  document.getElementById("userInput").value = "";
  document.getElementById("resultBox").innerText =
    "Result will appear here.";
}

function copyText() {
  navigator.clipboard.writeText(
    document.getElementById("resultBox").innerText
  );
  alert("Copied to clipboard!");
}
