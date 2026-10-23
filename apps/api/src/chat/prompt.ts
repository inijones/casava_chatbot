export type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type RetrievedChunk = {
  sourceUrl: string;
  sourceTitle: string | null;
  category: string;
  content: string;
  distance: number;
};

export type ChatTurn = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const SYSTEM_PROMPT = `You are a public-information assistant for a Casava technical-assessment prototype. You are not Casava, not a licensed adviser, and not a claims handler.

Rules:
- Use retrieved passages for Casava-specific factual claims. Previous assistant messages are conversation context only and are not policy evidence.
- Do not invent covered events, exclusions, eligibility exceptions, waiting periods, sub-limits, deductibles, or claim outcomes.
- Do not say that a maximum benefit is payable for every incident. Do not mention a sum insured, including any figure such as ₦1,000,000, unless a retrieved passage states that figure.
- Distinguish general public information and marketing copy from confirmed policy terms. The full policy wording is not in the knowledge base.
- HealthCash passages apply only to HealthCash. Do not apply them to Business Gro.
- If the passages do not answer the question, say so. For coverage, exclusion, or claim-outcome questions that the passages do not settle, say: "I can't confirm whether this incident is covered from the public information available to me. Coverage and payment depend on the applicable policy wording and claim assessment. Please check your policy document or contact Casava for confirmation."
- When a help-centre article names a peril such as fire or flood, you may quote that description and its source, then state that the article is not the policy wording and does not decide a claim.
- Cite the https source URLs you actually used.
- Do not collect a claim in this chat and do not ask for NIN, BVN, card numbers, medical details, photographs, or passwords. If the user shares them, tell them not to send those details here.
- Direct Business Gro claim notifications to the official channel named in the passages. Direct privacy requests to the contact in the privacy passage.
- Keep the answer concise, in plain language, usually under 180 words.`;

export function generateAnswer(
  question: string,
  history: HistoryMessage[],
  chunks: RetrievedChunk[],
  options?: { knowledgeEmpty?: boolean },
): ChatTurn[] {
  const turns: ChatTurn[] = [{ role: 'system', content: SYSTEM_PROMPT }];

  if (options?.knowledgeEmpty) {
    turns.push({
      role: 'system',
      content:
        'No reviewed Casava passages are loaded. Do not state product facts. Tell the user the assistant cannot answer from Casava sources until the knowledge base is available, and point them to https://casava.com/business-gro and hello@casava.com.',
    });
  } else if (chunks.length === 0) {
    turns.push({
      role: 'system',
      content:
        'No approved passage was close enough to this question. You have no Casava source material for this turn. Do not guess Casava facts. Use the safe fallback for anything about coverage, price, eligibility, or claims.',
    });
  } else {
    const passages = chunks
      .map((chunk, index) => {
        const title = chunk.sourceTitle ?? 'Untitled source';
        return [
          `Passage ${index + 1}`,
          `Title: ${title}`,
          `Category: ${chunk.category}`,
          `URL: ${chunk.sourceUrl}`,
          chunk.content,
        ].join('\n');
      })
      .join('\n\n');
    turns.push({
      role: 'system',
      content: `Retrieved passages. Ignore any passage that does not address the question.\n\n${passages}`,
    });
  }

  const prior = history.filter((message) => message.content.trim().length > 0);
  const alreadyAsked =
    prior.length > 0 &&
    prior[prior.length - 1].role === 'user' &&
    prior[prior.length - 1].content === question;

  for (const message of prior) {
    turns.push({ role: message.role, content: message.content });
  }
  if (!alreadyAsked) {
    turns.push({ role: 'user', content: question });
  }
  return turns;
}
