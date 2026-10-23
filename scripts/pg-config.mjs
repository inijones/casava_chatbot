export function pgPoolConfig(connectionString) {
  let sslmode = null;
  let hostname = '';
  let cleaned = connectionString;

  try {
    const url = new URL(connectionString);
    sslmode = url.searchParams.get('sslmode');
    hostname = url.hostname;
    url.searchParams.delete('sslmode');
    url.searchParams.delete('channel_binding');
    cleaned = url.toString();
  } catch {
    cleaned = connectionString;
  }

  const needsSsl =
    hostname.endsWith('neon.tech') ||
    sslmode === 'require' ||
    sslmode === 'verify-full' ||
    sslmode === 'verify-ca' ||
    sslmode === 'prefer';

  return needsSsl
    ? { connectionString: cleaned, ssl: { rejectUnauthorized: false } }
    : { connectionString: cleaned };
}
