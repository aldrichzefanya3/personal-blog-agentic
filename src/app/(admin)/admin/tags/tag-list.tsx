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
    <div className="space-y-4">
      {/* Error display */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Create new tag form */}
      <div className="rounded-md border border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Create New Tag
        </h2>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            name="name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name (1-100 characters)"
            maxLength={100}
            required
            disabled={isPending}
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-blue-400 dark:focus:ring-blue-400 dark:disabled:bg-gray-800"
          />
          <button
            type="submit"
            disabled={isPending || !newTagName.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-gray-600"
          >
            {isPending ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>

      {/* Tags list */}
      <div className="rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
        {tags.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No tags yet. Create your first tag above.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Slug
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Created
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    {editingId === tag.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        maxLength={100}
                        disabled={isPending}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400 dark:disabled:bg-gray-800"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {tag.name}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {tag.slug}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(tag.created_at).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    {editingId === tag.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleUpdate(tag.id)}
                          disabled={isPending || !editingName.trim()}
                          className="text-green-600 hover:text-green-900 disabled:text-gray-400 disabled:cursor-not-allowed dark:text-green-400 dark:hover:text-green-300 dark:disabled:text-gray-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={isPending}
                          className="text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:text-gray-300 dark:disabled:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => startEdit(tag)}
                          disabled={isPending}
                          className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed dark:text-blue-400 dark:hover:text-blue-300 dark:disabled:text-gray-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id, tag.name)}
                          disabled={isPending}
                          className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed dark:text-red-400 dark:hover:text-red-300 dark:disabled:text-gray-600"
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
        )}
      </div>

      {/* Info text */}
      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Slugs are automatically generated from tag names.
          Deleting a tag will remove it from all posts but will not delete the posts themselves.
        </p>
      </div>
    </div>
  );
}
