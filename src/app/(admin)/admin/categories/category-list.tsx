'use client';

/**
 * Category list client component with inline create/edit/delete controls.
 * Task 18.2 - Requirements 12.1, 12.3, 12.4, 12.7
 */

import { useState, useTransition } from 'react';
import type { Category } from '@/types/database';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  setCategoryAutoPublishAction,
} from '@/actions/categories';

interface CategoryListProps {
  categories: Category[];
}

export function CategoryList({ categories: initialCategories }: CategoryListProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createCategoryAction(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.success && result.category) {
        // Add new category to the list
        setCategories((prev) => [...prev, result.category!]);
        setNewCategoryName('');
      }
    });
  };

  const handleUpdate = async (id: string) => {
    setError(null);

    const formData = new FormData();
    formData.append('id', id);
    formData.append('name', editingName);

    startTransition(async () => {
      const result = await updateCategoryAction(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.success && result.category) {
        // Update the category in the list
        setCategories((prev) =>
          prev.map((cat) => (cat.id === id ? result.category! : cat)),
        );
        setEditingId(null);
        setEditingName('');
      }
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the category "${name}"? This will remove it from all posts.`)) {
      return;
    }

    setError(null);

    const formData = new FormData();
    formData.append('id', id);

    startTransition(async () => {
      const result = await deleteCategoryAction(formData);

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        // Remove the category from the list
        setCategories((prev) => prev.filter((cat) => cat.id !== id));
      }
    });
  };

  const handleAutoPublishChange = async (category: Category, enabled: boolean) => {
    setError(null);
    const formData = new FormData();
    formData.set('id', category.id);
    formData.set('auto_publish', String(enabled));

    startTransition(async () => {
      const result = await setCategoryAutoPublishAction(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.success && result.category) {
        setCategories((prev) =>
          prev.map((item) =>
            item.id === category.id ? result.category! : item,
          ),
        );
      }
    });
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
              Manage
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              Create New Category
            </h2>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            name="name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category name (1-100 characters)"
            maxLength={100}
            required
            disabled={isPending}
            className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400 dark:focus:bg-slate-900"
          />
          <button
            type="submit"
            disabled={isPending || !newCategoryName.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-violet-500 dark:hover:bg-violet-400 dark:disabled:bg-slate-700"
          >
            {isPending ? 'Creating...' : 'Create'}
          </button>
        </form>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {categories.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No categories yet. Create your first category above.
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
                    <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      AI auto-publish
                    </th>
                    <th scope="col" className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                  {categories.map((category) => (
                    <tr key={category.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/70">
                      <td className="px-5 py-4">
                        {editingId === category.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            maxLength={100}
                            disabled={isPending}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                          />
                        ) : (
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {category.name}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {category.slug}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {new Date(category.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={category.auto_publish ?? false}
                            disabled={isPending}
                            onChange={(event) =>
                              handleAutoPublishChange(category, event.target.checked)
                            }
                            aria-label={`Automatically publish AI posts in ${category.name}`}
                            className="size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span>{category.auto_publish ? 'On' : 'Off'}</span>
                        </label>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-medium">
                        {editingId === category.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUpdate(category.id)}
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
                              onClick={() => startEdit(category)}
                              disabled={isPending}
                              className="text-violet-600 transition hover:text-violet-700 disabled:text-slate-400 dark:text-violet-400 dark:hover:text-violet-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(category.id, category.name)}
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
              {categories.map((category) => (
                <div key={category.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Name
                      </p>
                      {editingId === category.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          maxLength={100}
                          disabled={isPending}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        />
                      ) : (
                        <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {category.name}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2 text-sm font-medium">
                      {editingId === category.id ? (
                        <>
                          <button onClick={() => handleUpdate(category.id)} disabled={isPending || !editingName.trim()} className="text-green-600 dark:text-green-400">
                            Save
                          </button>
                          <button onClick={cancelEdit} disabled={isPending} className="text-slate-600 dark:text-slate-300">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(category)} disabled={isPending} className="text-violet-600 dark:text-violet-400">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(category.id, category.name)} disabled={isPending} className="text-red-600 dark:text-red-400">
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
                      <p className="mt-1 break-all text-slate-700 dark:text-slate-300">{category.slug}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Created
                      </p>
                      <p className="mt-1 text-slate-700 dark:text-slate-300">
                        {new Date(category.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={category.auto_publish ?? false}
                          disabled={isPending}
                          onChange={(event) =>
                            handleAutoPublishChange(category, event.target.checked)
                          }
                          aria-label={`Automatically publish AI posts in ${category.name}`}
                          className="size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        Automatically publish AI posts
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 dark:border-violet-900/80 dark:bg-violet-950/40 dark:text-violet-200">
        <strong className="font-semibold">Note:</strong> Slugs are automatically generated from category names. Deleting a category will remove it from all posts but will not delete the posts themselves.
      </div>
    </div>
  );
}
