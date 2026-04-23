'use client';

import { useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Link2, Quote, Heading2, Undo2, Redo2 } from 'lucide-react';

type RichTextEditorProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
};

export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = 'Write details here...',
  error,
  required = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const applyCommand = (command: string, commandValue?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (commandValue !== undefined) {
      document.execCommand(command, false, commandValue);
    } else {
      document.execCommand(command);
    }
    onChange(editorRef.current.innerHTML);
  };

  const insertLink = () => {
    if (typeof window === 'undefined') return;
    const input = window.prompt('Enter URL', 'https://');
    if (!input) return;
    applyCommand('createLink', input);
  };

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  return (
    <div className="w-full">
      {label ? (
        <label className="mb-1.5 block text-sm font-medium tracking-tight text-slate-700">
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
      ) : null}
      <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm shadow-slate-200/60 ${error ? 'border-red-300' : 'border-slate-200'}`}>
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-2.5 py-2">
          <button
            type="button"
            onClick={() => applyCommand('bold')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            aria-label="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            onClick={() => applyCommand('italic')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            aria-label="Italic"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            onClick={() => applyCommand('formatBlock', 'h2')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            aria-label="Heading"
          >
            <Heading2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => applyCommand('insertUnorderedList')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            aria-label="Bulleted list"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            onClick={() => applyCommand('insertOrderedList')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            aria-label="Numbered list"
          >
            <ListOrdered size={14} />
          </button>
          <button
            type="button"
            onClick={() => applyCommand('formatBlock', 'blockquote')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            aria-label="Quote"
          >
            <Quote size={14} />
          </button>
          <button
            type="button"
            onClick={insertLink}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            aria-label="Insert link"
          >
            <Link2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => applyCommand('undo')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            aria-label="Undo"
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => applyCommand('redo')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            aria-label="Redo"
          >
            <Redo2 size={14} />
          </button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          suppressContentEditableWarning
          className="min-h-[180px] w-full bg-white px-4 py-3.5 text-sm leading-7 text-slate-900 outline-none"
          data-placeholder={placeholder}
          onInput={(event) => onChange((event.target as HTMLDivElement).innerHTML)}
        />
      </div>
      {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : null}
      <style jsx>{`
        div[contenteditable='true']:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
        }

        div[contenteditable='true'] :global(h2) {
          font-size: 1rem;
          font-weight: 700;
          margin: 0.75rem 0;
          color: #0f172a;
        }

        div[contenteditable='true'] :global(blockquote) {
          margin: 0.75rem 0;
          border-left: 3px solid #bfdbfe;
          padding-left: 0.75rem;
          color: #334155;
        }
      `}</style>
    </div>
  );
}
