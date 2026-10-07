'use client';

/**
 * MediaLibrary Client Component — Requirements 13.7, 13.8, 13.9
 *
 * Displays a paginated grid of media items with:
 *  - Thumbnail preview
 *  - storage_path, mime_type, size_bytes, upload date
 *  - Copy URL button
 *  - Delete button with confirmation
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteMediaAction } from '@/actions/media';
import type { Media } from '@/types/database';
import Image from 'next/image';

interface MediaWithUrl extends Media {
  url: string;
}

interface MediaLibraryProps {
  media: MediaWithUrl[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function MediaLibrary({ media, pagination }: MediaLibraryProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handleDelete = async (mediaItem: MediaWithUrl) => {
    // Confirmation prompt (Req 13.7)
    const confirmed = window.confirm(
      `Are you sure you want to delete "${mediaItem.filename}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(mediaItem.id);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('id', mediaItem.id);

      const result = await deleteMediaAction(formData);

      if ('error' in result) {
        setError(result.error);
      } else {
        // Success — refresh the page
        router.refresh();
      }
    } catch (err) {
      setError('Delete failed. Please try again.');
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    router.push(`/admin/media?page=${newPage}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  if (media.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>No media files uploaded yet.</p>
        <p className="text-sm mt-2">Upload your first image above to get started.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Media Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {media.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
          >
            {/* Image Preview */}
            <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-900">
              <Image
                src={item.url}
                alt={item.filename}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>

            {/* Media Info */}
            <div className="p-4 space-y-2">
              <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate" title={item.filename}>
                {item.filename}
              </h3>

              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                  <span className="font-medium">Type:</span> {item.mime_type}
                </p>
                <p>
                  <span className="font-medium">Size:</span> {formatFileSize(item.size_bytes)}
                </p>
                <p>
                  <span className="font-medium">Uploaded:</span> {formatDate(item.created_at)}
                </p>
              </div>

              {/* Storage Path (truncated) */}
              <p className="text-xs text-gray-500 dark:text-gray-500 truncate" title={item.storage_path}>
                {item.storage_path}
              </p>

              {/* URL Display */}
              <div className="pt-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Public URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={item.url}
                    className="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 
                      rounded bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 truncate"
                  />
                  <button
                    onClick={() => handleCopyUrl(item.url)}
                    className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700
                      transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
                    title="Copy URL"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Delete Button */}
              <div className="pt-2">
                <button
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                    dark:bg-red-700 dark:hover:bg-red-600"
                >
                  {deletingId === item.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
              hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors text-gray-700 dark:text-gray-300"
          >
            Previous
          </button>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
            {' '}
            ({pagination.total} total items)
          </span>

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
              hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors text-gray-700 dark:text-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
