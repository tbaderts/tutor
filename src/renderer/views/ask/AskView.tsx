import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, Loader2, SendHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/PageHeader';
import { MarkdownContent } from '@/components/MarkdownContent';
import { cn } from '@/lib/utils';
import { useAskStore } from '@/stores/ask';
import { useConfigStore } from '@/stores/config';
import { usePracticeStore } from '@/stores/practice';
import { targetLanguage } from '@shared/languages';

export function AskView() {
  const target = targetLanguage(useConfigStore((s) => s.config.general.targetLanguage));
  const practising = usePracticeStore((s) => s.target);
  const { messages, streaming, error, send, clear } = useAskStore();
  const [question, setQuestion] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const submit = () => {
    if (!question.trim() || streaming) return;
    void send(question);
    setQuestion('');
  };

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ask the Teacher</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {practising
              ? <>Context: practising «{practising}»</>
              : `Ask anything about ${target.name}. Once you practise a sentence, I'll know which one you mean.`}
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clear} disabled={streaming}>
            <Trash2 className="mr-2 h-4 w-4" />
            New conversation
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <GraduationCap className="h-10 w-10" />
            <div className="text-sm">Grammar, words, phrases, pronunciation, culture.</div>
            <button className="text-sm text-primary hover:underline" onClick={() => send(target.askExample)}>
              Try: “{target.askExample}”
            </button>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] rounded-xl px-4 py-2.5',
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'border bg-card text-card-foreground',
              )}
            >
              {m.role === 'user' ? (
                <div className="whitespace-pre-wrap text-sm">{m.content}</div>
              ) : m.content ? (
                <MarkdownContent content={m.content} />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        ))}
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <div ref={bottom} />
      </div>

      <form
        className="flex items-end gap-2 border-t pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder={`${target.askExample}  ·  Enter to send, Shift+Enter for a new line`}
          className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          autoFocus
        />
        <Button type="submit" disabled={!question.trim() || streaming} className="h-[3.75rem]">
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
