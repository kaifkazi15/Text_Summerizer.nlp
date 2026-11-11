import os
import time
import threading
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from backend.model_service import SummarizerService
from backend.file_extractor import extract_text_from_file

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

app = FastAPI(
    title="SUMMORA - AI Text Summarizer",
    description="Premium SaaS AI Text Summarizer powered by fine-tuned T5 neural network.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Warm up model in background daemon thread on startup
def _preload_model():
    print("[SUMMORA] Background worker starting model preload...", flush=True)
    try:
        service = SummarizerService.get_instance()
        service.load_model()
    except Exception as e:
        print(f"[SUMMORA] Preload encountered error: {e}", flush=True)

threading.Thread(target=_preload_model, daemon=True).start()


class SummarizeRequest(BaseModel):
    text: str = Field(..., description="The raw text to summarize.")
    mode: Optional[str] = Field("standard", description="Summary mode: 'short', 'standard', or 'detailed'.")


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = os.path.join(TEMPLATES_DIR, "index.html")
    if not os.path.exists(index_path):
        return HTMLResponse("<h1>SUMMORA is starting up... Please refresh in a moment.</h1>", status_code=200)
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()
    return HTMLResponse(content)


@app.get("/api/health")
async def health_check():
    service = SummarizerService.get_instance()
    return {
        "status": "healthy",
        "model_loaded": service.is_loaded,
        "device": service.device or "detecting",
        "timestamp": time.time()
    }


@app.get("/api/model-info")
async def model_info():
    service = SummarizerService.get_instance()
    if not service.is_loaded:
        service.load_model()
    return {
        "success": True,
        "model_info": service.model_info
    }


@app.post("/api/summarize")
async def summarize_text(req: SummarizeRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty. Please provide text to summarize.")
    
    if req.mode not in ["short", "standard", "detailed"]:
        req.mode = "standard"

    service = SummarizerService.get_instance()
    if not service.is_loaded:
        service.load_model()

    try:
        result = service.summarize(text=req.text, mode=req.mode)
        return {"success": True, "data": result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@app.post("/api/extract-text")
async def upload_file_extract(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")
    
    allowed_exts = (".txt", ".pdf")
    if not file.filename.lower().endswith(allowed_exts):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .txt and .pdf files are supported.")
    
    try:
        content_bytes = await file.read()
        if len(content_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        
        if len(content_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")

        extracted_text, filename = extract_text_from_file(file.filename, content_bytes)
        
        words = extracted_text.split()
        return {
            "success": True,
            "filename": filename,
            "text": extracted_text,
            "word_count": len(words),
            "char_count": len(extracted_text)
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
