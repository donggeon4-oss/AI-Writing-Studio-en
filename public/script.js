let currentMode = "auto";

function setMode(mode) {
  currentMode = mode;

  const title = document.getElementById("functionTitle");
  const desc = document.getElementById("functionDesc");

  const modeText = {
    auto: ["✨ Auto Article", "Enter a topic and get a full high-quality article."],
    summary: ["📝 Summary", "Summarize long texts into key points."],
    email: ["📧 Email", "Generate natural, polite emails."],
    reply: ["💬 Reply", "Write a friendly reply message."],
    report: ["📄 Report", "Create a one-page style report."],
    blog: ["✍ Full Blog", "Generate a complete blog post."],
    blog_step1: ["1️⃣ Step 1 – Analysis", "Analyze keywords and search intent."],
    blog_step2: ["2️⃣ Step 2 – Outline", "Create a detailed blog outline."],
    blog_step3: ["3️⃣ Step 3 – Content", "Write a long, structured article."],
    rewrite_soft: ["♻ Soft Rewrite", "Make the text smoother and more natural."],
    rewrite_pro: ["💼 Professional", "Rewrite in a clean business tone."],
    rewrite_short: ["🔍 Short / Summary", "Compress into a short version."],
    rewrite_long: ["🔎 Expand", "Extend with more detail and examples."],
    seo: ["⚡ SEO Analysis", "Analyze keywords, intent and meta description."],
    multi: ["🎨 3 Versions", "Rewrite in three different styles."],
    idea: ["💡 Idea Generator", "Generate multiple content ideas."],
    analyze: ["📚 Text Scoring", "Score and review the quality of writing."],
    imgprompt: ["🖼 Image Prompt", "Create prompts for image generation."]
  };

  if (modeText[mode]) {
    title.innerText = modeText[mode][0];
    desc.innerText = modeText[mode][1];
  }
}

async function generate() {
  const input = document.getElementById("userInput").value.trim();
  const length = document.getElementById("length").value;
  const tone = document.getElementById("tone").value;
  const output = document.getElementById("resultBox");

  if (!input) {
    output.innerText = "Please enter a topic or some text first.";
    return;
  }

  output.innerText = "⏳ Generating with AI…";

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

    if (data.error) {
      output.innerText = "⚠️ Error: " + data.error;
      return;
    }

    if (!data.result) {
      output.innerText = "⚠️ No result returned from the AI.";
      return;
    }

    let extra = "";
    if (data.fromCache) extra += "\n\n⚡ Served from cache";
    if (data.model) extra += `\n(Model: ${data.model})`;

    output.innerText = data.result + extra;

  } catch (err) {
    console.error(err);
    output.innerText = "⚠️ A network or server error occurred.";
  }
}

function resetFields() {
  document.getElementById("userInput").value = "";
  document.getElementById("resultBox").innerText = "Your result will appear here.";
}

function copyText() {
  const text = document.getElementById("resultBox").innerText;
  if (!text || text === "Your result will appear here.") {
    alert("There is no generated text to copy yet.");
    return;
  }
  navigator.clipboard.writeText(text);
  alert("📋 Result copied to clipboard!");
}
