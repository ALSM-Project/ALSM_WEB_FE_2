import { describe, it, expect } from 'vitest';
import { formatIpAddress } from './network';

describe('formatIpAddress utility', () => {
  it('converts IPv6 loopback ::1 to 127.0.0.1', () => {
    expect(formatIpAddress('::1')).toBe('127.0.0.1');
    expect(formatIpAddress('0:0:0:0:0:0:0:1')).toBe('127.0.0.1');
  });

  it('strips ::ffff: prefix from IPv4-mapped IPv6 addresses', () => {
    expect(formatIpAddress('::ffff:127.0.0.1')).toBe('127.0.0.1');
    expect(formatIpAddress('::ffff:192.168.1.100')).toBe('192.168.1.100');
    expect(formatIpAddress('::ffff:10.0.4.18')).toBe('10.0.4.18');
  });

  it('preserves standard IPv4 and valid remote IPs', () => {
    expect(formatIpAddress('127.0.0.1')).toBe('127.0.0.1');
    expect(formatIpAddress('192.168.1.42')).toBe('192.168.1.42');
    expect(formatIpAddress('118.69.182.5')).toBe('118.69.182.5');
  });

  it('defaults to 127.0.0.1 for empty, null, undefined, or unrecorded local/system calls', () => {
    expect(formatIpAddress(null)).toBe('127.0.0.1');
    expect(formatIpAddress(undefined)).toBe('127.0.0.1');
    expect(formatIpAddress('')).toBe('127.0.0.1');
    expect(formatIpAddress('-')).toBe('127.0.0.1');
    expect(formatIpAddress('unknown')).toBe('127.0.0.1');
  });
});
