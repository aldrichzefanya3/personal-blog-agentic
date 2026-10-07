'use client';

/**
 * MediaUploader Client Component — Requirement 13.6
 *
 * Displays:
 *  - File input with client-side MIME/size pre-validation
 *  - Progress indicator during upload
 *  - Returned URL for copy/embed
 */

import { useState } from 'react';
import { uploadMediaAction } from '@/actions/media';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

const MAX_FILE_SIZE_BYTES = 10_485_760; // 10 MB
const MAX_FILE_SIZE_MB = 10;

export function MediaUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setError(null);
      return;
    }

    // Client-side pre-validation (Req 13.1, 13.2)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError(
        `Invalid file type. Allowed types: JPEG, PNG, WebP, GIF, AVIF`,
      );
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(
        `File size exceeds ${MAX_FILE_SIZE_MB}MB. Please choose a smaller file.`,
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setUploadedUrl(null);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadedUrl(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const result = await uploadMediaAction(formData);

      if ('error' in result) {
        setError(result.error);
      } else {
        // Success (Req 13.6)
        setUploadedUrl(result.url);
        setUploadedFilename(result.media.filename);
        setSelectedFile(null);
        // Reset the file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleCopyUrl = () => {
    if (uploadedUrl) {
      navigator.clipboard.writeText(uploadedUrl);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      <h2 className="text-lg font-semibold mb-4">Upload New Media</h2>

      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label
            htmlFor="file-input"
            className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            Select Image File
          </label>
          <input
            id="file-input"
            type="file"
            accept={ALLOWED_MIME_TYPES.join(',')}
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              dark:file:bg-blue-900 dark:file:text-blue-200
              dark:hover:file:bg-blue-800
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            JPEG, PNG, WebP, GIF, or AVIF (max {MAX_FILE_SIZE_MB}MB)
          </p>
        </div>

        {selectedFile && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>
              <span className="font-medium">Selected:</span> {selectedFile.name}
            </p>
            <p>
              <span className="font-medium">Size:</span>{' '}
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedFile || uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors
            dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {/* Progress Indicator */}
      {uploading && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span>Uploading...</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Success Display with URL (Req 13.6) */}
      {uploadedUrl && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
            Upload successful: {uploadedFilename}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={uploadedUrl}
              className="flex-1 text-xs px-3 py-2 border border-gray-300 dark:border-gray-600 
                rounded-md bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
            />
            <button
              onClick={handleCopyUrl}
              className="px-3 py-2 text-xs bg-green-600 text-white rounded-md hover:bg-green-700
                transition-colors dark:bg-green-700 dark:hover:bg-green-600"
            >
              Copy URL
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Use this URL in your posts or as a cover image.
          </p>
        </div>
      )}
    </div>
  );
}
