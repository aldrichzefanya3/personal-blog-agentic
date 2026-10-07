'use client';

/**
 * Markdown editor with live preview.
 * Subtask 17.1 - Requirements 11.7
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { withCsrfToken } from '@/lib/csrf-client';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your post content in Markdown...',
}: MarkdownEditorProps) {
  const [preview, setPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePane, setActivePane] = useState<'write' | 'preview'>('write');
  const [historyPosition, setHistoryPosition] = useState({
    index: 0,
    length: 1,
  });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const historyRef = useRef<string[]>([value]);
  const historyIndexRef = useRef(0);

  // Debounced preview update (500ms after keypress)
  const updatePreview = useCallback(
    async (markdown: string, signal: AbortSignal) => {
      if (!markdown.trim()) {
        setPreview('');
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          '/api/preview',
          withCsrfToken({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ markdown }),
            signal,
          }),
        );

        if (!response.ok) {
          const responseBody = await response.json().catch(() => null);
          throw new Error(
            responseBody?.error ||
              `Preview failed: ${response.statusText || response.status}`,
          );
        }

        const data = await response.json();
        setPreview(data.html);
      } catch (err) {
        if (signal.aborted) return;
        setError(
          err instanceof Error ? err.message : 'Failed to generate preview',
        );
        setPreview('');
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    },
    [],
  );

  // Trigger debounced preview when value changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const controller = new AbortController();
    debounceTimerRef.current = setTimeout(() => {
      updatePreview(value, controller.signal);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      controller.abort();
    };
  }, [value, updatePreview]);

  const recordValue = (nextValue: string) => {
    if (nextValue === value) return;

    const currentHistory = historyRef.current.slice(
      0,
      historyIndexRef.current + 1,
    );
    currentHistory.push(nextValue);
    if (currentHistory.length > 50) currentHistory.shift();
    historyRef.current = currentHistory;
    historyIndexRef.current = currentHistory.length - 1;
    onChange(nextValue);
    setHistoryPosition({
      index: historyIndexRef.current,
      length: currentHistory.length,
    });
  };

  const moveHistory = (direction: -1 | 1) => {
    const nextIndex = historyIndexRef.current + direction;
    if (nextIndex < 0 || nextIndex >= historyRef.current.length) return;

    historyIndexRef.current = nextIndex;
    onChange(historyRef.current[nextIndex]);
    setHistoryPosition({ index: nextIndex, length: historyRef.current.length });

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });
  };

  const canUndo = historyPosition.index > 0;
  const canRedo = historyPosition.index < historyPosition.length - 1;

  const handleEditorKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    const hasModifier = event.ctrlKey || event.metaKey;
    if (!hasModifier) return;

    const key = event.key.toLowerCase();
    if (key === 'z') {
      event.preventDefault();
      moveHistory(event.shiftKey ? 1 : -1);
    } else if (key === 'y') {
      event.preventDefault();
      moveHistory(1);
    }
  };

  // Toolbar actions
  const insertMarkdown = (before: string, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText =
      value.substring(0, start) +
      before +
      selectedText +
      after +
      value.substring(end);

    recordValue(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length,
      );
    }, 0);
  };

  const handleBold = () => insertMarkdown('**', '**');
  const handleItalic = () => insertMarkdown('_', '_');
  const handleLink = () => insertMarkdown('[', '](https://)');
  const handleImage = () => insertMarkdown('![', '](https://)');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-300 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => moveHistory(-1)}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z or Cmd+Z)"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-lg text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            ↶
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => moveHistory(1)}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Y or Cmd+Shift+Z)"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-lg text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            ↷
          </button>
          <span
            aria-hidden="true"
            className="mx-1 h-6 w-px bg-slate-300 dark:bg-slate-700"
          />
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleBold}
            aria-label="Bold"
            title="Bold"
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleItalic}
            aria-label="Italic"
            title="Italic"
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm text-slate-700 italic transition hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            I
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleLink}
            aria-label="Insert link"
            title="Insert link"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-slate-700 transition hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            🔗
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleImage}
            aria-label="Insert image"
            title="Insert image"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-slate-700 transition hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            🖼️
          </button>
        </div>
        <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 md:hidden dark:border-slate-700 dark:bg-slate-950">
          <button
            type="button"
            aria-pressed={activePane === 'write'}
            onClick={() => setActivePane('write')}
            className={`rounded px-3 py-1.5 text-xs font-semibold ${activePane === 'write' ? 'bg-slate-900 text-white dark:bg-cyan-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'}`}
          >
            Write
          </button>
          <button
            type="button"
            aria-pressed={activePane === 'preview'}
            onClick={() => setActivePane('preview')}
            className={`rounded px-3 py-1.5 text-xs font-semibold ${activePane === 'preview' ? 'bg-slate-900 text-white dark:bg-cyan-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'}`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Editor and Preview Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Editor */}
        <div
          className={
            activePane === 'write' ? 'min-w-0' : 'hidden min-w-0 md:block'
          }
        >
          <label
            htmlFor="content"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Content (Markdown)
          </label>
          <textarea
            ref={textareaRef}
            id="content"
            name="content"
            value={value}
            onChange={(e) => recordValue(e.target.value)}
            onKeyDown={handleEditorKeyDown}
            placeholder={placeholder}
            className="h-[55vh] max-h-[75vh] min-h-72 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm leading-6 text-slate-900 transition outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 md:h-[65vh] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-900"
            spellCheck="false"
          />
        </div>

        {/* Preview */}
        <div
          className={
            activePane === 'preview' ? 'min-w-0' : 'hidden min-w-0 md:block'
          }
        >
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview
            </label>
            {isLoading && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Updating...
              </span>
            )}
          </div>
          <div className="h-[55vh] max-h-[75vh] min-h-72 overflow-y-auto rounded-lg border border-slate-300 bg-white p-4 md:h-[65vh] dark:border-slate-700 dark:bg-slate-950">
            {error ? (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : preview ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            ) : (
              <div className="text-sm text-gray-400 dark:text-gray-600">
                Preview will appear here...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
