/**
 * SUMMORA - Premium AI Text Summarizer
 * Client Application Logic
 */

// Sample Texts for Instant Testing
const SAMPLE_TEXTS = {
  ai: `Artificial intelligence has progressed at an astonishing pace over the past decade, transforming from academic experimentation into a cornerstone of the global digital economy. Breakthroughs in deep learning, transformer-based neural architectures, and large-scale language models have enabled machines to comprehend human language, generate creative content, and assist professionals in solving complex problems. In healthcare, machine learning models analyze radiographic imagery with remarkable diagnostic precision, identifying subtle anomalies earlier than traditional methods. In software engineering, intelligent coding assistants accelerate development cycles, automate test generation, and suggest architectural optimizations. However, this rapid proliferation has sparked vital conversations surrounding algorithmic bias, data privacy, and the ethical deployment of autonomous systems. Organizations worldwide are now prioritizing transparent AI frameworks, rigorous validation standards, and human-in-the-loop oversight to ensure that technological advancements benefit society responsibly.`,
  
  climate: `Renewable energy sources, particularly solar photovoltaics and offshore wind farms, have achieved unprecedented cost competitiveness over the past five years, accelerating the global transition away from fossil fuels. Advanced battery energy storage systems (BESS) are resolving the intermittency challenges historically associated with clean power generation by storing excess energy during peak production hours and dispatching it when demand spikes. Grid modernization initiatives, including smart metering, artificial intelligence for load forecasting, and decentralized microgrids, are strengthening infrastructure resilience against climate-induced extreme weather events. Furthermore, green hydrogen production through water electrolysis is emerging as a viable decarbonization pathway for heavy industries such as steel manufacturing and long-haul maritime shipping. International climate accords and progressive regulatory incentives continue to drive corporate capital towards sustainable infrastructure, making a net-zero carbon future technically and economically feasible.`,
  
  business: `Global supply chains are undergoing structural restructuring in response to shifting geopolitical dynamics, rising labor costs, and lessons learned from recent logistical disruptions. Multinational enterprises are increasingly departing from strict just-in-time inventory models in favor of resilient just-in-case strategies, prioritizing supplier diversification and regional nearshoring. Digital transformation plays a pivotal role in this evolution, with cloud-native Enterprise Resource Planning systems, Internet-of-Things sensor networks, and predictive predictive analytics providing end-to-end visibility from raw material sourcing to consumer delivery. At the same time, institutional investors are placing heightened emphasis on Environmental, Social, and Governance (ESG) metrics, demanding transparent carbon footprint tracking across Tier-1 and Tier-2 suppliers. Companies that proactively modernize their operations while upholding sustainability standards are consistently outperforming peers in operational efficiency and stakeholder trust.`
};

// Application State
const state = {
  currentMode: "standard",
  currentOriginalText: "",
  currentSummaryResult: null,
  activeView: "summarizer", // "summarizer", "history", "about"
  activeResultTab: "summary", // "summary", "comparison"
  speechSynthesisUtterance: null,
  isSpeaking: false
};

// DOM Elements
const elements = {
  // Nav
  navLinks: document.querySelectorAll(".nav-link"),
  sections: {
    summarizer: document.getElementById("section-summarizer"),
    history: document.getElementById("section-history"),
    about: document.getElementById("section-about")
  },
  modelStatusText: document.getElementById("model-status-text"),
  modelStatusDot: document.getElementById("model-status-dot"),
  themeToggleBtn: document.getElementById("theme-toggle-btn"),

  // Workspace
  inputText: document.getElementById("input-text"),
  charCount: document.getElementById("char-count"),
  wordCount: document.getElementById("word-count"),
  readTime: document.getElementById("read-time"),
  btnPaste: document.getElementById("btn-paste"),
  btnClear: document.getElementById("btn-clear"),
  btnUpload: document.getElementById("btn-upload"),
  fileInput: document.getElementById("file-input"),
  dropzone: document.getElementById("file-dropzone"),
  dropzoneFile: document.getElementById("dropzone-file"),
  modeBtns: document.querySelectorAll(".mode-btn"),
  btnSummarize: document.getElementById("btn-summarize"),
  btnSummarizeText: document.getElementById("btn-summarize-text"),
  samplePills: document.querySelectorAll(".sample-pill"),

  // Results
  resultsContainer: document.getElementById("results-container"),
  resultsModeBadge: document.getElementById("results-mode-badge"),
  summaryDisplay: document.getElementById("summary-display"),
  statOrigWords: document.getElementById("stat-orig-words"),
  statSummWords: document.getElementById("stat-summ-words"),
  statCompression: document.getElementById("stat-compression"),
  statProcTime: document.getElementById("stat-proc-time"),
  statSavedTime: document.getElementById("stat-saved-time"),
  btnCopySummary: document.getElementById("btn-copy-summary"),
  btnDownloadTxt: document.getElementById("btn-download-txt"),
  btnDownloadMd: document.getElementById("btn-download-md"),
  btnSpeakSummary: document.getElementById("btn-speak-summary"),
  btnRegenerate: document.getElementById("btn-regenerate"),
  btnResetAll: document.getElementById("btn-reset-all"),
  viewTabs: document.querySelectorAll(".view-tab"),
  viewSummaryTab: document.getElementById("view-summary-content"),
  viewComparisonTab: document.getElementById("view-comparison-content"),
  compOriginalText: document.getElementById("comp-original-text"),
  compSummaryText: document.getElementById("comp-summary-text"),

  // History
  historyList: document.getElementById("history-list"),
  historyEmpty: document.getElementById("history-empty"),
  btnClearHistory: document.getElementById("btn-clear-history"),
  btnExportHistory: document.getElementById("btn-export-history"),

  // Specs in About
  specArch: document.getElementById("spec-arch"),
  specDevice: document.getElementById("spec-device"),
  specVocab: document.getElementById("spec-vocab"),
  specLoadTime: document.getElementById("spec-load-time"),

  // Toast
  toastContainer: document.getElementById("toast-container")
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNavigation();
  initTextareaCounters();
  initWorkspaceActions();
  initModeSelection();
  initResultsActions();
  initHistory();
  initSettingsModal();
  checkModelReadiness();
});

// Periodic check for model warmup
async function checkModelReadiness() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.model_loaded) {
      await fetchModelInfo();
    } else {
      elements.modelStatusText.textContent = "Warming up model...";
      elements.modelStatusDot.classList.add("loading");
      setTimeout(checkModelReadiness, 2500);
    }
  } catch (e) {
    setTimeout(checkModelReadiness, 3000);
  }
}

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem("summora_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  
  elements.themeToggleBtn?.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("summora_theme", newTheme);
    showToast(`Switched to ${newTheme} theme`, "info");
  });
}

// Navigation Tabs
function initNavigation() {
  elements.navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.getAttribute("data-target");
      switchSection(target);
    });
  });
}

function switchSection(targetSection) {
  state.activeView = targetSection;
  
  // Update nav links
  elements.navLinks.forEach((l) => {
    if (l.getAttribute("data-target") === targetSection) {
      l.classList.add("active");
    } else {
      l.classList.remove("active");
    }
  });

  // Switch section views
  Object.keys(elements.sections).forEach((key) => {
    const sec = elements.sections[key];
    if (sec) {
      if (key === targetSection || (targetSection === "home" && key === "summarizer")) {
        sec.classList.add("active");
        sec.style.display = "block";
      } else {
        sec.classList.remove("active");
        sec.style.display = "none";
      }
    }
  });

  if (targetSection === "history") {
    renderHistoryList();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Fetch Model & Hardware Info
async function fetchModelInfo() {
  try {
    const res = await fetch("/api/model-info");
    const json = await res.json();
    if (json.success && json.model_info) {
      const info = json.model_info;
      const deviceLabel = info.device === "cuda" ? `GPU (${info.device_name || "CUDA"})` : "CPU";
      elements.modelStatusText.textContent = `Model Ready • ${deviceLabel}`;
      elements.modelStatusDot.classList.remove("loading");
      
      // Update About section specs
      if (elements.specArch) elements.specArch.textContent = info.architecture || "T5ForConditionalGeneration";
      if (elements.specDevice) elements.specDevice.textContent = `${info.device.toUpperCase()} (${info.device_name || "Host"})`;
      if (elements.specVocab) elements.specVocab.textContent = `${info.vocab_size?.toLocaleString() || 32128} tokens`;
      if (elements.specLoadTime) elements.specLoadTime.textContent = `${info.load_time_sec || 0}s`;
      
      const modalArch = document.getElementById("modal-model-arch");
      const modalDevice = document.getElementById("modal-model-device");
      if (modalArch) modalArch.textContent = `${info.architecture || "T5ForConditionalGeneration"} (T5-small Fine-tuned)`;
      if (modalDevice) modalDevice.textContent = `${info.device?.toUpperCase()} Acceleration (${info.device_name || "CUDA Device"})`;
    }
  } catch (e) {
    console.warn("Could not fetch model info:", e);
    elements.modelStatusText.textContent = "Model Connected";
  }
}

// Textarea Counters & Word Stats
function initTextareaCounters() {
  elements.inputText.addEventListener("input", updateCounters);
  elements.inputText.addEventListener("keydown", (e) => {
    // Ctrl + Enter shortcut to trigger summarization
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      elements.btnSummarize.click();
    }
  });
}

function updateCounters() {
  const text = elements.inputText.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  
  elements.charCount.textContent = chars.toLocaleString();
  elements.wordCount.textContent = words.toLocaleString();

  // Reading time (~200 wpm)
  const minutes = Math.ceil(words / 200);
  elements.readTime.textContent = words > 0 ? `~${minutes} min read` : "~0 min read";

  return { chars, words };
}

// Workspace Toolbar & Preset Buttons
function initWorkspaceActions() {
  // Clear button
  elements.btnClear.addEventListener("click", () => {
    elements.inputText.value = "";
    updateCounters();
    elements.resultsContainer.classList.remove("active");
    elements.resultsContainer.style.display = "none";
    stopSpeaking();
    showToast("Workspace cleared", "info");
  });

  // Paste button
  elements.btnPaste.addEventListener("click", async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        elements.inputText.value = clipText;
        updateCounters();
        showToast("Pasted text from clipboard", "success");
      } else {
        showToast("Clipboard is empty", "error");
      }
    } catch (e) {
      showToast("Clipboard access was denied. Please paste manually (Ctrl+V)", "error");
    }
  });

  // Sample texts
  elements.samplePills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const type = pill.getAttribute("data-sample");
      if (SAMPLE_TEXTS[type]) {
        elements.inputText.value = SAMPLE_TEXTS[type];
        updateCounters();
        showToast(`Loaded sample text: ${pill.textContent}`, "info");
      }
    });
  });

  // Upload trigger
  elements.btnUpload.addEventListener("click", () => {
    elements.dropzone.classList.toggle("active");
  });

  elements.dropzone.addEventListener("click", () => {
    elements.fileInput.click();
  });

  elements.fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  });

  // Drag and drop
  elements.dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    elements.dropzone.classList.add("dragover");
  });

  elements.dropzone.addEventListener("dragleave", () => {
    elements.dropzone.classList.remove("dragover");
  });

  elements.dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  // Summarize button click
  elements.btnSummarize.addEventListener("click", generateSummary);
}

// Mode Selector (Short, Standard, Detailed)
function initModeSelection() {
  elements.modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.modeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.currentMode = btn.getAttribute("data-mode");
    });
  });
}

// File Upload Handler
async function handleFileUpload(file) {
  const allowed = [".txt", ".pdf"];
  const isAllowed = allowed.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!isAllowed) {
    showToast("Unsupported file format. Please upload a .txt or .pdf file.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  showToast(`Extracting text from ${file.name}...`, "info");

  try {
    const res = await fetch("/api/extract-text", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Failed to extract text from file.");
    }

    elements.inputText.value = data.text;
    updateCounters();
    elements.dropzone.classList.remove("active");
    showToast(`Successfully extracted ${data.word_count.toLocaleString()} words from ${file.name}!`, "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Core Summarization Generator
async function generateSummary() {
  const text = elements.inputText.value.trim();
  const { words } = updateCounters();

  if (!text) {
    showToast("Please enter or paste text to summarize.", "error");
    elements.inputText.focus();
    return;
  }

  if (words < 15) {
    showToast(`Text has only ${words} words. Please provide at least 15 words for a meaningful summary.`, "error");
    return;
  }

  // Set Loading State
  setLoadingState(true);
  stopSpeaking();

  try {
    const response = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text,
        mode: state.currentMode
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || "Summarization failed. Please check your model or input.");
    }

    const data = result.data;
    state.currentOriginalText = text;
    state.currentSummaryResult = data;

    // Render Results
    renderResults(data, text);

    // Save to Local History
    saveToHistory(text, data);

    showToast("Summary generated successfully!", "success");

    // Smooth scroll down to results
    elements.resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(isLoading) {
  if (isLoading) {
    elements.btnSummarize.disabled = true;
    elements.btnSummarize.innerHTML = `
      <span class="spinner"></span>
      <span>Generating Summary...</span>
    `;
  } else {
    elements.btnSummarize.disabled = false;
    elements.btnSummarize.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      <span>Generate Summary</span>
    `;
  }
}

// Render Results & Metrics
function renderResults(data, originalText) {
  elements.resultsContainer.classList.add("active");
  elements.resultsContainer.style.display = "block";

  elements.resultsModeBadge.textContent = `${data.mode} mode`;
  elements.summaryDisplay.textContent = data.summary;

  // Statistics
  elements.statOrigWords.textContent = data.original_word_count.toLocaleString();
  elements.statSummWords.textContent = data.summary_word_count.toLocaleString();
  elements.statCompression.textContent = data.compression_ratio;
  elements.statProcTime.textContent = data.processing_time;

  // Time saved calculation
  const origMins = Math.round((data.original_word_count / 200) * 10) / 10;
  const summMins = Math.round((data.summary_word_count / 200) * 10) / 10;
  const savedMins = Math.max(0.1, Math.round((origMins - summMins) * 10) / 10);
  elements.statSavedTime.textContent = `~${savedMins}m saved`;

  // Comparison Tab
  elements.compOriginalText.textContent = originalText;
  elements.compSummaryText.textContent = data.summary;

  // Default to summary view
  switchResultTab("summary");
}

// Results Actions (Copy, Download, Speech, Tabs)
function initResultsActions() {
  // Copy Summary
  elements.btnCopySummary.addEventListener("click", async () => {
    const text = elements.summaryDisplay.textContent;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Summary copied to clipboard!", "success");
    } catch (e) {
      showToast("Could not copy to clipboard", "error");
    }
  });

  // Download TXT
  elements.btnDownloadTxt.addEventListener("click", () => {
    const text = elements.summaryDisplay.textContent;
    if (!text) return;
    downloadFile(text, "summora_summary.txt", "text/plain");
    showToast("Downloaded summary as TXT", "success");
  });

  // Download Markdown
  elements.btnDownloadMd.addEventListener("click", () => {
    const text = elements.summaryDisplay.textContent;
    if (!text) return;
    const mdContent = `# SUMMORA AI Summary\n\n*Generated on: ${new Date().toLocaleString()}*\n*Compression: ${elements.statCompression.textContent} (${elements.statOrigWords.textContent} words -> ${elements.statSummWords.textContent} words)*\n\n---\n\n${text}\n`;
    downloadFile(mdContent, "summora_summary.md", "text/markdown");
    showToast("Downloaded summary as Markdown", "success");
  });

  // Text-to-Speech
  elements.btnSpeakSummary.addEventListener("click", toggleSpeakSummary);

  // Regenerate
  elements.btnRegenerate.addEventListener("click", () => {
    generateSummary();
  });

  // Reset workspace
  elements.btnResetAll.addEventListener("click", () => {
    elements.btnClear.click();
  });

  // View switcher (Summary vs Comparison)
  elements.viewTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const view = tab.getAttribute("data-view");
      switchResultTab(view);
    });
  });
}

function switchResultTab(tabName) {
  state.activeResultTab = tabName;
  elements.viewTabs.forEach((t) => {
    if (t.getAttribute("data-view") === tabName) {
      t.classList.add("active");
    } else {
      t.classList.remove("active");
    }
  });

  if (tabName === "summary") {
    elements.viewSummaryTab.style.display = "block";
    elements.viewComparisonTab.style.display = "none";
  } else {
    elements.viewSummaryTab.style.display = "none";
    elements.viewComparisonTab.style.display = "block";
  }
}

// Audio Speech Synthesis (Read Aloud)
function toggleSpeakSummary() {
  if (!("speechSynthesis" in window)) {
    showToast("Text-to-speech is not supported in this browser.", "error");
    return;
  }

  if (state.isSpeaking) {
    stopSpeaking();
    return;
  }

  const text = elements.summaryDisplay.textContent;
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onend = () => {
    stopSpeaking();
  };

  utterance.onerror = () => {
    stopSpeaking();
  };

  state.speechSynthesisUtterance = utterance;
  state.isSpeaking = true;
  window.speechSynthesis.speak(utterance);

  elements.btnSpeakSummary.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
    <span>Pause</span>
  `;
}

function stopSpeaking() {
  if ("speechSynthesis" in window && state.isSpeaking) {
    window.speechSynthesis.cancel();
  }
  state.isSpeaking = false;
  state.speechSynthesisUtterance = null;
  if (elements.btnSpeakSummary) {
    elements.btnSpeakSummary.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
      <span>Read Aloud</span>
    `;
  }
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Local Storage History Management
const HISTORY_KEY = "summora_history_v1";

function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveToHistory(originalText, summaryData) {
  const history = getHistory();
  
  // Extract clean title from first few words of input
  const words = originalText.trim().split(/\s+/);
  const title = words.slice(0, 7).join(" ") + (words.length > 7 ? "..." : "");

  const item = {
    id: "sum_" + Date.now(),
    title: title,
    date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    time: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    originalText: originalText,
    summary: summaryData.summary,
    originalWordCount: summaryData.original_word_count,
    summaryWordCount: summaryData.summary_word_count,
    compressionRatio: summaryData.compression_ratio,
    processingTime: summaryData.processing_time,
    mode: summaryData.mode
  };

  history.unshift(item); // Add to beginning
  // Limit to 50 items
  if (history.length > 50) history.pop();

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function renderHistoryList() {
  const history = getHistory();

  if (!history || history.length === 0) {
    elements.historyList.style.display = "none";
    elements.historyEmpty.style.display = "block";
    return;
  }

  elements.historyList.style.display = "flex";
  elements.historyEmpty.style.display = "none";
  elements.historyList.innerHTML = "";

  history.forEach((item) => {
    const card = document.createElement("div");
    card.className = "history-card";
    card.innerHTML = `
      <div class="history-card-top">
        <h4 class="history-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h4>
        <span class="history-date">${item.date} • ${item.time}</span>
      </div>
      <p class="history-snippet">${escapeHtml(item.summary)}</p>
      <div class="history-meta">
        <div class="history-tags">
          <span class="history-badge">${escapeHtml(item.mode || "standard")}</span>
          <span>${item.originalWordCount} → ${item.summaryWordCount} words</span>
          <span class="history-badge" style="background-color: var(--accent-gold-pale); color: #8C6A1E;">${item.compressionRatio}</span>
        </div>
        <div class="history-actions">
          <button class="tool-btn btn-history-open" data-id="${item.id}" title="Open in workspace">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            <span>Open</span>
          </button>
          <button class="tool-btn btn-history-copy" data-id="${item.id}" title="Copy Summary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="tool-btn btn-history-del" data-id="${item.id}" title="Delete record">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;

    // History card click actions
    const btnOpen = card.querySelector(".btn-history-open");
    const btnCopy = card.querySelector(".btn-history-copy");
    const btnDel = card.querySelector(".btn-history-del");

    btnOpen.addEventListener("click", () => {
      restoreHistoryItem(item);
    });

    btnCopy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(item.summary);
        showToast("Summary copied from history!", "success");
      } catch (e) {
        showToast("Failed to copy", "error");
      }
    });

    btnDel.addEventListener("click", () => {
      deleteHistoryItem(item.id);
    });

    elements.historyList.appendChild(card);
  });
}

function restoreHistoryItem(item) {
  elements.inputText.value = item.originalText;
  updateCounters();

  const mockResultData = {
    summary: item.summary,
    original_word_count: item.originalWordCount,
    summary_word_count: item.summaryWordCount,
    compression_ratio: item.compressionRatio,
    processing_time: item.processingTime || "Cached",
    mode: item.mode || "standard"
  };

  renderResults(mockResultData, item.originalText);
  switchSection("summarizer");
  showToast("Restored summary to workspace", "info");
}

function deleteHistoryItem(id) {
  let history = getHistory();
  history = history.filter((i) => i.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistoryList();
  showToast("Record removed", "info");
}

function initHistory() {
  elements.btnClearHistory?.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all summarization history?")) {
      localStorage.removeItem(HISTORY_KEY);
      renderHistoryList();
      showToast("History cleared", "info");
    }
  });

  elements.btnExportHistory?.addEventListener("click", () => {
    const history = getHistory();
    if (!history.length) {
      showToast("No history to export", "error");
      return;
    }
    const jsonStr = JSON.stringify(history, null, 2);
    downloadFile(jsonStr, "summora_history.json", "application/json");
    showToast("Exported history as JSON", "success");
  });
}

// Toast Notifications Helper
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = "";
  if (type === "success") {
    icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === "error") {
    icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else {
    icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// Utility: Escape HTML
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// Settings Modal
function initSettingsModal() {
  const modal = document.getElementById("settings-modal");
  const btnToggle = document.getElementById("settings-toggle-btn");
  const btnClose = document.getElementById("btn-close-modal");
  const btnSave = document.getElementById("btn-save-settings");

  function openModal() {
    if (modal) modal.style.display = "flex";
  }

  function closeModal() {
    if (modal) modal.style.display = "none";
  }

  btnToggle?.addEventListener("click", openModal);
  btnClose?.addEventListener("click", closeModal);
  btnSave?.addEventListener("click", closeModal);

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}
