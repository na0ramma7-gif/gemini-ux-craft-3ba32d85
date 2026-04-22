/**
 * Accessible chart wrapper.
 *
 * Recharts renders SVG without per-series titles or a tabular fallback,
 * which means screen-reader users see "graphic" with no data. This wrapper
 * provides:
 *   - <figure> + <figcaption> with a human-readable summary
 *   - role="img" + aria-label so AT announces a meaningful name
 *   - an SR-only <table> with the underlying values for actual data access
 *
 * Visible chart UI is unchanged — purely additive.
 *
 * Round 15 — A11y deferred items from Round 11.
 */
import { ReactNode } from 'react';

interface AccessibleFigureProps {
  title: string;
  summary?: string;
  /** Header labels for the SR-only data table */
  tableHeaders: string[];
  /** Row data for the SR-only data table (already formatted strings) */
  tableRows: string[][];
  children: ReactNode;
  className?: string;
}

const AccessibleFigure = ({
  title,
  summary,
  tableHeaders,
  tableRows,
  children,
  className,
}: AccessibleFigureProps) => {
  return (
    <figure className={className} role="group" aria-label={title}>
      <div
        role="img"
        aria-label={summary ? `${title}. ${summary}` : title}
        className="w-full h-full"
      >
        {children}
      </div>

      <figcaption className="sr-only">
        {summary ? `${title}. ${summary}` : title}
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              {tableHeaders.map((h, i) => (
                <th key={i} scope="col">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) =>
                  ci === 0 ? (
                    <th key={ci} scope="row">{cell}</th>
                  ) : (
                    <td key={ci}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
};

export default AccessibleFigure;
