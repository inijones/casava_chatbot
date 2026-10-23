import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

type Chunk = {
  source_url: string;
  source_title: string;
  retrieved_at: string;
  category: string;
  content: string;
};

const file = path.resolve(__dirname, '../../../../knowledge/reviewed/chunks.json');

describe('reviewed knowledge', () => {
  const chunks = JSON.parse(fs.readFileSync(file, 'utf8')) as Chunk[];

  it('has provenance on every passage and no invented sum insured', () => {
    assert.ok(chunks.length >= 8);
    const hashes = new Set<string>();
    for (const chunk of chunks) {
      assert.match(chunk.source_url, /^https:\/\//);
      assert.ok(chunk.source_title.trim().length > 0);
      assert.ok(!Number.isNaN(Date.parse(chunk.retrieved_at)));
      assert.ok(chunk.category.trim().length > 0);
      assert.ok(chunk.content.trim().length > 80);
      assert.equal(/1[,.]?000[,.]?000|₦\s*1,?000,?000/i.test(chunk.content), false);
      const hash = crypto
        .createHash('sha256')
        .update(`${chunk.source_url}\n${chunk.category}\n${chunk.content}`)
        .digest('hex');
      assert.equal(hashes.has(hash), false);
      hashes.add(hash);
    }
  });
});
