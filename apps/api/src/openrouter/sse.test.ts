import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { eventsFromSseLine, toVectorLiteral } from './sse';

describe('eventsFromSseLine', () => {
  it('ignores comments and reads a token', () => {
    assert.deepEqual(eventsFromSseLine(': OPENROUTER PROCESSING'), []);
    assert.deepEqual(
      eventsFromSseLine('data: {"choices":[{"delta":{"content":"Hello"}}]}'),
      [{ type: 'token', token: 'Hello' }],
    );
  });

  it('stops on the done marker and surfaces provider errors', () => {
    assert.deepEqual(eventsFromSseLine('data: [DONE]'), [{ type: 'done' }]);
    assert.deepEqual(eventsFromSseLine('data: {"error":{"message":"quota"}}'), [
      { type: 'error', message: 'quota' },
    ]);
  });
});

describe('toVectorLiteral', () => {
  it('rejects a vector whose length does not match the schema', () => {
    assert.throws(() => toVectorLiteral([0.1, 0.2], 1536), /1536/);
  });
});
