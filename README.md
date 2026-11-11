# SUMMORA — Premium AI Text Summarizer

> **"Less Reading. More Understanding."**

A production-grade, privacy-first AI Text Summarization SaaS web application powered by your fine-tuned **T5 (Text-to-Text Transfer Transformer)** neural network running locally on your hardware.

---

## 🌟 Key Features

- **Local Neural Inference**: Powered directly by your local trained T5 model (`model.safetensors`). No third-party APIs, no OpenAI or Anthropic keys required, and zero cloud data leaks.
- **GPU Acceleration**: Automatically leverages NVIDIA CUDA if available, with smooth fallback to CPU.
- **Intelligent Long Document Chunking**: Handles texts of arbitrary length without silent truncation using recursive sentence-aware chunking and hierarchical synthesis.
- **Three Summarization Modes**:
  - **Short**: Concise executive summary (~50–80 words).
  - **Standard**: Balanced core points and findings (~100–150 words).
  - **Detailed**: Comprehensive and in-depth summary (~180–240 words).
- **Document Ingestion**:
  - Direct paste with real-time character, word, and reading-time counters.
  - Document file upload supporting **`.txt`** and **`.pdf`** files with drag-and-drop.
  - One-click sample presets (AI Tech, Clean Energy, Supply Chain).
- **Rich Results & Analytics**:
  - Key metrics: Original word count, Summary word count, Compression ratio, Inference processing time, Reading time saved.
  - Side-by-side comparison view (Original vs Summary).
  - Copy to clipboard with instant toast confirmation.
  - Export summaries as **TXT** or **Markdown (.md)**.
  - Audio Read-Aloud (Text-to-Speech) using Web Speech API.
- **Session History**:
  - View previous summaries with timestamps, word counts, and compression badges.
  - Re-open/restore past summaries into the workspace with 1 click.
  - Export complete history as JSON.
- **Design System**:
  - Designed adhering strictly to the warm, minimal luxury aesthetic:
    - Warm Off-White (`#FAF9F6`)
    - Pure White (`#FFFFFF`)
    - Soft Golden Yellow (`#D4A853`)
    - Pale Gold (`#F2E6C8`)
    - Dark Charcoal (`#242424`)
    - Soft Beige (`#EAE5DB`)
  - Warm light & dark theme toggle.

---

## 📁 Project Architecture

```
Text_Summerizer(nlp)/
├── model/                         # Your trained T5 model files
│   ├── config.json                # Model architecture & generation hyperparameters
│   ├── generation_config.json     # Decoder start & EOS token configurations
│   ├── model.safetensors          # Neural network weights (242 MB)
│   ├── tokenizer.json             # Fast tokenizer vocabulary & merges
│   └── tokenizer_config.json      # Tokenizer special token definitions
├── backend/
│   ├── __init__.py
│   ├── model_service.py           # Thread-safe T5 loader, chunker & inference engine
│   └── file_extractor.py          # Document text extraction (.txt & .pdf)
├── static/
│   ├── css/
│   │   └── style.css              # Custom styling & responsive design tokens
│   └── js/
│       └── app.js                 # Frontend application logic, clipboard, history
├── templates/
│   └── index.html                 # Main SaaS dashboard & layout
├── app.py                         # FastAPI backend application & API routes
├── run.py                         # Launcher script
├── requirements.txt               # Dependencies
└── README.md                      # Documentation
```

---

## 🚀 Quick Start Guide

### 1. Requirements

Ensure you have Python 3.10+ installed. All required packages can be installed via:

```bash
pip install -r requirements.txt
```

### 2. Start the Server

Run the application:

```bash
python run.py
```

Or using uvicorn directly:

```bash
uvicorn app:app --host 127.0.0.1 --port 8000
```

### 3. Open in Browser

Open your browser and navigate to:
```
http://localhost:8000
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the SUMMORA Web Application |
| `POST` | `/api/summarize` | Summarizes text (`{ text: str, mode: "short"\|"standard"\|"detailed" }`) |
| `POST` | `/api/extract-text` | Extracts text from uploaded `.txt` or `.pdf` file |
| `GET` | `/api/model-info` | Returns model architecture, vocab size, device (CUDA/CPU) |
| `GET` | `/api/health` | Health check endpoint |

---

## 🔒 Privacy & Offline Assurance

SUMMORA is configured with `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1`. All text processing and AI inference are strictly contained on your local machine with zero external network dependencies.

