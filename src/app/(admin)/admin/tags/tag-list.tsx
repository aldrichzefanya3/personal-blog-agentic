'use client';

/**
 * Tag list client component with inline create/edit/delete controls.
 * Task 18.2 - Requirements 12.2, 12.3, 12.5, 12.6, 12.7
 */

import { useState, useTransition } from 'react';
import type { Tag } from '@/types/database';
import {
  createTagAction,
  updateTagAction,
  deleteTagAction,
} from '@/actions/tags';

interface TagListProps {
  tags: Tag[];
}

export function TagList({ tags: initialTags }: TagListProps) {
  const [tags, setTags] = useState(initialTags);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createTagAction(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.success && result.tag) {
        // Add new tag to the list
        setTags((prev) => [...prev, result.tag!]);
        setNewTagName('');
      }
    });
  };

  const handleUpdate = async (id: string) => {
    setError(null);

    const formData = new FormData();
    formData.append('id', id);
    formData.append('name', editingName);

    startTransition(async () => {
      const result = await updateTagAction(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.success && result.tag) {
        // Update the tag in the list
        setTags((prev) =>
          prev.map((tag) => (tag.id === id ? result.tag! : tag)),
        );
        setEditingId(null);
        setEditingName('');
      }
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the tag "${name}"? This will remove it from all posts.`)) {
      return;
    }

    setError(null);

    const formData = new FormData();
    formData.append('id', id);

    startTransition(async () => {
      const result = await deleteTagAction(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        // Remove the tag from the list
        setTags((prev) => prev.filter((tag) => tag.id !== id));
      }
    });
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditingName(tag.name);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setError(null);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm dark:border-red-900/80 dark:bg-red-950/60 dark:text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
              Manage
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              Create New Tag
            </h2>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            name="name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name (1-100 characters)"
            maxLength={100}
            required
            disabled={isPending}
            className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400 dark:focus:bg-slate-900"
          />
          <button
            type="submit"
            disabled={isPending || !newTagName.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:disabled:bg-slate-700"
          >
            {isPending ? 'Creating...' : 'Create'}
          </button>
        </form>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {tags.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No tags yet. Create your first tag above.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800/80">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Name
                    </th>
                    <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Slug
                    </th>
                    <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Created
                    </th>
                    <th scope="col" className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                  {tags.map((tag) => (
                    <tr key={tag.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/70">
                      <td className="px-5 py-4">
                        {editingId === tag.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            maxLength={100}
                            disabled={isPending}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                          />
                        ) : (
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {tag.name}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {tag.slug}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {new Date(tag.created_at).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-medium">
                        {editingId === tag.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUpdate(tag.id)}
                              disabled={isPending || !editingName.trim()}
                              className="rounded-lg px-2.5 py-1.5 text-green-600 transition hover:bg-green-50 hover:text-green-700 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-green-400 dark:hover:bg-green-950/40 dark:hover:text-green-300"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={isPending}
                              className="rounded-lg px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => startEdit(tag)}
                              disabled={isPending}
                              className="text-cyan-600 transition hover:text-cyan-700 disabled:text-slate-400 dark:text-cyan-400 dark:hover:text-cyan-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(tag.id, tag.name)}
                              disabled={isPending}
                              className="text-red-600 transition hover:text-red-700 disabled:text-slate-400 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {tags.map((tag) => (
                <div key={tag.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Name
                      </p>
                      {editingId === tag.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          maxLength={100}
                          disabled={isPending}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        />
                      ) : (
                        <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {tag.name}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2 text-sm font-medium">
                      {editingId === tag.id ? (
                        <>
                          <button onClick={() => handleUpdate(tag.id)} disabled={isPending || !editingName.trim()} className="text-green-600 dark:text-green-400">
                            Save
                          </button>
                          <button onClick={cancelEdit} disabled={isPending} className="text-slate-600 dark:text-slate-300">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(tag)} disabled={isPending} className="text-cyan-600 dark:text-cyan-400">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(tag.id, tag.name)} disabled={isPending} className="text-red-600 dark:text-red-400">
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Slug
                      </p>
                      <p className="mt-1 break-all text-slate-700 dark:text-slate-300">{tag.slug}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Created
                      </p>
                      <p className="mt-1 text-slate-700 dark:text-slate-300">
                        {new Date(tag.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900 dark:border-cyan-900/80 dark:bg-cyan-950/40 dark:text-cyan-200">
        <strong className="font-semibold">Note:</strong> Slugs are automatically generated from tag names. Deleting a tag will remove it from all posts but will not delete the posts themselves.
      </div>
    </div>
  );
}
