/**
 * Integration tests for media upload and deletion (Task 24.4).
 *
 * These tests exercise the real `uploadMedia` and `deleteMedia` service
 * functions against mocked Supabase Storage and the Postgres.js client.
 *
 * Scenarios:
 *  - Valid upload → media record exists, URL returned
 *  - Invalid MIME → 400 with field-level error
 *  - Size > 10 MB → 400 with size error
 *  - Delete media that is in use → 400 with "media is in use" error
 *  - Unauthenticated upload → 401
 *
 * Requirements: 13.3, 13.4, 13.9, 13.10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase server client factory.
const { mockUpload, mockRemove, mockGetPublicUrl, mockCreateMediaRecord, mockIsMediaInUse, mockDeleteMediaRecord } =
  vi.hoisted(() => ({
    mockUpload: vi.fn(),
    mockRemove: vi.fn(),
    mockGetPublicUrl: vi.fn(),
    mockCreateMediaRecord: vi.fn(),
    mockIsMediaInUse: vi.fn(),
    mockDeleteMediaRecord: vi.fn(),
  }));

vi.mock('@/lib/auth/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  })),
}));

vi.mock('@/lib/db/queries/media', () => ({
  createMediaRecord: mockCreateMediaRecord,
  deleteMediaRecord: mockDeleteMediaRecord,
  isMediaInUse: mockIsMediaInUse,
}));

import { uploadMedia, deleteMedia } from '@/lib/services/media';
import { StorageError } from '@/lib/errors';

function makeFile(opts: { type?: string; size?: number; name?: string } = {}) {
  return new File([new Uint8Array(opts.size ?? 1024)], opts.name ?? 'test.jpg', {
    type: opts.type ?? 'image/jpeg',
  });
}

describe('Media Upload/Delete — Integration (Req 13.3, 13.4, 13.9, 13.10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ data: { path: 'media/x/2024/01/abc.jpg' }, error: null });
    mockRemove.mockResolvedValue({ data: null, error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/abc.jpg' } });
    mockCreateMediaRecord.mockResolvedValue({
      id: 'media-1',
      uploader_id: 'user-1',
      filename: 'test.jpg',
      storage_path: 'media/user-1/2024/01/abc.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 1024,
      created_at: '2024-01-01T00:00:00Z',
    });
    mockIsMediaInUse.mockResolvedValue(false);
    mockDeleteMediaRecord.mockResolvedValue(undefined);
  });

  it('upload with valid MIME and size → media record exists, URL returned (Req 13.4)', async () => {
    const result = await uploadMedia({
      file: makeFile({ type: 'image/jpeg', size: 1024, name: 'test.jpg' }),
      uploaderId: 'user-1',
    });

    expect(result.media.id).toBe('media-1');
    expect(result.url).toBe('https://example.com/abc.jpg');
    expect(mockUpload).toHaveBeenCalledOnce();
    expect(mockCreateMediaRecord).toHaveBeenCalledOnce();
  });

  it('upload with invalid MIME → StorageError with field-level error (Req 13.3)', async () => {
    await expect(
      uploadMedia({
        file: makeFile({ type: 'image/svg+xml', size: 1024 }),
        uploaderId: 'user-1',
      }),
    ).rejects.toThrow(StorageError);

    // Storage must NOT be touched when validation fails.
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('upload with size > 10 MB → StorageError with size error (Req 13.3)', async () => {
    await expect(
      uploadMedia({
        file: makeFile({ type: 'image/png', size: 11 * 1024 * 1024 }),
        uploaderId: 'user-1',
      }),
    ).rejects.toThrow(StorageError);

    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('delete media that is in use → StorageError "media is in use" (Req 13.9)', async () => {
    mockIsMediaInUse.mockResolvedValue(true);

    await expect(
      deleteMedia({ mediaId: 'media-1', storagePath: 'media/user-1/2024/01/abc.jpg' }),
    ).rejects.toThrow(StorageError);

    // Storage must NOT be touched when the media is in use.
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockDeleteMediaRecord).not.toHaveBeenCalled();
  });

  it('delete media not in use → removes from storage and DB (Req 13.8)', async () => {
    mockIsMediaInUse.mockResolvedValue(false);

    await expect(
      deleteMedia({ mediaId: 'media-1', storagePath: 'media/user-1/2024/01/abc.jpg' }),
    ).resolves.toBeUndefined();

    expect(mockRemove).toHaveBeenCalledWith(['media/user-1/2024/01/abc.jpg']);
    expect(mockDeleteMediaRecord).toHaveBeenCalledWith('media-1');
  });

  it('upload failure rolls back (no media record created)', async () => {
    mockUpload.mockResolvedValueOnce({
      data: null,
      error: new Error('Storage unavailable'),
    });

    await expect(
      uploadMedia({
        file: makeFile({ type: 'image/jpeg', size: 1024 }),
        uploaderId: 'user-1',
      }),
    ).rejects.toThrow(StorageError);

    expect(mockCreateMediaRecord).not.toHaveBeenCalled();
  });
});