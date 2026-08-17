import type { CreateAttachmentBody } from '../api/types';

export const ATTACHMENT_ALLOWED_MEDIA_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type AttachmentMediaType = (typeof ATTACHMENT_ALLOWED_MEDIA_TYPES)[number];

export const ATTACHMENT_PER_FILE_MAX_BYTES: Record<AttachmentMediaType, number> = {
  'text/plain': 262144,
  'text/markdown': 262144,
  'application/pdf': 10485760,
  'image/png': 5242880,
  'image/jpeg': 5242880,
  'image/webp': 5242880,
};

export const ATTACHMENT_MAX_COUNT = 5;
export const ATTACHMENT_AGGREGATE_MAX_BYTES = 20971520;

const DENIED_FILENAME_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'com',
  'dll',
  'html',
  'htm',
  'js',
  'mjs',
  'svg',
  'zip',
  'rar',
  '7z',
  'scr',
  'ps1',
  'sh',
]);

const EXTENSION_MEDIA_TYPES: Record<string, AttachmentMediaType> = {
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function displayFilename(file: File): string {
  const raw = file.name.replaceAll('\\', '/').split('/').pop() ?? 'attachment';
  return raw.trim() || 'attachment';
}

export function filenameExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? '';
}

export function declaredMediaType(file: File): AttachmentMediaType | null {
  const filename = displayFilename(file);
  const fromType = ATTACHMENT_ALLOWED_MEDIA_TYPES.find((item) => item === file.type);
  if (fromType) return fromType;
  return EXTENSION_MEDIA_TYPES[filenameExtension(filename)] ?? null;
}

export function validateLocalFile(
  file: File,
  currentCount: number,
  currentBytes: number,
): string | null {
  const filename = displayFilename(file);
  const extension = filenameExtension(filename);
  if (DENIED_FILENAME_EXTENSIONS.has(extension)) {
    return `${filename} is not an allowed reference type. Use text, Markdown, PDF, PNG, JPEG, or WebP.`;
  }
  const mediaType = declaredMediaType(file);
  if (!mediaType) {
    return `${filename} must be a text, Markdown, PDF, PNG, JPEG, or WebP reference.`;
  }
  if (currentCount >= ATTACHMENT_MAX_COUNT) {
    return 'Attach at most five references.';
  }
  if (file.size > ATTACHMENT_PER_FILE_MAX_BYTES[mediaType]) {
    return `${filename} exceeds the size limit for ${mediaType}.`;
  }
  if (currentBytes + file.size > ATTACHMENT_AGGREGATE_MAX_BYTES) {
    return 'Attached references together exceed 20 MB.';
  }
  return null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy);
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('');
}

export async function toAttachmentPayload(file: File): Promise<CreateAttachmentBody> {
  const mediaType = declaredMediaType(file);
  if (!mediaType) {
    throw new Error('Unsupported attachment type');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return {
    declared_media_type: mediaType,
    filename: displayFilename(file),
    content_sha256: await sha256Hex(bytes),
    content_base64: bytesToBase64(bytes),
  };
}
