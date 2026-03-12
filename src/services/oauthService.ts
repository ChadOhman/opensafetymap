import * as jose from 'jose';
import { query, queryOne, execute } from '../helpers/db.js';
import { respondError } from '../helpers/response.js';
import { createAuthToken } from '../middleware/auth.js';
import { generateRandomUsername } from './aliasGenerator.js';
import { config } from '../config.js';
import type { User } from '../helpers/types.js';
import type { Request } from 'express';

interface OAuthVerifyResult {
  oauthId: string;
  name: string;
  email: string;
}

export async function verifyOAuthToken(provider: string, token: string): Promise<OAuthVerifyResult> {
  switch (provider) {
    case 'google': return verifyGoogleToken(token);
    case 'apple': return verifyAppleToken(token);
    case 'mastodon': return verifyMastodonToken(token);
    case 'bluesky': return verifyBlueskyToken(token);
    default: throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

async function verifyGoogleToken(token: string): Promise<OAuthVerifyResult> {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to verify Google token');
  const data = await resp.json();
  if (!data?.sub) throw new Error('Invalid Google token');
  if (config.googleClientId && data.aud !== config.googleClientId) {
    throw new Error('Google token audience mismatch');
  }
  return {
    oauthId: data.sub,
    name: data.name || data.email || '',
    email: data.email || '',
  };
}

async function verifyAppleToken(token: string): Promise<OAuthVerifyResult> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid Apple JWT format');

  // Decode header to get kid
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

  if (!header?.kid || !payload) throw new Error('Invalid Apple token structure');

  // Fetch Apple's public keys
  const keysResp = await fetch('https://appleid.apple.com/auth/keys');
  if (!keysResp.ok) throw new Error('Failed to fetch Apple public keys');
  const keys = await keysResp.json();
  const matchedKey = keys.keys?.find((k: { kid: string }) => k.kid === header.kid);
  if (!matchedKey) throw new Error('Apple token key ID not found');

  // Validate claims
  if (config.appleClientId && payload.aud !== config.appleClientId) {
    throw new Error('Apple token audience mismatch');
  }
  if (payload.iss !== 'https://appleid.apple.com') {
    throw new Error('Apple token issuer mismatch');
  }
  if ((payload.exp || 0) < Math.floor(Date.now() / 1000)) {
    throw new Error('Apple token expired');
  }

  return {
    oauthId: payload.sub || '',
    name: payload.email || '',
    email: payload.email || '',
  };
}

async function verifyMastodonToken(token: string): Promise<OAuthVerifyResult> {
  let instance = 'mastodon.social';
  let accessToken = token;
  if (token.includes('|')) {
    [instance, accessToken] = token.split('|', 2);
  }

  const url = `https://${encodeURIComponent(instance)}/api/v1/accounts/verify_credentials`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error('Failed to verify Mastodon token');
  const data = await resp.json();
  if (!data?.id) throw new Error('Invalid Mastodon token');

  return {
    oauthId: data.id,
    name: data.display_name || data.username || '',
    email: data.acct || '',
  };
}

async function verifyBlueskyToken(token: string): Promise<OAuthVerifyResult> {
  const url = 'https://bsky.social/xrpc/com.atproto.server.getSession';
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error('Failed to verify Bluesky token');
  const data = await resp.json();
  if (!data?.did) throw new Error('Invalid Bluesky token');

  return {
    oauthId: data.did,
    name: data.handle || '',
    email: data.email || '',
  };
}

export async function handleOAuthLogin(
  provider: string,
  oauthId: string,
  name: string,
  email: string,
  req: Request
): Promise<{ token: string; user: Partial<User> }> {
  let user = await queryOne<User>(
    'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?',
    [provider, oauthId]
  );

  if (user) {
    if (user.status === 'banned') {
      throw new Error('Account is banned');
    }
    // Conditional update
    if (user.name !== name || user.email !== email) {
      await execute('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, user.id]);
      user.name = name;
      user.email = email;
    }
  } else {
    const username = await generateRandomUsername();
    const result = await execute(
      'INSERT INTO users (oauth_provider, oauth_id, name, email, username) VALUES (?, ?, ?, ?, ?)',
      [provider, oauthId, name, email, username]
    );
    user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [result.insertId]);
    if (!user) throw new Error('Failed to create user');
  }

  const deviceName = req.headers['user-agent'] || 'Unknown';
  const token = await createAuthToken(user.id, deviceName);
  req.session.userId = user.id;

  const safeUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    status: user.status,
  };

  return { token, user: safeUser };
}
