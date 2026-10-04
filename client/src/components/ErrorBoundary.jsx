import { Component } from 'react';
import { Link } from 'react-router-dom';

/**
 * A failed dynamic import reads differently in every engine, and none of the
 * messages are ones a guest should ever see.
 */
const CHUNK_ERROR =
  /dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically imported module/i;

/**
 * Catches render errors so one broken component cannot blank the whole site.
 *
 * The case this exists for is mundane and happens on every deploy: a visitor
 * holding the previous index.html clicks through to a route chunk whose
 * hashed filename no longer exists. React unmounts the tree on the failed
 * import and the page goes white. Reloading picks up the new shell, so that
 * is what the recovery offers.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Left visible in the console for anyone debugging a real fault.
    console.error('Unhandled render error:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const stale = CHUNK_ERROR.test(error.message || '');

    return (
      <section className="state-page wrap">
        <p className="eyebrow">{stale ? 'New version available' : 'Something went wrong'}</p>
        <h1 className="display-2">
          {stale
            ? 'The site was updated while you were here.'
            : 'That part of the page failed to load.'}
        </h1>
        <p className="lede">
          {stale
            ? 'Reload to pick up the latest version — you will land back where you were.'
            : 'Reloading usually clears it. If it keeps happening, the rest of the site still works.'}
        </p>
        <div className="state-page-actions">
          <button type="button" className="btn btn-solid" onClick={() => window.location.reload()}>
            <span>Reload the page</span>
          </button>
          <Link to="/" className="btn btn-outline" onClick={() => this.setState({ error: null })}>
            <span>Back to home</span>
          </Link>
        </div>
      </section>
    );
  }
}

export default ErrorBoundary;
