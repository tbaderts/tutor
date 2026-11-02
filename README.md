# Tutor

Desktop app for speaking practice in Italian, Spanish, French, Portuguese or English. Type a sentence in your
language, hear it spoken, say it back and get feedback. Everything runs locally.

| Part | Model | Where |
|---|---|---|
| Translation, feedback, chat | `gemma3:4b` via your Ollama | GPU (~3 GB) |
| Speech-to-text | faster-whisper `large-v3-turbo` int8 | GPU (~1.5–2 GB), CPU fallback |
| Text-to-speech | Kokoro-82M (ONNX) | CPU |

## Views

- **Lessons:** A1 Italian lessons around work, sports, the dog, holidays in Italy, food, politics and nature.
  Each has vocabulary, phrases, a dialogue (listen, or role-play your lines), a grammar note and a challenge
  (English cue → say it in Italian from memory; the teacher accepts other correct answers). Every item you
  say is scored; 80 % or more counts as mastered (`~/.tutor/progress.json`).
- **Practice:** type a sentence in your language (or in the target language), hear it, record yourself. You get
  target vs. heard words colour-coded, a match %, the teacher's verdict and a tip. Space starts/stops recording.
- **Free Speaking:** say anything and get a grammar check plus a corrected version you can send to Practice.
- **Ask the Teacher:** chat about grammar, words or phrases; it knows the sentence you are practising.
- **History:** every attempt, kept across sessions in `~/.tutor/history.json`.
- **Settings:** languages, theme, Ollama host and model, voice, speed, Whisper model and device, Python path.

## Architecture

```
React renderer ──IPC──▶ Electron main ──HTTP──▶ Ollama (translation, feedback, chat)
   (mic, playback)          │
                            └──HTTP 127.0.0.1──▶ python/speech_server.py (Kokoro TTS, faster-whisper STT)
```

- `src/renderer` — React 19 + Tailwind v4 + Radix UI, zustand stores. Same shell as developer-cockpit.
  The microphone is recorded by Chromium and decoded to 16 kHz mono before it is sent to Whisper.
- `src/main` — settings (`~/.tutor/config.json`), history, Ollama client, and the speech sidecar's lifecycle.
- `src/shared` — prompts, languages and voices, the word diff that scores attempts, and IPC types.
- `python/speech_server.py` — Whisper and Kokoro behind a small HTTP API. The main process starts it on a
  free port and it exits when the app does.

## Lessons

Lessons are YAML files, so you can edit them without rebuilding:

- shipped: `content/<language>/topics.yaml` and `content/<language>/lessons/*.yaml`
- your own: `~/.tutor/lessons/<language>/` (same layout; open it with **My lessons folder**). A file with the
  same `id` as a shipped lesson replaces it; press **Reload** after editing. Broken files are listed on the
  Lessons page with the file and field.

```yaml
id: dog-3                 # unique; progress is stored per id
topic: dog                # a topic id from topics.yaml
title: Dal veterinario
subtitle: At the vet
level: A1
goals: [Say what's wrong with your dog]
vocabulary:
  - { text: il veterinario, en: vet }
phrases:
  - { text: Il mio cane non mangia., en: My dog isn't eating. }
grammar: |
  ## Markdown, tables allowed
dialogue:
  title: At the vet
  speakers: { Dottoressa: female }   # picks a voice per speaker
  lines:
    - { speaker: Dottoressa, text: Buongiorno! Cosa succede?, en: Good morning! What's the matter? }
    - { speaker: you, text: Il mio cane non mangia., en: My dog isn't eating. }
challenge:
  - text: Il mio cane non mangia.
    en: My dog isn't eating.
    accept: [Il mio cane non mangia niente.]   # other correct answers
```

`npm test` checks every shipped lesson.

### Generating lessons

**Lessons → Generate a lesson:** describe a situation ("At the vet with my dog"), pick a topic (or a new
one), a level and an Ollama model. The model writes the lesson against a JSON schema (Ollama structured
outputs) with a shipped lesson as worked example. The app then drops empty, duplicate and placeholder items
and checks it like a hand-written file. You get a draft you can practise right away; **Save lesson** writes
it as YAML to your lessons folder (marked `generated_by`, shown with an "AI" badge), where you can correct it.

Treat generated lessons as drafts. In tests on the vet lesson, `gemma3:4b` (~20 s) wrote mostly correct
but bland Italian with some wrong glosses, and its dialogue didn't fit the situation; `gemma4:e4b` (~95 s,
partly on the CPU) wrote a coherent, well-structured lesson that still had grammar mistakes
("è qui" for "sono qui", "lasciatemi" instead of "mi lasci").

## Setup (Windows)

1. **Python env for the speech sidecar** (Python 3.12, so onnxruntime and CTranslate2 have wheels):

   ```cmd
   conda create -n tutor -c conda-forge --override-channels python=3.12 -y
   conda activate tutor
   pip install -r python\requirements.txt
   ```

   The app looks for, in order: Settings → Speech → Python interpreter, `TUTOR_PYTHON`, the conda envs `tutor`
   and `italian` under `~/miniconda3` or `~/anaconda3`, then `python` on PATH. The `italian` env from the
   Streamlit prototype works as is.

2. **Ollama:** `ollama pull gemma3:4b`

3. **Run:**

   ```cmd
   npm install
   npm run dev
   ```

On first start Kokoro's model files (~340 MB) download into `~/.tutor/models`. To skip that, copy
`kokoro-v1.0.onnx` and `voices-v1.0.bin` there, or point Settings → Speech → Kokoro model folder at an
existing copy. The Whisper model downloads into the Hugging Face cache.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server + Electron with hot reload |
| `npm run build` | Compile main process and bundle renderer into `dist/` |
| `npm start` | Run the built app |
| `npm run package` | Build a Windows installer into `release/` (the sidecar still uses your Python env) |
| `npm run typecheck` | Type-check renderer and main |
| `npm test` | Unit tests (word diff, prompts, think-tag filter) |

If Electron starts as plain Node from a VS Code task, unset `ELECTRON_RUN_AS_NODE`.

## VRAM (6 GB)

- Check what's loaded: `ollama ps` and `nvidia-smi`. `ollama stop <model>` unloads one.
- If it's tight, pick Whisper `small` or device `CPU` in Settings, or a smaller LLM such as `gemma3:1b`
  (translation quality drops).
- If Whisper on GPU fails with a missing `cudnn*.dll` / `cublas*.dll`, the sidecar falls back to CPU.
  Re-running `pip install -r python\requirements.txt` usually fixes it.

## Limits

Whisper tends to "hear" what you meant, so small pronunciation errors can slip through. The "Unclear words"
line (low recognizer confidence) is the best hint. A phoneme-level checker would be the next step for real
pronunciation scoring. Kokoro has no German voice, so German is available as your language but not as a
language to practise.
