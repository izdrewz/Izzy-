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

  function showResult(container, message) {
    container.replaceChildren();
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    container.appendChild(paragraph);
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || "The request could not be completed.");
    }
    return result;
  }

  function renderSources(sources) {
    sourcesList.replaceChildren();
    const entries = Object.entries(sources);
    if (entries.length === 0) {
      showResult(sourcesList, "No sources yet. Add one PDF note to begin.");
      return;
    }
    entries.forEach(([id, source]) => {
      const card = document.createElement("div");
      card.className = "activity-card";
      const title = document.createElement("h4");
      title.textContent = source.title;
      const sourceId = document.createElement("p");
      sourceId.textContent = `ID: ${id}`;
      const sourceType = document.createElement("p");
      sourceType.textContent = source.source_type.toUpperCase();
      card.append(title, sourceId, sourceType);
      sourcesList.appendChild(card);
    });
  }

  function renderRewards(rewards) {
    const badges = rewards.badges.length > 0 ? rewards.badges.join(", ") : "No badges yet";
    rewardsPanel.replaceChildren();
    const xp = document.createElement("p");
    xp.textContent = `XP: ${rewards.xp}`;
    const badgeList = document.createElement("p");
    badgeList.textContent = `Badges: ${badges}`;
    rewardsPanel.append(xp, badgeList);
  }

  async function refreshDashboard() {
    const dashboard = await requestJson("/dashboard");
    renderSources(dashboard.sources);
    renderRewards(dashboard.rewards);
  }

  sourceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = document.getElementById("source-title").value.trim();
    const content = document.getElementById("source-content").value.trim();
    try {
      const result = await requestJson("/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, source_type: "pdf" }),
      });
      nextStep.textContent = `Source stored as ${result.source_id}. Next step: write one paragraph and link source IDs.`;
      sourceForm.reset();
      await refreshDashboard();
    } catch (error) {
      nextStep.textContent = error.message;
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
    try {
      const result = await requestJson("/essay/paragraph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source_ids: sourceIds }),
      });
      paragraphResult.replaceChildren();
      showResult(paragraphResult, result.support_tip);
      const list = document.createElement("ul");
      result.paragraph.context_links.forEach((link) => {
        const item = document.createElement("li");
        item.textContent = `${link.title}: ${link.similar_words.join(", ") || "no close matches yet"}`;
        list.appendChild(item);
      });
      paragraphResult.appendChild(list);
      nextStep.textContent = "Great! Now paste an exam question to generate a skeleton template.";
      paragraphForm.reset();
      await refreshDashboard();
    } catch (error) {
      showResult(paragraphResult, error.message);
    }
  });

  examForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = document.getElementById("exam-question").value.trim();
    const guidance = document.getElementById("exam-guidance").value.trim();
    try {
      const result = await requestJson("/exam-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, guidance }),
      });
      examResult.replaceChildren();
      const skeletonHeading = document.createElement("p");
      skeletonHeading.textContent = "Skeleton";
      const skeleton = document.createElement("ol");
      result.skeleton.forEach((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        skeleton.appendChild(item);
      });
      const checklistHeading = document.createElement("p");
      checklistHeading.textContent = "Checklist";
      const checklist = document.createElement("ul");
      result.checklist.forEach((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        checklist.appendChild(item);
      });
      examResult.append(skeletonHeading, skeleton, checklistHeading, checklist);
      nextStep.textContent = "Quest complete: use support prompts and keep stacking focused paragraphs.";
      examForm.reset();
      await refreshDashboard();
    } catch (error) {
      showResult(examResult, error.message);
    }
  });

  refreshSupportButton.addEventListener("click", async () => {
    try {
      const result = await requestJson("/support/suggestions");
      supportList.replaceChildren();
      const list = document.createElement("ul");
      result.suggestions.forEach((text) => {
        const item = document.createElement("li");
        item.textContent = text;
        list.appendChild(item);
      });
      supportList.appendChild(list);
      renderRewards(result.rewards);
    } catch (error) {
      showResult(supportList, error.message);
    }
  });

  refreshDashboard().catch((error) => {
    showResult(sourcesList, error.message);
  });
});
