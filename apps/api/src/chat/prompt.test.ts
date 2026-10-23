import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateAnswer } from './prompt';

describe('generateAnswer', () => {
  it('requires the safe coverage fallback and forbids invented payouts', () => {
    const messages = generateAnswer('Is fire covered?', [], []);
    const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n');
    assert.match(system, /I can't confirm whether this incident is covered/);
    assert.match(system, /₦1,000,000/);
    assert.match(system, /not policy evidence/);
    assert.equal(messages.at(-1)?.content, 'Is fire covered?');
  });

  it('does not repeat the current question when history already ends with it', () => {
    const messages = generateAnswer(
      'Who can apply?',
      [{ role: 'user', content: 'Who can apply?' }],
      [
        {
          sourceUrl: 'https://casava.com/business-gro',
          sourceTitle: 'Business Gro',
          category: 'eligibility',
          content: 'SMEDAN-registered businesses can apply.',
          distance: 0.2,
        },
      ],
    );
    const userTurns = messages.filter((message) => message.role === 'user');
    assert.equal(userTurns.length, 1);
    assert.match(messages[1].content, /https:\/\/casava.com\/business-gro/);
  });
});
