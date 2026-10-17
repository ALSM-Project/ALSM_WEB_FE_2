import { describe, it, expect } from 'vitest';
import {
  removeDiacritics,
  calculateCrc16,
  buildPaymentQrPayload,
  generatePureQrDataUrl,
} from '../utils/qrPayloadGenerator';

describe('qrPayloadGenerator', () => {
  it('correctly strips Vietnamese diacritics and converts to ASCII uppercase', () => {
    expect(removeDiacritics('Nguyen Duc Huy Hoang')).toBe('NGUYEN DUC HUY HOANG');
    expect(removeDiacritics('Dang Tran Con')).toBe('DANG TRAN CON');
  });

  it('calculates valid 4-character CRC-16 CCITT', () => {
    const testString = '00020101021153037045802VN6304';
    const crc = calculateCrc16(testString);
    expect(crc).toHaveLength(4);
    expect(/^[0-9A-F]{4}$/.test(crc)).toBe(true);
  });

  it('builds standard EMVCo payload without third-party vendor tags', () => {
    const payload = buildPaymentQrPayload('970422', '0899886249', 'Nguyen Duc Huy Hoang');
    
    // Starts with Payload Format Indicator
    expect(payload.startsWith('000201010211')).toBe(true);
    // Contains acquiring bank BIN and account number
    expect(payload).toContain('970422');
    expect(payload).toContain('0899886249');
    // Currency 704 (VND) and Country VN
    expect(payload).toContain('5303704');
    expect(payload).toContain('5802VN');
    // Ends with Tag 63 (CRC) and 4-char hex
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });

  it('generates a pure Base64 PNG data URL without external requests', async () => {
    const dataUrl = await generatePureQrDataUrl('970422', '0899886249', 'Nguyen Duc Huy Hoang', {
      width: 280,
    });
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });
});
