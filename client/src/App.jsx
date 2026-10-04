import { Suspense, lazy } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { BrandMarkSprite } from './components/BrandMark';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { Splash } from './components/Splash';
import { StickyReserve } from './components/StickyReserve';
import { StructuredData } from './components/StructuredData';
import { HeroProvider } from './context/Hero';
import { SiteDataProvider } from './context/SiteData';
import { redirects } from './data/routes';
import Home from './pages/Home';

/**
 * Home ships in the main bundle because it is the common entry point; the
 * rest are fetched on navigation, so a first visit does not pay for the
 * menu, the gallery and the booking form it may never open.
 */
const Menu = lazy(() => import('./pages/Menu'));
const About = lazy(() => import('./pages/About'));
const Experiences = lazy(() => import('./pages/Experiences'));
const Rooms = lazy(() => import('./pages/Rooms'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));

/** The frame every page sits in. */
export function Layout() {
  // Keying the boundary on the path clears a caught error as soon as the
  // guest navigates, so one bad route does not wedge the whole session.
  const { pathname } = useLocation();

  return (
    <SiteDataProvider>
      <HeroProvider>
        <Splash />
        <BrandMarkSprite />
        <StructuredData />
        <ScrollToTop />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main" tabIndex={-1}>
          <ErrorBoundary key={pathname}>
            {/* Holds the viewport open while a route chunk loads, so the
                footer does not jump up against an empty page. */}
            <Suspense fallback={<div className="route-loading" aria-hidden="true" />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        <StickyReserve />
        <Footer />
      </HeroProvider>
    </SiteDataProvider>
  );
}

export const routes = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'menu', element: <Menu /> },
      { path: 'about', element: <About /> },
      { path: 'experiences', element: <Experiences /> },
      { path: 'rooms', element: <Rooms /> },
      { path: 'gallery', element: <Gallery /> },
      { path: 'reservations', element: <Reservations /> },
      { path: 'contact', element: <Contact /> },
      ...redirects.map(({ from, to }) => ({
        path: from.slice(1),
        element: <Navigate to={to} replace />,
      })),
      { path: '*', element: <NotFound /> },
    ],
  },
];

export default Layout;
