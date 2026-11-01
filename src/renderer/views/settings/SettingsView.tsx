import React, { useEffect, useState } from 'react';
import { RefreshCw, RotateCcw, Save } from 'lucide-react';
import { useConfigStore } from '@/stores/config';
import { useStatusStore } from '@/stores/status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader, ErrorAlert } from '@/components/PageHeader';
import { cn } from '@/lib/utils';
import { NATIVE_LANGUAGES, TARGET_LANGUAGES, targetLanguage, voiceFor } from '@shared/languages';
import { WHISPER_MODELS, type Theme, type TutorConfig, type WhisperDevice } from '@shared/types/config';
import type { EngineState } from '@shared/types/tutor';

export function SettingsView() {
  const { config, saveConfig, loadConfig } = useConfigStore();
  const [draft, setDraft] = useState<TutorConfig>(config);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const update = <K extends keyof TutorConfig>(section: K, patch: Partial<TutorConfig[K]>) =>
    setDraft((d) => ({ ...d, [section]: { ...d[section], ...patch } }));

  const handleSave = async () => {
    await saveConfig(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <PageHeader
        title="Settings"
        description="Languages, the teacher model and the speech engine. Saved in ~/.tutor/config.json."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => loadConfig()}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              {saved ? 'Saved!' : 'Save'}
            </Button>
          </>
        }
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="llm">Language Model</TabsTrigger>
          <TabsTrigger value="speech">Speech</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings draft={draft} update={update} />
        </TabsContent>
        <TabsContent value="llm">
          <LlmSettings draft={draft} update={update} />
        </TabsContent>
        <TabsContent value="speech">
          <SpeechSettings draft={draft} update={update} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface SectionProps {
  draft: TutorConfig;
  update: <K extends keyof TutorConfig>(section: K, patch: Partial<TutorConfig[K]>) => void;
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function GeneralSettings({ draft, update }: SectionProps) {
  return (
    <Card>
      <CardHeader><CardTitle>General</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Field id="target" label="Language you practise">
          <Select
            value={draft.general.targetLanguage}
            onValueChange={(v) => {
              update('general', { targetLanguage: v });
              update('speech', { voice: voiceFor(v, draft.speech.voice) });
            }}
          >
            <SelectTrigger id="target"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TARGET_LANGUAGES).map(([id, l]) => (
                <SelectItem key={id} value={id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="native" label="Your language" hint="The language you type in and get feedback in.">
          <Select value={draft.general.nativeLanguage} onValueChange={(v) => update('general', { nativeLanguage: v })}>
            <SelectTrigger id="native"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(NATIVE_LANGUAGES).map(([id, l]) => (
                <SelectItem key={id} value={id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="theme" label="Theme">
          <Select value={draft.general.theme} onValueChange={(v) => update('general', { theme: v as Theme })}>
            <SelectTrigger id="theme"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </CardContent>
    </Card>
  );
}

function LlmSettings({ draft, update }: SectionProps) {
  const llm = useStatusStore((s) => s.status?.llm);
  const chatModels = (llm?.models ?? []).filter((m) => !m.toLowerCase().includes('embed'));
  const options = chatModels.includes(draft.llm.model) ? chatModels : [draft.llm.model, ...chatModels];

  return (
    <Card>
      <CardHeader><CardTitle>Language Model (Ollama)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Translates, judges your attempts and answers questions.</p>
        <Field id="host" label="Ollama host">
          <Input id="host" value={draft.llm.host} onChange={(e) => update('llm', { host: e.target.value })} />
        </Field>
        <Field
          id="model"
          label="Model"
          hint="gemma3:4b is a good balance on a 6 GB GPU. Reasoning models (qwen3, deepseek-r1) work but are slower."
        >
          <Select value={draft.llm.model} onValueChange={(v) => update('llm', { model: v })}>
            <SelectTrigger id="model"><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {llm && !llm.ok && <ErrorAlert>{llm.error}</ErrorAlert>}
        {llm?.ok && <p className="text-sm text-success">Connected · {llm.models.length} models installed</p>}
      </CardContent>
    </Card>
  );
}

const STATE_STYLE: Record<EngineState, string> = {
  ready: 'text-success',
  loading: 'text-warning',
  error: 'text-destructive',
  idle: 'text-muted-foreground',
};

function SpeechSettings({ draft, update }: SectionProps) {
  const speech = useStatusStore((s) => s.status?.speech);
  const refresh = useStatusStore((s) => s.refresh);
  const [restarting, setRestarting] = useState(false);
  const voices = targetLanguage(draft.general.targetLanguage).voices;

  const restart = async () => {
    setRestarting(true);
    try {
      await window.tutor.system.restartSpeech();
      await refresh();
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Voice</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field id="voice" label={`Voice (${targetLanguage(draft.general.targetLanguage).name})`}>
            <Select value={voiceFor(draft.general.targetLanguage, draft.speech.voice)} onValueChange={(v) => update('speech', { voice: v })}>
              <SelectTrigger id="voice"><SelectValue /></SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="speed" label={`Speaking speed: ${draft.speech.speed.toFixed(2)}×`}>
            <input
              id="speed"
              type="range"
              min={0.6}
              max={1.2}
              step={0.05}
              value={draft.speech.speed}
              onChange={(e) => update('speech', { speed: Number(e.target.value) })}
              className="w-full accent-[var(--color-primary)]"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Speech Recognition (Whisper)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field id="whisper" label="Model" hint="If VRAM gets tight, pick a smaller model or the CPU.">
            <Select value={draft.speech.whisperModel} onValueChange={(v) => update('speech', { whisperModel: v })}>
              <SelectTrigger id="whisper"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WHISPER_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="device" label="Device">
            <Select value={draft.speech.whisperDevice} onValueChange={(v) => update('speech', { whisperDevice: v as WhisperDevice })}>
              <SelectTrigger id="device"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (GPU, CPU fallback)</SelectItem>
                <SelectItem value="cuda">GPU (CUDA)</SelectItem>
                <SelectItem value="cpu">CPU</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Speech Engine</CardTitle>
          <Button variant="outline" size="sm" onClick={restart} disabled={restarting}>
            <RefreshCw className={cn('mr-2 h-4 w-4', restarting && 'animate-spin')} />
            Restart
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {speech && (
            <dl className="grid grid-cols-[10rem_1fr] gap-y-1 text-sm">
              <dt className="text-muted-foreground">Process</dt>
              <dd>{speech.process}</dd>
              <dt className="text-muted-foreground">Text-to-speech</dt>
              <dd className={STATE_STYLE[speech.tts]}>{speech.tts}{speech.download && ` (downloading ${speech.download.percent}%)`}</dd>
              <dt className="text-muted-foreground">Speech recognition</dt>
              <dd className={STATE_STYLE[speech.stt]}>{speech.stt}{speech.sttDevice && ` on ${speech.sttDevice}`}</dd>
              <dt className="text-muted-foreground">Python</dt>
              <dd className="truncate font-mono text-xs leading-5">{speech.python || '—'}</dd>
            </dl>
          )}
          {speech?.error && <ErrorAlert>{speech.error}</ErrorAlert>}
          <Field
            id="python"
            label="Python interpreter"
            hint="Needs faster-whisper and kokoro-onnx (python/requirements.txt). Empty: TUTOR_PYTHON, then the conda envs 'tutor' and 'italian', then python on PATH."
          >
            <Input
              id="python"
              value={draft.speech.pythonPath}
              placeholder="auto-detect"
              onChange={(e) => update('speech', { pythonPath: e.target.value })}
            />
          </Field>
          <Field id="models" label="Kokoro model folder" hint="kokoro-v1.0.onnx and voices-v1.0.bin (~340 MB) download here on first start.">
            <Input
              id="models"
              value={draft.speech.modelsDir}
              placeholder="~/.tutor/models"
              onChange={(e) => update('speech', { modelsDir: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}
