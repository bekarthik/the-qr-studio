import { useEffect, useRef, useState } from 'react';
import { useGen } from '../state/GeneratorContext';

/** Copies a permalink that encodes the current design (no images) so it can be
 *  shared or bookmarked. Shows transient "Copied!" feedback. */
export function ShareButton() {
  const { shareUrl } = useGen();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async () => {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — the URL is already in the address bar to copy manually
      window.prompt('Copy this link to your design:', url);
    }
  };

  return (
    <button
      type="button"
      className={'reset-btn share-btn' + (copied ? ' is-copied' : '')}
      title="Copy a shareable link to this design (images not included)"
      onClick={onClick}
    >
      {copied ? '✓' : '🔗'} <span className="btn-t">{copied ? 'Copied' : 'Share'}</span>
    </button>
  );
}
