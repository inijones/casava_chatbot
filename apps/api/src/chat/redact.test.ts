import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { redactSensitive } from './redact';

describe('redactSensitive', () => {
  it('removes long card, BVN, and NIN-like numbers', () => {
    const result = redactSensitive('My BVN is 12345678901 and card 4111 1111 1111 1111.');
    assert.equal(result.redacted, true);
    assert.equal(result.text.includes('12345678901'), false);
    assert.equal(result.text.includes('4111'), false);
  });

  it('leaves prices and published phone numbers alone', () => {
    const sample = 'Business Gro is N200 a month. Call +234 201 330 9618.';
    const result = redactSensitive(sample);
    assert.equal(result.redacted, false);
    assert.equal(result.text, sample);
  });
});
