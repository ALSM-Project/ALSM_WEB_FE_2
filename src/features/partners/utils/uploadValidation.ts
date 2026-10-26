import type { ConversionType } from '../types/partner.types';

export const MAX_UPLOAD_FILE_BYTES = 50 * 1024 * 1024;

export type QueuedFileKind = 'SCREEN' | 'PROGRAM';

const SCREEN_EXTENSIONS = ['bms', 'dspf'];
const PROGRAM_EXTENSIONS = ['cbl', 'cob', 'cpy'];
const ARCHIVE_EXTENSION = 'zip';

/** What a project of each conversion type accepts (UC-46 business rules). */
export const ACCEPTED_EXTENSIONS: Record<ConversionType, string[]> = {
  BMS_DSPF_TO_FRONTEND: [...SCREEN_EXTENSIONS, ARCHIVE_EXTENSION],
  COBOL_TO_JAVA: [...PROGRAM_EXTENSIONS, ARCHIVE_EXTENSION],
};

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/** `accept` attribute value for the file picker of a project. */
export function acceptAttribute(conversionType: ConversionType): string {
  return ACCEPTED_EXTENSIONS[conversionType].map((ext) => `.${ext}`).join(',');
}

export function acceptedLabel(conversionType: ConversionType): string {
  return ACCEPTED_EXTENSIONS[conversionType].map((ext) => `.${ext}`).join(', ');
}

/** Screens for BMS/DSPF, programs for COBOL (copybooks and archives follow the project). */
export function classifyFile(fileName: string, conversionType: ConversionType): QueuedFileKind {
  const ext = fileExtension(fileName);
  if (SCREEN_EXTENSIONS.includes(ext)) return 'SCREEN';
  if (PROGRAM_EXTENSIONS.includes(ext)) return 'PROGRAM';
  return conversionType === 'COBOL_TO_JAVA' ? 'PROGRAM' : 'SCREEN';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type FileRejection =
  | { code: 'UNSUPPORTED_TYPE'; message: string }
  | { code: 'EMPTY_FILE'; message: string }
  | { code: 'TOO_LARGE'; message: string }
  | { code: 'DUPLICATE'; message: string };

/**
 * Checks one incoming file against the project's conversion type, the 50 MB limit, the
 * 0-byte rule and the names already queued (case-insensitive: files are stored by name).
 * Returns null when the file may be queued.
 */
export function validateIncomingFile(
  file: { name: string; size: number },
  conversionType: ConversionType,
  queuedNames: string[],
): FileRejection | null {
  const ext = fileExtension(file.name);
  if (!ACCEPTED_EXTENSIONS[conversionType].includes(ext)) {
    return {
      code: 'UNSUPPORTED_TYPE',
      message: `${file.name}: not allowed for this project. Accepted: ${acceptedLabel(conversionType)}`,
    };
  }
  if (file.size === 0) {
    return { code: 'EMPTY_FILE', message: `${file.name}: file is empty (0 bytes)` };
  }
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    return {
      code: 'TOO_LARGE',
      message: `${file.name}: ${formatFileSize(file.size)} exceeds the ${formatFileSize(MAX_UPLOAD_FILE_BYTES)} limit`,
    };
  }
  if (queuedNames.some((name) => name.toLowerCase() === file.name.toLowerCase())) {
    return { code: 'DUPLICATE', message: `${file.name}: already in the upload list` };
  }
  return null;
}
