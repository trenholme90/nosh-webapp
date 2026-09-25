import { Link } from 'react-router';
import { useDocumentTitle } from '../lib/use-document-title.ts';

export function NotFoundPage({ message = 'We couldn’t find that page.' }: { message?: string }) {
  useDocumentTitle('Not found');

  return (
    <>
      <h1>Nothing here</h1>
      <p className="lede">{message}</p>
      <p className="page-actions">
        <Link to="/recipes" className="button button--primary">
          Browse recipes
        </Link>
      </p>
    </>
  );
}
