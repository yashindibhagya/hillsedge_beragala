import { useMemo, useState } from 'react';
import { ErrorState, Icon, PageHeader, Skeleton, TextInput } from '../components/ui';
import { useResource } from '../hooks/useResource';
import { formatDate, formatDateTime } from '../lib/format';

/** The last few hundred changes, newest first, grouped by day. */
export default function Activity() {
  const { items, status, error, reload } = useResource('/admin/activity');
  const [q, setQ] = useState('');

  const days = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const groups = [];
    for (const a of items) {
      if (
        needle &&
        !`${a.userName} ${a.action} ${a.entity} ${a.label}`.toLowerCase().includes(needle)
      )
        continue;
      const day = a.at.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last?.day === day) last.items.push(a);
      else groups.push({ day, items: [a] });
    }
    return groups;
  }, [items, q]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Admin"
        title="Activity"
        description="Who changed what. The newest 300 entries are kept."
      />
      <div className="toolbar">
        <label className="toolbar-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Filter the log</span>
          <TextInput
            type="search"
            value={q}
            placeholder="Filter by person, action or item"
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      {status === 'loading' && <Skeleton rows={6} />}
      {status === 'error' && <ErrorState error={error} onRetry={reload} />}
      {status === 'ready' && days.length === 0 && <p className="muted">Nothing to show.</p>}
      {days.map((group) => (
        <section key={group.day} className="group">
          <h2 className="group-title">{formatDate(group.day, { year: true })}</h2>
          <ul className="card list">
            {group.items.map((a) => (
              <li key={a.id} className="list-row list-row-tight">
                <span className="list-main">
                  <span className="list-title">
                    <strong>{a.userName}</strong> {a.action} {a.entity}{' '}
                    {a.label && <em>{a.label}</em>}
                  </span>
                </span>
                <time className="list-sub" dateTime={a.at}>
                  {formatDateTime(a.at).split(', ').pop()}
                </time>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
