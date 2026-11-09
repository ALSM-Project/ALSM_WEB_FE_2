/**
 * Normalizes IP addresses for user-friendly display in enterprise audit logs & views.
 * Translates IPv6 loopbacks (::1), missing values, and IPv4-mapped IPv6 prefixes to clean IPv4 addresses.
 */
export function formatIpAddress(ip?: string | null): string {
  if (!ip) return '127.0.0.1';
  const trimmed = ip.trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'unknown') {
    return '127.0.0.1';
  }

  // IPv6 loopback -> standard IPv4 loopback
  if (trimmed === '::1' || trimmed === '0:0:0:0:0:0:0:1' || trimmed === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }

  // IPv4-mapped IPv6 address (::ffff:x.x.x.x)
  if (trimmed.startsWith('::ffff:')) {
    const v4 = trimmed.replace('::ffff:', '');
    return v4 === '::1' ? '127.0.0.1' : v4;
  }

  return trimmed;
}
