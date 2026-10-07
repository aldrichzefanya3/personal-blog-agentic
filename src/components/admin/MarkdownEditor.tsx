'use client';

/**
 * Markdown editor with live preview.
 * Subtask 17.1 - Requirements 11.7
 */

import { useState, useCallback, useEffect, useRef } from 'react';

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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced preview update (500ms after keypress)
  const updatePreview = useCallback(async (markdown: string) => {
    if (!markdown.trim()) {
      setPreview('');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markdown }),
      });

      if (!response.ok) {
        throw new Error(`Preview failed: ${response.statusText}`);
      }

      const data = await response.json();
      setPreview(data.html);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate preview',
      );
      setPreview('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger debounced preview when value changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updatePreview(value);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, updatePreview]);

  // Toolbar actions
  const insertMarkdown = (before: string, after = '') => {
    const textarea = document.querySelector(
      'textarea[name="content"]',
    ) as HTMLTextAreaElement | null;
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

    onChange(newText);

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
      {/* Toolbar */}
      <div className="flex gap-2 rounded-md border border-gray-300 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
        <button
          type="button"
          onClick={handleBold}
          className="rounded px-3 py-1 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={handleItalic}
          className="rounded px-3 py-1 text-sm italic hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={handleLink}
          className="rounded px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Insert Link"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={handleImage}
          className="rounded px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Insert Image"
        >
          🖼️
        </button>
      </div>

      {/* Editor and Preview Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Editor */}
        <div>
          <label
            htmlFor="content"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Content (Markdown)
          </label>
          <textarea
            id="content"
            name="content"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[400px] w-full rounded-md border border-gray-300 p-3 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            spellCheck="false"
          />
        </div>

        {/* Preview */}
        <div>
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
          <div className="min-h-[400px] rounded-md border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
            {error ? (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : preview ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
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
