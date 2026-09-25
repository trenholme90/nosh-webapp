import { useEffect } from 'react';

/** Name the browser tab after the page, so history and screen readers say where you are. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · Nosh` : 'Nosh';
  }, [title]);
}
