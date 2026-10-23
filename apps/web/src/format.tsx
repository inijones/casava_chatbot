import type { ReactNode } from 'react';

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|https?:\/\/[^\s<]+)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${index}`}>{token.slice(2, -2)}</strong>);
    } else {
      const url = token.replace(/[),.;]+$/, '');
      const trailing = token.slice(url.length);
      nodes.push(
        <a key={`${keyPrefix}-a${index}`} href={url} target="_blank" rel="noreferrer">
          {url}
        </a>,
      );
      if (trailing) nodes.push(trailing);
    }
    last = match.index + token.length;
    index += 1;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function MessageBody({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim().length > 0);
  if (blocks.length === 0) return null;

  return (
    <div className="message-body">
      {blocks.map((block, index) => {
        const lines = block.split('\n').filter((line) => line.length > 0);
        const isList = lines.every((line) => /^[-*]\s+/.test(line.trim()));
        if (isList) {
          return (
            <ul key={index}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>
                  {renderInline(line.trim().replace(/^[-*]\s+/, ''), `${index}-${lineIndex}`)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line, `${index}-${lineIndex}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
