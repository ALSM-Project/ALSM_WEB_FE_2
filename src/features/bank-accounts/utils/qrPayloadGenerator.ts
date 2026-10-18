import QRCode from 'qrcode';

/**
 * Strips Vietnamese diacritics to ensure ASCII compliance for banking switches.
 */
export function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toUpperCase();
}

/**
 * Calculates standard CRC-16/CCITT checksum (polynomial 0x1021, init 0xFFFF).
 */
export function calculateCrc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formats a single EMVCo Tag-Length-Value (TLV) segment.
 */
function tlv(tag: string, value: string): string {
  const val = String(value);
  const len = val.length.toString().padStart(2, '0');
  return `${tag}${len}${val}`;
}

/**
 * Builds standard payment QR string based on EMVCo / domestic banking specification.
 * Tag 38 contains the acquiring BIN and account number for interbank fund transfers.
 */
export function buildPaymentQrPayload(
  bin: string,
  accountNumber: string,
  accountHolderName?: string,
  amount?: number,
  message?: string,
): string {
  const cleanBin = bin.trim();
  const cleanAccNum = accountNumber.trim();
  const cleanName = accountHolderName ? removeDiacritics(accountHolderName.trim()).substring(0, 25) : '';

  // Tag 38: Merchant Account Information
  const tag38_00 = tlv('00', 'A000000727');
  const tag38_01_sub = tlv('00', cleanBin) + tlv('01', cleanAccNum);
  const tag38_01 = tlv('01', tag38_01_sub);
  const tag38_02 = tlv('02', 'QRIBFTTA');
  const tag38 = tlv('38', tag38_00 + tag38_01 + tag38_02);

  // Root TLV Payload
  let payload = tlv('00', '01'); // Payload Format Indicator
  payload += tlv('01', amount ? '12' : '11'); // 11 = Static QR, 12 = Dynamic QR
  payload += tag38;
  payload += tlv('53', '704'); // VND currency code
  if (amount && amount > 0) {
    payload += tlv('54', String(amount));
  }
  payload += tlv('58', 'VN'); // Country code
  if (cleanName) {
    payload += tlv('59', cleanName);
  }
  if (message && message.trim()) {
    const tag62_sub = tlv('08', message.trim().substring(0, 25));
    payload += tlv('62', tag62_sub);
  }
  payload += '6304'; // CRC header

  const checksum = calculateCrc16(payload);
  return payload + checksum;
}

/**
 * Generates pure QR Code data URL without any third-party banners, logos or headers.
 */
export async function generatePureQrDataUrl(
  bin: string,
  accountNumber: string,
  accountHolderName?: string,
  options?: { width?: number; amount?: number; message?: string },
): Promise<string> {
  const payload = buildPaymentQrPayload(
    bin,
    accountNumber,
    accountHolderName,
    options?.amount,
    options?.message,
  );

  return QRCode.toDataURL(payload, {
    width: options?.width || 320,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}
