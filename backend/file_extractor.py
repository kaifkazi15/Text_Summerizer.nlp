import io
from typing import Tuple
from pypdf import PdfReader


def extract_text_from_file(filename: str, content_bytes: bytes) -> Tuple[str, str]:
    """
    Extracts text from uploaded TXT or PDF bytes.
    Returns (extracted_text, filename).
    """
    lower_name = filename.lower()
    
    if lower_name.endswith(".txt"):
        try:
            text = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = content_bytes.decode("latin-1")
            except UnicodeDecodeError:
                text = content_bytes.decode("cp1252", errors="ignore")
        return text.strip(), filename
        
    elif lower_name.endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(content_bytes))
            pages_text = []
            for i, page in enumerate(reader.pages):
                page_content = page.extract_text()
                if page_content:
                    pages_text.append(page_content.strip())
            
            full_text = "\n\n".join(pages_text).strip()
            if not full_text:
                raise ValueError("The uploaded PDF does not contain extractable text (it may be scanned images).")
            return full_text, filename
        except Exception as e:
            raise ValueError(f"Could not read PDF file: {str(e)}")
            
    else:
        raise ValueError("Unsupported file format. Please upload a .txt or .pdf file.")

