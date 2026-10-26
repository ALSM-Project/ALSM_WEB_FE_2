import { describe, expect, it } from 'vitest';
import {
  MAX_UPLOAD_FILE_BYTES,
  acceptAttribute,
  classifyFile,
  formatFileSize,
  validateIncomingFile,
} from '../utils/uploadValidation';

describe('validateIncomingFile', () => {
  const ok = { name: 'LOGIN.bms', size: 1200 };

  it('accepts screen files and archives for a BMS/DSPF project', () => {
    expect(validateIncomingFile(ok, 'BMS_DSPF_TO_FRONTEND', [])).toBeNull();
    expect(validateIncomingFile({ name: 'a.DSPF', size: 5 }, 'BMS_DSPF_TO_FRONTEND', [])).toBeNull();
    expect(validateIncomingFile({ name: 'bundle.zip', size: 5 }, 'BMS_DSPF_TO_FRONTEND', [])).toBeNull();
  });

  it('accepts programs, copybooks and archives for a COBOL project', () => {
    for (const name of ['P.cbl', 'P.cob', 'C.cpy', 'all.zip']) {
      expect(validateIncomingFile({ name, size: 5 }, 'COBOL_TO_JAVA', [])).toBeNull();
    }
  });

  it('rejects a file type that does not match the conversion type', () => {
    expect(validateIncomingFile({ name: 'P.cbl', size: 5 }, 'BMS_DSPF_TO_FRONTEND', [])).toMatchObject({
      code: 'UNSUPPORTED_TYPE',
    });
    expect(validateIncomingFile(ok, 'COBOL_TO_JAVA', [])).toMatchObject({ code: 'UNSUPPORTED_TYPE' });
    expect(validateIncomingFile({ name: 'notes.txt', size: 5 }, 'COBOL_TO_JAVA', [])).toMatchObject({
      code: 'UNSUPPORTED_TYPE',
    });
  });

  it('rejects empty files and files over 50 MB', () => {
    expect(validateIncomingFile({ name: 'A.bms', size: 0 }, 'BMS_DSPF_TO_FRONTEND', [])).toMatchObject({
      code: 'EMPTY_FILE',
    });
    expect(
      validateIncomingFile({ name: 'A.bms', size: MAX_UPLOAD_FILE_BYTES + 1 }, 'BMS_DSPF_TO_FRONTEND', []),
    ).toMatchObject({ code: 'TOO_LARGE' });
    expect(
      validateIncomingFile({ name: 'A.bms', size: MAX_UPLOAD_FILE_BYTES }, 'BMS_DSPF_TO_FRONTEND', []),
    ).toBeNull();
  });

  it('flags a duplicate name case-insensitively', () => {
    expect(validateIncomingFile(ok, 'BMS_DSPF_TO_FRONTEND', ['login.BMS'])).toMatchObject({
      code: 'DUPLICATE',
    });
  });
});

describe('upload helpers', () => {
  it('classifies files and builds the picker accept list', () => {
    expect(classifyFile('A.bms', 'BMS_DSPF_TO_FRONTEND')).toBe('SCREEN');
    expect(classifyFile('A.cpy', 'COBOL_TO_JAVA')).toBe('PROGRAM');
    expect(classifyFile('all.zip', 'COBOL_TO_JAVA')).toBe('PROGRAM');
    expect(classifyFile('all.zip', 'BMS_DSPF_TO_FRONTEND')).toBe('SCREEN');
    expect(acceptAttribute('BMS_DSPF_TO_FRONTEND')).toBe('.bms,.dspf,.zip');
    expect(acceptAttribute('COBOL_TO_JAVA')).toBe('.cbl,.cob,.cpy,.zip');
  });

  it('formats sizes in B, KB and MB', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
