const LONG_NUMBER = /\d{11,}/g;
const CARD_GROUPS = /\b(?:\d{4}[ -]){3}\d{4}\b/g;

export function redactSensitive(text: string): { text: string; redacted: boolean } {
  let redacted = false;
  const hide = () => {
    redacted = true;
    return '[redacted]';
  };
  const next = text.replace(CARD_GROUPS, hide).replace(LONG_NUMBER, hide);
  return { text: next, redacted };
}
