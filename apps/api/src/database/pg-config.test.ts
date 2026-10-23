import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pgPoolConfig } from './pg-config';

describe('pgPoolConfig', () => {
  it('leaves a local Docker connection unencrypted', () => {
    const config = pgPoolConfig('postgresql://postgres:postgres@localhost:5433/casava_chatbot');
    assert.equal(config.ssl, undefined);
    assert.match(config.connectionString, /localhost:5433/);
  });

  it('enables SSL for a Neon URL and drops parameters node-pg mishandles', () => {
    const config = pgPoolConfig(
      'postgresql://user:secret@ep-example.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    );
    assert.deepEqual(config.ssl, { rejectUnauthorized: false });
    assert.equal(config.connectionString.includes('sslmode'), false);
    assert.equal(config.connectionString.includes('channel_binding'), false);
  });
});
