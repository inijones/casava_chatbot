import { readConfig } from './config';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('readConfig', () => {
  it('requires a database url and applies documented defaults', () => {
    const config = readConfig({ DATABASE_URL: 'postgresql://localhost/casava' });
    assert.equal(config.port, 3000);
    assert.equal(config.embeddingDimensions, 1536);
    assert.equal(config.embeddingModel, 'openai/text-embedding-3-small');
    assert.equal(config.retrievalLimit, 4);
    assert.equal(config.historyLimit, 12);
    assert.deepEqual(config.frontendOrigins, ['http://localhost:5173']);
    assert.equal(config.openRouterApiKey, '');
  });

  it('rejects a non-numeric embedding size', () => {
    assert.throws(
      () => readConfig({ DATABASE_URL: 'postgresql://localhost/casava', EMBEDDING_DIMENSIONS: 'wide' }),
      /EMBEDDING_DIMENSIONS/,
    );
  });
});
