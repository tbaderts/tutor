"""Speech sidecar for Tutor: Kokoro text-to-speech and faster-whisper speech-to-text over local HTTP.

The Electron main process (src/main/services/SpeechService.ts) starts this script, waits for the
"READY <port>" line on stdout, and talks to it on 127.0.0.1 only. The process exits when its stdin
closes, so it never outlives the app.

Endpoints:
  GET  /status                         engine states (idle | loading | ready | error)
  POST /configure  {whisper, device}   (re)load both engines in the background
  POST /tts        {text, voice, speed, lang}  -> audio/wav (mono, 16-bit)
  POST /stt?lang=it  body: float32 little-endian PCM, 16 kHz mono -> {text, unsure}
"""
import argparse
import gc
import io
import json
import os
import sys
import threading
import traceback
import urllib.request
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import numpy as np

SR_REC = 16000  # Whisper wants 16 kHz mono
UNSURE_THRESHOLD = 0.6  # Whisper word probability below this = "possibly mispronounced"
KOKORO_FILES = {
    "kokoro-v1.0.onnx": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx",
    "voices-v1.0.bin": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin",
}


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def add_cuda_dlls():
    """Make pip-installed cuBLAS/cuDNN visible to CTranslate2 (faster-whisper) on Windows."""
    if os.name != "nt":
        return
    try:
        import nvidia  # namespace package from nvidia-cublas-cu12 / nvidia-cudnn-cu12
    except ImportError:
        return
    for base in nvidia.__path__:
        for bin_dir in Path(base).glob("*/bin"):
            os.add_dll_directory(str(bin_dir))
            os.environ["PATH"] = str(bin_dir) + os.pathsep + os.environ.get("PATH", "")


class Engines:
    def __init__(self, models_dir):
        self.models_dir = Path(models_dir)
        self.tts = None
        self.tts_state, self.tts_error, self.download = "idle", None, None
        self.stt = None
        self.stt_key = None
        self.stt_state, self.stt_error, self.stt_device = "idle", None, None
        # Loading and inference share one lock per engine; /status never takes them.
        self.tts_lock = threading.Lock()
        self.stt_lock = threading.Lock()

    def status(self):
        return {
            "tts": self.tts_state, "ttsError": self.tts_error, "download": self.download,
            "stt": self.stt_state, "sttError": self.stt_error, "sttDevice": self.stt_device,
            "sttModel": self.stt_key[0] if self.stt_key else None,
        }

    # ------------------------------------------------------------ TTS

    def _download_kokoro(self):
        self.models_dir.mkdir(parents=True, exist_ok=True)
        for name, url in KOKORO_FILES.items():
            dest = self.models_dir / name
            if dest.exists():
                continue
            log(f"Downloading {name} (one-time)...")
            tmp = dest.with_suffix(dest.suffix + ".part")

            def progress(blocks, bsize, total, name=name):
                if total > 0:
                    self.download = {"file": name, "percent": min(100, blocks * bsize * 100 // total)}

            urllib.request.urlretrieve(url, tmp, progress)
            tmp.rename(dest)
        self.download = None

    def load_tts(self):
        with self.tts_lock:
            return self._load_tts_locked()

    def _load_tts_locked(self):
        if self.tts is not None:
            return self.tts
        self.tts_state, self.tts_error = "loading", None
        try:
            from kokoro_onnx import Kokoro
            self._download_kokoro()
            self.tts = Kokoro(str(self.models_dir / "kokoro-v1.0.onnx"), str(self.models_dir / "voices-v1.0.bin"))
            self.tts_state = "ready"
            log("Kokoro ready")
            return self.tts
        except Exception as e:  # noqa: BLE001
            self.download = None
            self.tts_state, self.tts_error = "error", str(e)
            raise

    def synth(self, text, voice, speed, lang):
        with self.tts_lock:
            tts = self._load_tts_locked()
            samples, sr = tts.create(text, voice=voice, speed=speed, lang=lang)
        pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2")
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes(pcm.tobytes())
        return buf.getvalue()

    # ------------------------------------------------------------ STT

    def load_stt(self, name, device):
        with self.stt_lock:
            return self._load_stt_locked(name, device)

    def _load_stt_locked(self, name, device):
        key = (name, device)
        if self.stt is not None and self.stt_key == key:
            return self.stt
        # Free the old model before loading another one; VRAM is tight.
        self.stt, self.stt_key, self.stt_device = None, None, None
        gc.collect()
        self.stt_state, self.stt_error = "loading", None
        try:
            from faster_whisper import WhisperModel
            model, dev = None, None
            if device in ("auto", "cuda"):
                try:
                    add_cuda_dlls()
                    model = WhisperModel(name, device="cuda", compute_type="int8_float16")
                    # Warm-up: surfaces missing CUDA libraries now rather than on the first recording.
                    segs, _ = model.transcribe(np.zeros(SR_REC, dtype=np.float32), language="it")
                    list(segs)
                    dev = "cuda"
                except Exception as e:  # noqa: BLE001
                    if device == "cuda":
                        raise
                    log(f"GPU Whisper unavailable ({e}); falling back to CPU")
                    model = None
            if model is None:
                model, dev = WhisperModel(name, device="cpu", compute_type="int8"), "cpu"
            self.stt, self.stt_key, self.stt_device = model, key, dev
            self.stt_state = "ready"
            log(f"Whisper {name} ready on {dev}")
            return model
        except Exception as e:  # noqa: BLE001
            self.stt_state, self.stt_error = "error", str(e)
            raise

    def transcribe(self, audio, lang, name, device):
        with self.stt_lock:
            model = self._load_stt_locked(name, device)
            segments, _ = model.transcribe(
                audio,
                language=lang,
                beam_size=5,
                word_timestamps=True,
                condition_on_previous_text=False,
                vad_filter=True,
            )
            words = [w for s in segments for w in (s.words or [])]
        text = "".join(w.word for w in words).strip()
        unsure = [w.word.strip() for w in words if w.probability < UNSURE_THRESHOLD]
        return {"text": text, "unsure": unsure}

    def configure(self, name, device):
        """Load both engines in the background so the first sentence doesn't wait for them."""
        def run():
            for load in (self.load_tts, lambda: self.load_stt(name, device)):
                try:
                    load()
                except Exception:  # noqa: BLE001
                    log(traceback.format_exc())
        threading.Thread(target=run, daemon=True).start()


def make_handler(engines):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def _send(self, status, body, ctype="application/json"):
            if not isinstance(body, bytes):
                body = json.dumps(body).encode()
            self.send_response(status)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _body(self):
            return self.rfile.read(int(self.headers.get("Content-Length") or 0))

        def do_GET(self):
            if urlparse(self.path).path == "/status":
                self._send(200, engines.status())
            else:
                self._send(404, {"error": "not found"})

        def do_POST(self):
            url = urlparse(self.path)
            try:
                if url.path == "/configure":
                    req = json.loads(self._body() or b"{}")
                    engines.configure(req.get("whisper", "large-v3-turbo"), req.get("device", "auto"))
                    self._send(200, engines.status())
                elif url.path == "/tts":
                    req = json.loads(self._body())
                    wav = engines.synth(req["text"], req["voice"], float(req.get("speed", 1.0)), req["lang"])
                    self._send(200, wav, "audio/wav")
                elif url.path == "/stt":
                    q = {k: v[0] for k, v in parse_qs(url.query).items()}
                    audio = np.frombuffer(self._body(), dtype="<f4").astype(np.float32)
                    result = engines.transcribe(audio, q.get("lang", "it"),
                                                q.get("whisper", "large-v3-turbo"), q.get("device", "auto"))
                    self._send(200, result)
                else:
                    self._send(404, {"error": "not found"})
            except Exception as e:  # noqa: BLE001
                log(traceback.format_exc())
                self._send(500, {"error": str(e)})

    return Handler


def exit_when_parent_goes():
    """The parent holds our stdin open; EOF means the app has gone, even if it crashed."""
    try:
        sys.stdin.read()
    finally:
        os._exit(0)


def main():
    p = argparse.ArgumentParser(description="Tutor speech sidecar")
    p.add_argument("--port", type=int, default=0)
    p.add_argument("--models", required=True, help="directory for the Kokoro model files")
    p.add_argument("--no-parent-watch", action="store_true", help="keep running when stdin closes")
    args = p.parse_args()

    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(Engines(args.models)))
    if not args.no_parent_watch:
        threading.Thread(target=exit_when_parent_goes, daemon=True).start()
    print(f"READY {server.server_address[1]}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
