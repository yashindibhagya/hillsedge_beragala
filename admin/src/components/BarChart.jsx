import { useEffect, useId, useRef, useState } from 'react';
import { formatDate } from '../lib/format';

/*
 * One series, so no legend: the card title says what is plotted. The bar
 * colour is an olive one step more saturated than the brand's --olive-600,
 * which the palette validator flags as reading grey at chart scale; this one
 * passes lightness, chroma and 3:1 contrast against white.
 */
const BAR = '#5c7a2a';

/** Round the axis top up to a clean number so ticks land on whole values. */
function niceMax(value) {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s * 4 >= value);
  return step * 4;
}

/**
 * Bookings per day, as columns.
 *
 * Thin columns with a rounded data end and a square baseline; the hover
 * target is the whole day's slot, not just the bar, so a zero day is as
 * hoverable as a busy one. Only the busiest day carries a value label —
 * the axis, the tooltip and the table carry the rest. "Show as table"
 * gives the same numbers without the chart.
 */
export function BarChart({
  data,
  valueKey = 'bookings',
  secondaryKey = 'guests',
  label = 'Bookings',
  secondaryLabel = 'guests',
}) {
  const [active, setActive] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();

  // Drawn at the container's real pixel width rather than scaled, so the
  // axis text stays legible on a phone instead of shrinking with the plot.
  const plotRef = useRef(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const node = plotRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, Math.round(entry.contentRect.width)))
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [asTable]);
  const height = 220;
  const pad = { top: 22, right: 8, bottom: 30, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(0, ...data.map((d) => d[valueKey])));
  const slot = innerW / data.length;
  const barW = Math.min(24, slot * 0.6);
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const peak = data.reduce(
    (best, d, i) => (d[valueKey] > (data[best]?.[valueKey] ?? -1) ? i : best),
    0
  );
  const y = (v) => pad.top + innerH - (v / max) * innerH;

  const total = data.reduce((s, d) => s + d[valueKey], 0);

  return (
    <figure className="chart" aria-labelledby={titleId}>
      <figcaption id={titleId} className="sr-only">
        {label} per day for the next {data.length} days: {total} in total.
      </figcaption>
      <div className="chart-tools">
        <button
          type="button"
          className="link"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
        >
          {asTable ? 'Show as chart' : 'Show as table'}
        </button>
      </div>

      {asTable ? (
        <div className="table-scroll">
          <table className="table table-compact">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col" className="num">
                  {label}
                </th>
                <th scope="col" className="num">
                  Guests
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date}>
                  <th scope="row">{formatDate(d.date)}</th>
                  <td className="num">{d[valueKey]}</td>
                  <td className="num">{d[secondaryKey]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-plot" ref={plotRef} onMouseLeave={() => setActive(null)}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-labelledby={titleId}
            width={width}
            height={height}
            className="chart-svg"
          >
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y(t)}
                  y2={y(t)}
                  className="chart-grid"
                />
                <text
                  x={pad.left - 8}
                  y={y(t)}
                  className="chart-tick"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {Number.isInteger(t) ? t : ''}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = pad.left + slot * i + slot / 2;
              const value = d[valueKey];
              const h = (value / max) * innerH;
              const r = Math.min(4, h);
              const x = cx - barW / 2;
              const top = pad.top + innerH - h;
              // Rounded top, square baseline.
              const path =
                h > 0
                  ? `M${x},${pad.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${pad.top + innerH} Z`
                  : '';
              const showDay = slot >= 34 || i % 2 === 0;
              return (
                <g key={d.date}>
                  {path && (
                    <path
                      d={path}
                      fill={BAR}
                      opacity={active === null || active === i ? 1 : 0.45}
                    />
                  )}
                  {i === peak && value > 0 && (
                    <text x={cx} y={top - 6} className="chart-value" textAnchor="middle">
                      {value}
                    </text>
                  )}
                  {showDay && (
                    <text x={cx} y={height - 10} className="chart-tick" textAnchor="middle">
                      {i === 0 ? 'Today' : formatDate(d.date, { weekday: false }).split(' ')[0]}
                    </text>
                  )}
                  <rect
                    x={pad.left + slot * i}
                    y={pad.top}
                    width={slot}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    tabIndex={0}
                    aria-label={`${formatDate(d.date)}: ${value} ${label.toLowerCase()}, ${d[secondaryKey]} ${secondaryLabel}`}
                  />
                </g>
              );
            })}
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={pad.top + innerH}
              y2={pad.top + innerH}
              className="chart-axis"
            />
          </svg>
          {active !== null && (
            <div
              className="chart-tooltip"
              style={{ left: `${((pad.left + slot * active + slot / 2) / width) * 100}%` }}
              role="presentation"
            >
              <strong>{formatDate(data[active].date)}</strong>
              <span>
                {data[active][valueKey]} {label.toLowerCase()} · {data[active][secondaryKey]}{' '}
                {secondaryLabel}
              </span>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}

export default BarChart;
