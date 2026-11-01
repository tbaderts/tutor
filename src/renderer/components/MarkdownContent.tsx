import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** GitHub-flavoured Markdown with the app's typography (teacher answers, About page). */
export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="max-w-none text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mb-3 mt-6 text-xl font-bold first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-5 text-lg font-semibold first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-6 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-6 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]">{children}</code>,
          pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-lg bg-muted p-3">{children}</pre>,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border bg-muted px-3 py-1.5 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-border px-3 py-1.5">{children}</td>,
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">{children}</blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary underline hover:no-underline"
              onClick={(e) => {
                e.preventDefault();
                if (href) void window.tutor.shell.openExternal(href);
              }}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
