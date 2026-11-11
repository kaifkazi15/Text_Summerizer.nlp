import os
import re
import time
import threading
from typing import Dict, Any, List

# Ensure local offline loading for transformers
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model"))


class SummarizerService:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.device = None
        self.tokenizer = None
        self.model = None
        self.torch = None
        self.is_loaded = False
        self.load_error = None
        self.model_info = {}

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def load_model(self):
        """Loads torch, transformers, and the T5 model/tokenizer from the local model directory."""
        if self.is_loaded:
            return

        with self._lock:
            if self.is_loaded:
                return

            try:
                print(f"[SUMMORA] Initializing neural dependencies and model from '{MODEL_DIR}'...", flush=True)
                t_start = time.time()

                # Lazy load heavy dependencies
                import torch
                from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

                self.torch = torch
                self.device = "cuda" if torch.cuda.is_available() else "cpu"

                print(f"[SUMMORA] Loading weights into device: {self.device}...", flush=True)
                self.tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, local_files_only=True)
                self.model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_DIR, local_files_only=True)
                self.model.to(self.device)
                self.model.eval()

                t_end = time.time()
                self.is_loaded = True
                self.model_info = {
                    "architecture": type(self.model).__name__,
                    "device": self.device,
                    "device_name": torch.cuda.get_device_name(0) if self.device == "cuda" else "CPU",
                    "vocab_size": self.tokenizer.vocab_size if hasattr(self.tokenizer, "vocab_size") else 32128,
                    "load_time_sec": round(t_end - t_start, 2),
                    "model_dir": MODEL_DIR
                }
                print(f"[SUMMORA] Model successfully loaded in {self.model_info['load_time_sec']}s on {self.device}!", flush=True)
            except Exception as e:
                self.load_error = str(e)
                print(f"[SUMMORA] ERROR loading model: {e}", flush=True)
                raise e

    def _split_into_sentences(self, text: str) -> List[str]:
        """Splits text into sentences cleanly based on punctuation."""
        text = re.sub(r'\s+', ' ', text).strip()
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    def _create_chunks(self, text: str, max_chunk_tokens: int = 380) -> List[str]:
        """Groups sentences into chunks that do not exceed max_chunk_tokens."""
        sentences = self._split_into_sentences(text)
        if not sentences:
            return [text]

        chunks = []
        current_chunk = []
        current_tokens = 0

        for sentence in sentences:
            tokenized_len = len(self.tokenizer.encode(sentence, truncation=False))
            
            # If a single sentence is exceptionally long, slice it by words
            if tokenized_len > max_chunk_tokens:
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                    current_chunk = []
                    current_tokens = 0
                
                words = sentence.split()
                sub_chunk = []
                sub_tokens = 0
                for w in words:
                    w_tokens = len(self.tokenizer.encode(w, truncation=False))
                    if sub_tokens + w_tokens > max_chunk_tokens:
                        if sub_chunk:
                            chunks.append(" ".join(sub_chunk))
                        sub_chunk = [w]
                        sub_tokens = w_tokens
                    else:
                        sub_chunk.append(w)
                        sub_tokens += w_tokens
                if sub_chunk:
                    chunks.append(" ".join(sub_chunk))
                continue

            if current_tokens + tokenized_len <= max_chunk_tokens:
                current_chunk.append(sentence)
                current_tokens += tokenized_len
            else:
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                current_chunk = [sentence]
                current_tokens = tokenized_len

        if current_chunk:
            chunks.append(" ".join(current_chunk))

        return chunks if chunks else [text]

    def _generate_chunk_summary(self, chunk: str, max_length: int, min_length: int, num_beams: int, length_penalty: float) -> str:
        """Runs inference for an individual text chunk using the T5 model."""
        prefix = "summarize: "
        clean_chunk = chunk.strip()
        if not clean_chunk.lower().startswith("summarize:"):
            input_text = f"{prefix}{clean_chunk}"
        else:
            input_text = clean_chunk

        inputs = self.tokenizer(
            input_text,
            max_length=512,
            truncation=True,
            return_tensors="pt"
        ).to(self.device)

        with self.torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_length=max_length,
                min_length=min_length,
                num_beams=num_beams,
                length_penalty=length_penalty,
                no_repeat_ngram_size=3,
                early_stopping=True
            )

        summary = self.tokenizer.decode(outputs[0], skip_special_tokens=True).strip()
        return summary

    def summarize(self, text: str, mode: str = "standard") -> Dict[str, Any]:
        """
        Summarizes input text using the trained T5 model with chunking and post-processing.
        Modes:
          - 'short': Concise executive summary
          - 'standard': Balanced core insights
          - 'detailed': Comprehensive detailed summary
        """
        if not self.is_loaded:
            self.load_model()

        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Input text cannot be empty.")

        words = clean_text.split()
        original_word_count = len(words)
        original_char_count = len(clean_text)

        if original_word_count < 15:
            raise ValueError(
                f"Input text has only {original_word_count} words. Please provide at least 15 words to generate a meaningful summary."
            )

        t_start = time.time()

        # Parameter presets based on summary mode
        if mode == "short":
            max_len = 80
            min_len = 25
            beams = 4
            penalty = 1.0
        elif mode == "detailed":
            max_len = 220
            min_len = 70
            beams = 4
            penalty = 2.5
        else:  # standard
            max_len = 150
            min_len = 45
            beams = 4
            penalty = 2.0

        # Check total tokens
        tokens = self.tokenizer.encode(clean_text, truncation=False)
        total_tokens = len(tokens)

        with self._lock:
            if total_tokens <= 420:
                # Single chunk direct summarization
                summary_text = self._generate_chunk_summary(
                    clean_text,
                    max_length=max_len,
                    min_length=min_len,
                    num_beams=beams,
                    length_penalty=penalty
                )
                chunks_count = 1
            else:
                # Multi-chunk summarization for long texts
                chunks = self._create_chunks(clean_text, max_chunk_tokens=380)
                chunks_count = len(chunks)
                chunk_summaries = []

                for chunk in chunks:
                    chunk_sum = self._generate_chunk_summary(
                        chunk,
                        max_length=max(min_len + 15, int(max_len * 0.75)),
                        min_length=min(min_len, 20),
                        num_beams=beams,
                        length_penalty=penalty
                    )
                    if chunk_sum:
                        chunk_summaries.append(chunk_sum)

                combined_summary = " ".join(chunk_summaries)

                # If multiple chunks and combined summary is still long, synthesize if requested mode is short or standard
                combined_words = len(combined_summary.split())
                if chunks_count > 2 and combined_words > 200 and mode in ("short", "standard"):
                    summary_text = self._generate_chunk_summary(
                        combined_summary,
                        max_length=max_len,
                        min_length=min_len,
                        num_beams=beams,
                        length_penalty=penalty
                    )
                else:
                    summary_text = combined_summary

        t_end = time.time()
        elapsed_sec = round(t_end - t_start, 2)

        summary_words = len(summary_text.split())
        summary_char_count = len(summary_text)

        # Calculate compression ratio
        if original_word_count > 0:
            compression_pct = round(max(0.0, (1.0 - (summary_words / original_word_count)) * 100.0), 1)
        else:
            compression_pct = 0.0

        # Estimated reading times (assuming avg 200 wpm)
        orig_reading_time_sec = max(1, round((original_word_count / 200) * 60))
        sum_reading_time_sec = max(1, round((summary_words / 200) * 60))
        time_saved_sec = max(0, orig_reading_time_sec - sum_reading_time_sec)

        return {
            "summary": summary_text,
            "original_word_count": original_word_count,
            "original_char_count": original_char_count,
            "summary_word_count": summary_words,
            "summary_char_count": summary_char_count,
            "compression_ratio": f"{compression_pct}%",
            "compression_pct": compression_pct,
            "processing_time": f"{elapsed_sec}s",
            "processing_time_sec": elapsed_sec,
            "chunks_processed": chunks_count,
            "mode": mode,
            "device": self.device,
            "reading_time_original_sec": orig_reading_time_sec,
            "reading_time_summary_sec": sum_reading_time_sec,
            "time_saved_sec": time_saved_sec
        }
