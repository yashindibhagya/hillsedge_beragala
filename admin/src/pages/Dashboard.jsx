import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { BarChart } from '../components/BarChart';
import { Badge, Card, ErrorState, Icon, PageHeader, Skeleton } from '../components/ui';
import { useResource } from '../hooks/useResource';
import { RESERVATION_STATUSES, formatDate, labelOf, timeAgo, toneOf } from '../lib/format';

function Stat({ label, value, detail, to, tone }) {
  const body = (
    <>
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone ? `tone-${tone}` : ''}`}>{value}</span>
      {detail && <span className="stat-detail">{detail}</span>}
    </>
  );
  return to ? (
    <Link to={to} className="stat stat-link">
      {body}
    </Link>
  ) : (
    <div className="stat">{body}</div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user, can } = useAuth();
  const { data, status, error, reload } = useResource('/admin/dashboard');

  return (
    <div className="page">
      <PageHeader
        eyebrow={data ? formatDate(data.today, { year: true }) : ''}
        title={`${greeting()}, ${user?.name?.split(' ')[0] ?? ''}`}
        description="Today at Hillsedge at a glance."
        actions={
          can('reservations:write') && (
            <Link to="/reservations?new=1" className="btn btn-primary">
              <Icon name="plus" size={16} />
              <span>Add booking</span>
            </Link>
          )
        }
      />

      {status === 'loading' && <Skeleton rows={4} label="Loading the dashboard…" />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <>
          <section className="stats" aria-label="Key numbers">
            <Stat
              label="Today’s bookings"
              value={data.reservations.today}
              detail={`${data.reservations.guestsToday} guests expected`}
              to="/reservations?view=today"
            />
            <Stat
              label="Awaiting confirmation"
              value={data.reservations.pending}
              detail={data.reservations.pending ? 'Confirm by message' : 'All caught up'}
              tone={data.reservations.pending ? 'warn' : undefined}
              to="/reservations?view=pending"
            />
            <Stat
              label="Upcoming bookings"
              value={data.reservations.upcoming}
              detail="From today, not yet completed"
              to="/reservations?view=upcoming"
            />
            <Stat
              label="Dishes available"
              value={`${data.menu.available}/${data.menu.total}`}
              detail={`${data.menu.unavailable} unavailable · ${data.menu.soldOut} sold out`}
              to="/menu"
            />
            <Stat
              label="Spaces open"
              value={`${data.rooms.available}/${data.rooms.total}`}
              detail={`${data.rooms.occupied} occupied · ${data.rooms.unavailable} closed or coming soon`}
              to="/rooms"
            />
            <Stat
              label="Menu items without a price"
              value={data.menu.noPrice}
              detail={
                data.menu.noPrice ? 'Shown on the site with no price' : 'Every dish is priced'
              }
              tone={data.menu.noPrice ? 'warn' : undefined}
              to="/menu?filter=noprice"
            />
          </section>

          <div className="dash-grid">
            <Card title="Bookings, next 14 days" className="dash-chart">
              <BarChart data={data.days} />
            </Card>

            <Card
              title="Coming up"
              className="dash-upcoming"
              actions={
                <Link to="/reservations?view=upcoming" className="link">
                  All reservations
                </Link>
              }
            >
              {data.upcoming.length === 0 ? (
                <p className="muted card-pad">No upcoming bookings.</p>
              ) : (
                <ul className="list">
                  {data.upcoming.map((r) => (
                    <li key={r.id} className="list-row">
                      <span className="list-date">
                        <span className="list-date-day">
                          {formatDate(r.date, { weekday: false })}
                        </span>
                        <span className="list-date-time">{r.exactTime ?? r.time}</span>
                      </span>
                      <span className="list-main">
                        <span className="list-title">{r.name}</span>
                        <span className="list-sub">
                          {r.guests} {r.guests === 1 ? 'guest' : 'guests'}
                          {r.phone ? ` · ${r.phone}` : ''}
                        </span>
                      </span>
                      <Badge tone={toneOf(RESERVATION_STATUSES, r.status)}>
                        {labelOf(RESERVATION_STATUSES, r.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Most viewed dishes" className="dash-popular">
              {data.popular.length === 0 ? (
                <p className="muted card-pad">
                  Views are counted when a guest opens a dish on the menu page. Nothing yet.
                </p>
              ) : (
                <ol className="list list-ranked">
                  {data.popular.map((item, i) => (
                    <li key={item.id} className="list-row">
                      <span className="rank" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className="list-main">
                        <span className="list-title">{item.name}</span>
                        <span className="list-sub">{item.category}</span>
                      </span>
                      <span className="list-figure">
                        {item.views} <span className="muted">views</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card
              title="Recent activity"
              className="dash-activity"
              actions={
                <Link to="/activity" className="link">
                  Full log
                </Link>
              }
            >
              {data.activity.length === 0 ? (
                <p className="muted card-pad">Nothing yet.</p>
              ) : (
                <ul className="list">
                  {data.activity.map((a) => (
                    <li key={a.id} className="list-row list-row-tight">
                      <span className="list-main">
                        <span className="list-title">
                          <strong>{a.userName}</strong> {a.action} {a.entity} <em>{a.label}</em>
                        </span>
                      </span>
                      <time className="list-sub" dateTime={a.at}>
                        {timeAgo(a.at)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Shortcuts" className="dash-shortcuts">
              <div className="shortcuts">
                {can('menu:write') && (
                  <Link to="/menu?new=1" className="shortcut">
                    <Icon name="menu" />
                    <span>Add a dish</span>
                  </Link>
                )}
                {can('menu:availability') && (
                  <Link to="/menu" className="shortcut">
                    <Icon name="check" />
                    <span>Mark dishes sold out</span>
                  </Link>
                )}
                {can('media:write') && (
                  <Link to="/media" className="shortcut">
                    <Icon name="upload" />
                    <span>Upload photos</span>
                  </Link>
                )}
                {can('promotions:write') && (
                  <Link to="/promotions" className="shortcut">
                    <Icon name="promotions" />
                    <span>Post an offer</span>
                  </Link>
                )}
                {can('content:write') && (
                  <Link to="/content" className="shortcut">
                    <Icon name="content" />
                    <span>Edit opening hours</span>
                  </Link>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
