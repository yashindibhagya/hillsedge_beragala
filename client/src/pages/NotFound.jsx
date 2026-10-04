import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Button } from '../components/Button';

export default function NotFound() {
  useDocumentTitle('Page not found', undefined, { noindex: true });

  return (
    <section className="state-page wrap">
      <p className="eyebrow">404</p>
      <h1 className="display-2">This path leads off the hillside.</h1>
      <p className="lede">
        The page you were looking for is not here — it may have moved when the site was rebuilt.
      </p>
      <div className="state-page-actions">
        <Button to="/" variant="solid" arrow>
          Back to home
        </Button>
        <Button to="/menu" variant="outline">
          See the menu
        </Button>
      </div>
    </section>
  );
}
