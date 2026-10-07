import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownEditor } from '@/components/admin/MarkdownEditor';

function ControlledMarkdownEditor({
  initialValue = '',
}: {
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  return <MarkdownEditor value={value} onChange={setValue} />;
}

describe('MarkdownEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.cookie = 'csrf_token=test-csrf-token; path=/';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ html: '<p>preview</p>' }),
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.cookie = 'csrf_token=; max-age=0; path=/';
  });

  it('supports keyboard undo and redo for markdown content', () => {
    render(<ControlledMarkdownEditor />);
    const editor = screen.getByRole('textbox', { name: 'Content (Markdown)' });

    fireEvent.change(editor, { target: { value: '# Draft' } });
    fireEvent.keyDown(editor, { key: 'z', ctrlKey: true });
    expect((editor as HTMLTextAreaElement).value).toBe('');

    fireEvent.keyDown(editor, { key: 'y', ctrlKey: true });
    expect((editor as HTMLTextAreaElement).value).toBe('# Draft');
  });

  it('includes the CSRF token in its preview request', async () => {
    render(<ControlledMarkdownEditor initialValue="# Draft" />);

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/preview',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'x-csrf-token': 'test-csrf-token' }),
      }),
    );
  });

  it('clears the loading state when content is cleared during preview', async () => {
    let requestSignal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementation((_input, init) => {
      requestSignal = init?.signal as AbortSignal;
      return new Promise(() => {});
    });

    render(<ControlledMarkdownEditor initialValue="# Draft" />);
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText('Updating...')).not.toBeNull();

    const editor = screen.getByRole('textbox', { name: 'Content (Markdown)' });
    fireEvent.change(editor, { target: { value: '' } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(requestSignal?.aborted).toBe(true);
    expect(screen.queryByText('Updating...')).toBeNull();
  });
});
