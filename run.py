"""
SUMMORA - Local AI Text Summarizer Runner
Starts the FastAPI backend web server powered by the local T5 model.
"""
import sys
import os
import uvicorn

if __name__ == "__main__":
    host = "127.0.0.1"
    port = 8000
    
    print("\n" + "=" * 60)
    print("           SUMMORA - AI TEXT SUMMARIZER")
    print("         Less Reading. More Understanding.")
    print("=" * 60)
    print(f"[*] Starting local server at: http://{host}:{port}")
    print(f"[*] Access the web application in your browser at: http://localhost:{port}")
    print("=" * 60 + "\n")
    
    uvicorn.run("app:app", host=host, port=port, reload=False)

