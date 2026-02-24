/**
 * Consistent year-over-year color mapping for all enrollment charts.
 *
 * Colors are defined as CSS custom properties in index.css so they
 * adapt to light/dark mode automatically.
 *
 *   2023-24  →  Red
 *   2024-25  →  Orange
 *   2025-26  →  Green
 *   2026-27  →  Blue   (current year)
 */

const YEAR_COLOR_MAP: Record<string, string> = {
  '2023-24': 'var(--year-2023-24)',
  '2024-25': 'var(--year-2024-25)',
  '2025-26': 'var(--year-2025-26)',
  '2026-27': 'var(--year-2026-27)',
};

const DEFAULT_COLOR = 'var(--year-default)';

/** Return the CSS color value for a school year string. */
export function getYearColor(year: string): string {
  return YEAR_COLOR_MAP[year] ?? DEFAULT_COLOR;
}
