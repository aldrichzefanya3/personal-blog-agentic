/**
 * Media Library Page — Requirements 13.6, 13.7, 13.8, 13.9, 13.10
 *
 * Displays:
 *  - MediaUploader component for uploading new files
 *  - Paginated media grid (max 100/page) showing:
 *      - storage_path
 *      - mime_type
 *      - size_bytes
 *      - upload date
 *      - URL for copying
 *  - Delete button per item with confirmation (Req 13.7, 13.8, 13.9)
 */

import { MediaUploader } from '@/components/admin/MediaUploader';
import { MediaLibrary } from './media-library';
import { getMediaByUploader } from '@/lib/db/queries/media';
import { requireRole } from '@/lib/authz/guards';
import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Media Library | Admin',
  description: 'Upload and manage media files',
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

const STORAGE_BUCKET = 'blog-media';

export default async function MediaPage(props: PageProps) {
  // Verify permission (Req 13.10)
  const session = await requireRole('media:upload');

  // Parse page parameter
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = 100; // Max per page (Req 13.7)

  // Fetch media records for current user (Req 13.7)
  const result = await getMediaByUploader({
    uploaderId: session.id,
    page,
    pageSize,
  });

  // Attach public URLs to each media item (Req 13.6)
  const supabase = await createSupabaseServerClient();
  const mediaWithUrls = result.data.map((media) => {
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(media.storage_path);

    return {
      ...media,
      url: data.publicUrl,
    };
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        Media Library
      </h1>

      {/* Upload Section */}
      <div className="mb-8">
        <MediaUploader />
      </div>

      {/* Media Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Your Uploaded Media
        </h2>
        <MediaLibrary
          media={mediaWithUrls}
          pagination={{
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
          }}
        />
      </div>
    </div>
  );
}
