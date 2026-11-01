import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { MarkdownContent } from '@/components/MarkdownContent';
import { useConfigStore } from '@/stores/config';
import { useStatusStore } from '@/stores/status';
import { targetLanguage } from '@shared/languages';

export function AboutView() {
  const { general, llm, speech } = useConfigStore((s) => s.config);
  const device = useStatusStore((s) => s.status?.speech.sttDevice) ?? speech.whisperDevice;
  const [version, setVersion] = useState('');
  const target = targetLanguage(general.targetLanguage).name;

  useEffect(() => {
    window.tutor.shell.getAppVersion().then(setVersion);
  }, []);

  const content = `
Everything runs on this computer. No account, no subscription, and nothing you say leaves the machine.

## One practice round

1. **Translate.** What you type goes to your local **Ollama** server (\`${llm.model}\`) with a translation prompt.
   It replies with one natural ${target} sentence. If you type ${target} directly, this step is skipped.
2. **Speak.** **Kokoro-82M** turns the sentence into audio on the CPU (ONNX Runtime). Audio is cached, so replaying is instant.
3. **Listen.** Your recording is captured by the app, converted to 16 kHz mono, and transcribed by
   **faster-whisper** (\`${speech.whisperModel}\` on ${device}) with ${target} forced as the language.
   Words Whisper is less than 60 % sure about are flagged as *unclear*.
4. **Judge.** A word-by-word diff of target and transcript gives the match percentage and the colours.
   Then target, transcript, unclear words and score go to the Ollama model with a "patient teacher" prompt,
   which returns a verdict (correct / almost / incorrect), a short explanation and one tip.

**Free speaking** skips steps 1–2: you talk, Whisper transcribes, and the teacher checks grammar and offers a corrected sentence you can send to Practice.

**Ask the teacher** is a chat with the same model. It knows the sentence you are practising and your last attempt, so "why this word?" needs no extra context.

## How the app is built

| Part | Runs in | Does |
|---|---|---|
| React UI | Electron renderer | Views, microphone capture, playback |
| Main process | Electron (Node) | Settings, history, prompts, Ollama calls |
| Speech sidecar | Python (\`python/speech_server.py\`) | Kokoro TTS and faster-whisper STT on 127.0.0.1 |
| Ollama | Separate server | Translation, feedback, chat |

## Memory on a 6 GB GPU

| Component | Runs on | VRAM |
|---|---|---|
| Ollama \`${llm.model}\` | GPU, separate process | ~3 GB |
| faster-whisper \`${speech.whisperModel}\` (int8) | ${device} | ~2 GB |
| Kokoro-82M | CPU | – |

Kokoro is deliberately kept on the CPU so the two GPU models fit side by side.

## Known limits

- Whisper tends to "hear" what you meant and quietly fixes small slips, so a wrong vowel can pass.
  The *unclear words* line is the best hint for pronunciation problems.
- The judge is a small model: good for everyday sentences, occasionally wrong on subtle grammar.
`;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <PageHeader title="About Tutor" description={version && `Version ${version}`} />
      <Card>
        <CardContent className="pt-6">
          <MarkdownContent content={content} />
        </CardContent>
      </Card>
    </div>
  );
}
