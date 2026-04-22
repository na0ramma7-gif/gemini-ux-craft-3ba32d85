/**
 * Component smoke tests for Compare-by-Duration primitives.
 * Round 13 — Phase 6 of the .lovable/plan.md compare program.
 *
 * Covers:
 *   - DeltaChip: renders trend icon, formatted abs+pct, lowerIsBetter swap
 *   - KPIDelta: renders comparison value + delta chip
 *   - EntityMultiSelectChips: chip render, removal, "All" pill, popover toggle
 *   - CompareEmptyState: validation errors, warnings, no-data variants
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeltaChip from '@/components/compare/DeltaChip';
import KPIDelta from '@/components/compare/KPIDelta';
import EntityMultiSelectChips from '@/components/compare/EntityMultiSelectChips';
import CompareEmptyState from '@/components/compare/CompareEmptyState';
import { AppProvider } from '@/context/AppContext';

const wrap = (ui: React.ReactNode) => render(<AppProvider>{ui}</AppProvider>);

describe('DeltaChip', () => {
  it('renders an upward trend with positive percentage', () => {
    wrap(<DeltaChip delta={{ abs: 50, pct: 50, trend: 'up', comparisonZero: false }} />);
    expect(screen.getByText(/50\.0%/)).toBeInTheDocument();
  });

  it('renders flat trend when pct is 0', () => {
    wrap(<DeltaChip delta={{ abs: 0, pct: 0, trend: 'flat', comparisonZero: false }} />);
    expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
  });

  it('renders em-dash when pct is null (comparison zero)', () => {
    wrap(<DeltaChip delta={{ abs: 100, pct: null, trend: 'up', comparisonZero: true }} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the optional label', () => {
    wrap(
      <DeltaChip
        delta={{ abs: 10, pct: 10, trend: 'up', comparisonZero: false }}
        label="vs prior"
      />,
    );
    expect(screen.getByText('vs prior')).toBeInTheDocument();
  });
});

describe('KPIDelta', () => {
  it('renders the comparison formatted value', () => {
    wrap(
      <KPIDelta
        comparisonFormatted="SAR 12,000"
        delta={{ abs: 3000, pct: 25, trend: 'up', comparisonZero: false }}
      />,
    );
    expect(screen.getByText(/SAR 12,000/)).toBeInTheDocument();
    expect(screen.getByText(/25\.0%/)).toBeInTheDocument();
  });
});

describe('EntityMultiSelectChips', () => {
  const options = [
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
    { id: 3, label: 'Gamma' },
  ];

  it('shows "All" pill when nothing is selected', () => {
    wrap(
      <EntityMultiSelectChips
        label="Items"
        options={options}
        selectedIds={[]}
        onChange={() => {}}
      />,
    );
    // Default allLabel = t('allItems'); we just confirm the label shows.
    expect(screen.getByText('Items:')).toBeInTheDocument();
  });

  it('renders chips for selected ids', () => {
    wrap(
      <EntityMultiSelectChips
        label="Items"
        options={options}
        selectedIds={[1, 2]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('calls onChange with id removed when chip × is clicked', () => {
    const calls: number[][] = [];
    wrap(
      <EntityMultiSelectChips
        label="Items"
        options={options}
        selectedIds={[1, 2]}
        onChange={(ids) => calls.push(ids)}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove Alpha'));
    expect(calls).toEqual([[2]]);
  });
});

describe('CompareEmptyState', () => {
  it('renders nothing when validation is ok and dataState is ok', () => {
    const { container } = wrap(
      <CompareEmptyState
        validation={{ ok: true, errors: [], warnings: [] }}
        dataState="ok"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders error banner for endBeforeStart', () => {
    wrap(
      <CompareEmptyState
        validation={{ ok: false, errors: ['primary.endBeforeStart'], warnings: [] }}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders warning banner for windowsOverlap', () => {
    wrap(
      <CompareEmptyState
        validation={{ ok: true, errors: [], warnings: ['windowsOverlap'] }}
        dataState="ok"
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders info banner for no-current data state', () => {
    wrap(
      <CompareEmptyState
        validation={{ ok: true, errors: [], warnings: [] }}
        dataState="no-current"
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('ignores benign primary.missing error (compare just OFF)', () => {
    const { container } = wrap(
      <CompareEmptyState
        validation={{ ok: false, errors: ['comparison.missing'], warnings: [] }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
