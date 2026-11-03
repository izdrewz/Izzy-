document.addEventListener("DOMContentLoaded", () => {
  const sourceForm = document.getElementById("source-form");
  const paragraphForm = document.getElementById("paragraph-form");
  const examForm = document.getElementById("exam-form");
  const refreshSupportButton = document.getElementById("refresh-support");
  const sourcesList = document.getElementById("sources-list");
  const paragraphResult = document.getElementById("paragraph-result");
  const examResult = document.getElementById("exam-result");
  const supportList = document.getElementById("support-list");
  const rewardsPanel = document.getElementById("rewards");
  const nextStep = document.getElementById("next-step");

  function renderSources(sources) {
    sourcesList.innerHTML = "";
    const entries = Object.entries(sources);
    if (entries.length === 0) {
      sourcesList.innerHTML = "<p>No sources yet. Add one PDF note to begin.</p>";
      return;
    }
    entries.forEach(([id, source]) => {
      const card = document.createElement("div");
      card.className = "activity-card";
      card.innerHTML = `<h4>${source.title}</h4><p><strong>ID:</strong> ${id}</p><p>${source.source_type.toUpperCase()}</p>`;
      sourcesList.appendChild(card);
    });
  }

  function renderRewards(rewards) {
    const badges = rewards.badges.length > 0 ? rewards.badges.join(", ") : "No badges yet";
    rewardsPanel.innerHTML = `<p><strong>XP:</strong> ${rewards.xp}</p><p><strong>Badges:</strong> ${badges}</p>`;
  }

  async function refreshDashboard() {
    const response = await fetch("/dashboard");
    const dashboard = await response.json();
    renderSources(dashboard.sources);
    renderRewards(dashboard.rewards);
  }

  sourceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = document.getElementById("source-title").value.trim();
    const content = document.getElementById("source-content").value.trim();
    const response = await fetch("/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, source_type: "pdf" }),
    });
    const result = await response.json();
    nextStep.textContent = response.ok
      ? `Source stored as ${result.source_id}. Next step: write one paragraph and link source IDs.`
      : result.detail || "Could not add source.";
    if (response.ok) {
      sourceForm.reset();
      await refreshDashboard();
    }
  });

  paragraphForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = document.getElementById("paragraph-text").value.trim();
    const sourceIds = document
      .getElementById("paragraph-sources")
      .value.split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const response = await fetch("/essay/paragraph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source_ids: sourceIds }),
    });
    const result = await response.json();
    paragraphResult.innerHTML = "";
    if (response.ok) {
      const list = result.paragraph.context_links
        .map((link) => `<li>${link.title}: ${link.similar_words.join(", ") || "no close matches yet"}</li>`)
        .join("");
      paragraphResult.innerHTML = `<p>${result.support_tip}</p><ul>${list}</ul>`;
      nextStep.textContent = "Great! Now paste an exam question to generate a skeleton template.";
      paragraphForm.reset();
      await refreshDashboard();
    } else {
      paragraphResult.innerHTML = `<p>${result.detail || "Could not save paragraph."}</p>`;
    }
  });

  examForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = document.getElementById("exam-question").value.trim();
    const guidance = document.getElementById("exam-guidance").value.trim();
    const response = await fetch("/exam-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, guidance }),
    });
    const result = await response.json();
    if (response.ok) {
      const skeleton = result.skeleton.map((line) => `<li>${line}</li>`).join("");
      const checklist = result.checklist.map((line) => `<li>${line}</li>`).join("");
      examResult.innerHTML = `<p><strong>Skeleton</strong></p><ol>${skeleton}</ol><p><strong>Checklist</strong></p><ul>${checklist}</ul>`;
      nextStep.textContent = "Quest complete: use support prompts and keep stacking focused paragraphs.";
      examForm.reset();
      await refreshDashboard();
    } else {
      examResult.innerHTML = `<p>${result.detail || "Could not generate template."}</p>`;
    }
  });

  refreshSupportButton.addEventListener("click", async () => {
    const response = await fetch("/support/suggestions");
    const result = await response.json();
    supportList.innerHTML = `<ul>${result.suggestions.map((text) => `<li>${text}</li>`).join("")}</ul>`;
    renderRewards(result.rewards);
  });

  refreshDashboard();
});
