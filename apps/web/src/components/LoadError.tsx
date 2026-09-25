/** Shown when the API cannot be reached or answers unexpectedly. Plain words, no blame. */
export function LoadError() {
  return (
    <p className="notice notice--warning" role="alert">
      We couldn’t load recipes just now. Check the API is running (<code>npm run dev</code>) and
      reload the page.
    </p>
  );
}
