'use client';

/**
 * Post management form with markdown editor.
 * Subtask 17.3 - Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.8, 11.9, 11.10, 11.11
 */

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MarkdownEditor } from './MarkdownEditor';
import type { Post, Category, Tag, PostStatus } from '@/types/database';
import { generateSlug } from '@/lib/slug';

interface PostFormProps {
  post?: Post & { categories: Category[]; tags: Tag[] };
  categories: Category[];
  tags: Tag[];
  actions: {
    createPost?: (formData: FormData) => Promise<{ error?: string }>;
    updatePost?: (formData: FormData) => Promise<{ error?: string }>;
    publishPost?: (postId: string) => Promise<{ error?: string }>;
    unpublishPost?: (postId: string) => Promise<{ error?: string }>;
    archivePost?: (postId: string) => Promise<{ error?: string }>;
    deletePost?: (postId: string) => Promise<{ error?: string }>;
  };
}

export function PostForm({ post, categories, tags, actions }: PostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!post);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(
    post?.cover_image_url ?? '',
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    post?.categories.map((c) => c.id) ?? [],
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    post?.tags.map((t) => t.id) ?? [],
  );

  // Client-side validation errors
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Auto-generate slug from title when title changes (unless manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited]);

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.length > 255) {
      errors.title = 'Title must be 255 characters or less';
    }

    if (!content.trim()) {
      errors.content = 'Content is required';
    }

    if (excerpt && excerpt.length > 500) {
      errors.excerpt = 'Excerpt must be 500 characters or less';
    }

    if (coverImageUrl && coverImageUrl.length > 2048) {
      errors.coverImageUrl = 'Cover image URL must be 2048 characters or less';
    }

    if (
      slug &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
      slug !== generateSlug(title)
    ) {
      errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (action: 'create' | 'update') => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('slug', slug || generateSlug(title));
    formData.append('excerpt', excerpt);
    formData.append('content', content);
    formData.append('cover_image_url', coverImageUrl);
    formData.append('category_ids', JSON.stringify(selectedCategoryIds));
    formData.append('tag_ids', JSON.stringify(selectedTagIds));

    if (post) {
      formData.append('id', post.id);
    }

    startTransition(async () => {
      try {
        const actionFn = action === 'create' ? actions.createPost : actions.updatePost;
        if (!actionFn) {
          setError('Action not available');
          return;
        }

        const result = await actionFn(formData);
        if (result.error) {
          setError(result.error);
        }
        // Success handled by redirect in action
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  const handleStatusChange = async (
    action: 'publish' | 'unpublish' | 'archive',
  ) => {
    if (!post) return;

    setError(null);
    startTransition(async () => {
      try {
        let actionFn;
        switch (action) {
          case 'publish':
            actionFn = actions.publishPost;
            break;
          case 'unpublish':
            actionFn = actions.unpublishPost;
            break;
          case 'archive':
            actionFn = actions.archivePost;
            break;
        }

        if (!actionFn) {
          setError('Action not available');
          return;
        }

        const result = await actionFn(post.id);
        if (result.error) {
          setError(result.error);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  const handleDelete = async () => {
    if (!post || !actions.deletePost) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await actions.deletePost(post.id);
        if (result.error) {
          setError(result.error);
          setShowDeleteConfirm(false);
        }
        // Success handled by redirect in action
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setShowDeleteConfirm(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Enter post title"
          />
          {validationErrors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {validationErrors.title}
            </p>
          )}
        </div>

        {/* Slug */}
        <div>
          <label
            htmlFor="slug"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Slug (auto-generated, editable)
          </label>
          <input
            type="text"
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManuallyEdited(true);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="auto-generated-from-title"
          />
          {validationErrors.slug && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {validationErrors.slug}
            </p>
          )}
        </div>

        {/* Excerpt */}
        <div>
          <label
            htmlFor="excerpt"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Excerpt (max 500 characters)
          </label>
          <textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="Brief description of the post"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {excerpt.length}/500
          </p>
          {validationErrors.excerpt && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {validationErrors.excerpt}
            </p>
          )}
        </div>

        {/* Cover Image URL */}
        <div>
          <label
            htmlFor="coverImageUrl"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Cover Image URL
          </label>
          <input
            type="url"
            id="coverImageUrl"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="https://example.com/image.jpg"
          />
          {validationErrors.coverImageUrl && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {validationErrors.coverImageUrl}
            </p>
          )}
        </div>

        {/* Categories */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Categories
          </label>
          <div className="space-y-2 rounded-md border border-gray-300 p-3 dark:border-gray-700">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No categories available
              </p>
            ) : (
              categories.map((category) => (
                <label key={category.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.includes(category.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCategoryIds([
                          ...selectedCategoryIds,
                          category.id,
                        ]);
                      } else {
                        setSelectedCategoryIds(
                          selectedCategoryIds.filter((id) => id !== category.id),
                        );
                      }
                    }}
                    className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {category.name}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tags
          </label>
          <div className="space-y-2 rounded-md border border-gray-300 p-3 dark:border-gray-700">
            {tags.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No tags available
              </p>
            ) : (
              tags.map((tag) => (
                <label key={tag.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTagIds([...selectedTagIds, tag.id]);
                      } else {
                        setSelectedTagIds(
                          selectedTagIds.filter((id) => id !== tag.id),
                        );
                      }
                    }}
                    className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {tag.name}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Markdown Editor */}
        <MarkdownEditor value={content} onChange={setContent} />
        {validationErrors.content && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {validationErrors.content}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 border-t border-gray-300 pt-6 dark:border-gray-700">
        {/* Primary Actions */}
        {!post && actions.createPost && (
          <button
            type="button"
            onClick={() => handleSubmit('create')}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Creating...' : 'Create Draft'}
          </button>
        )}

        {post && actions.updatePost && (
          <button
            type="button"
            onClick={() => handleSubmit('update')}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        )}

        {/* Status Actions */}
        {post && post.status !== 'PUBLISHED' && actions.publishPost && (
          <button
            type="button"
            onClick={() => handleStatusChange('publish')}
            disabled={isPending}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Publish
          </button>
        )}

        {post && post.status === 'PUBLISHED' && actions.unpublishPost && (
          <button
            type="button"
            onClick={() => handleStatusChange('unpublish')}
            disabled={isPending}
            className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
          >
            Unpublish
          </button>
        )}

        {post && post.status !== 'ARCHIVED' && actions.archivePost && (
          <button
            type="button"
            onClick={() => handleStatusChange('archive')}
            disabled={isPending}
            className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Archive
          </button>
        )}

        {/* Delete Action */}
        {post && actions.deletePost && (
          <>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}

        {/* Back Link */}
        <button
          type="button"
          onClick={() => router.push('/admin/posts')}
          disabled={isPending}
          className="ml-auto rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
        >
          Back to Posts
        </button>
      </div>

      {post && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>Status: {post.status}</p>
          {post.published_at && (
            <p>
              Published: {new Date(post.published_at).toLocaleDateString()}
            </p>
          )}
          <p>Updated: {new Date(post.updated_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
