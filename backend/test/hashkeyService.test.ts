import { verifyHashkeyWebhook } from '../src/services/hashkeyService';
import * as crypto from 'crypto';

describe('hashkeyService Webhook Verification', () => {
  const MOCK_SECRET = 'plA2qT-TeNv0qETZbRTmBP67R6lf21CYtMZu0gETjTE=';

  // Override the environment variable for testing
  beforeAll(() => {
    process.env.HASHKEY_APP_SECRET = MOCK_SECRET;
  });

  it('should return true for a valid webhook signature', () => {
    const rawBody = JSON.stringify({ status: 'payment-successful' });
    const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = 'random-nonce-12345';

    const message = `POST\n/api/webhook/hashkey\n\n${bodyHash}\n${timestamp}\n${nonce}`;
    const validSignature = crypto.createHmac('sha256', MOCK_SECRET).update(message).digest('hex');

    const headers = {
      'x-timestamp': timestamp,
      'x-nonce': nonce,
      'x-signature': validSignature
    };

    const isValid = verifyHashkeyWebhook(headers, rawBody);
    expect(isValid).toBe(true);
  });

  it('should return false for an expired timestamp', () => {
    const rawBody = JSON.stringify({ status: 'payment-successful' });
    const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    // 6 minutes ago (expires after 5 mins)
    const timestamp = (Math.floor(Date.now() / 1000) - 360).toString();
    const nonce = 'random-nonce-12345';

    const message = `POST\n/api/webhook/hashkey\n\n${bodyHash}\n${timestamp}\n${nonce}`;
    const validSignature = crypto.createHmac('sha256', MOCK_SECRET).update(message).digest('hex');

    const headers = {
      'x-timestamp': timestamp,
      'x-nonce': nonce,
      'x-signature': validSignature
    };

    const isValid = verifyHashkeyWebhook(headers, rawBody);
    expect(isValid).toBe(false);
  });

  it('should return false for an invalid signature', () => {
    const rawBody = JSON.stringify({ status: 'payment-successful' });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = 'random-nonce-12345';

    const headers = {
      'x-timestamp': timestamp,
      'x-nonce': nonce,
      'x-signature': 'invalid-signature-here'
    };

    const isValid = verifyHashkeyWebhook(headers, rawBody);
    expect(isValid).toBe(false);
  });
});