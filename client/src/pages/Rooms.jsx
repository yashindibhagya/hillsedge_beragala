import { useSite } from '../context/SiteData';
import { photos } from '../data/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Button } from '../components/Button';
import { PageHero } from '../components/PageHero';
import { Reveal } from '../components/Reveal';
import { RoomCard } from '../components/RoomCard';
import { EmptyState, ErrorState, Loading } from '../components/StateBlock';

export default function Rooms() {
  useDocumentTitle(
    'Rooms & Private Dining',
    'The dining hall, the sunset deck, group and private dining at Hillsedge Beragala — and what is coming next on the hillside.'
  );
  const { rooms, status, error, retry, settings } = useSite();

  return (
    <>
      <PageHero
        photo={photos.diningHall}
        eyebrow="Rooms & private dining"
        title={
          <>
            Somewhere for <em>every table.</em>
          </>
        }
        intro="From a table for two on the deck to a coach party in the hall — tell us who is coming and we will set the right space."
      />

      <section className="section rooms-list" aria-label="Spaces">
        <div className="wrap">
          {status === 'loading' && rooms.length === 0 && (
            <Loading label="Loading the spaces" rows={4} />
          )}
          {status === 'error' && rooms.length === 0 && (
            <ErrorState title="The spaces did not load." message={error?.message} onRetry={retry} />
          )}
          {status === 'ready' && rooms.length === 0 && (
            <EmptyState title="Spaces are being updated.">
              <p>Message us and we will tell you what is available.</p>
            </EmptyState>
          )}
          <div className="rooms-stack">
            {rooms.map((room, index) => (
              <Reveal key={room.id} className={index % 2 ? 'room-alt' : ''}>
                <RoomCard
                  room={room}
                  currency={settings.restaurant.currency}
                  layout="wide"
                  headingLevel="h2"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section band">
        <Reveal className="wrap band-inner">
          <p className="band-title">Planning a group, a celebration or a coach stop?</p>
          <p>Set and group menus are arranged in advance around the smokehouse.</p>
          <Button to="/reservations" variant="gold" arrow>
            Start a booking
          </Button>
        </Reveal>
      </section>
    </>
  );
}
