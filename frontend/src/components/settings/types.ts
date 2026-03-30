// ---------------------------------------------------------------------------
// Shared types, constants, and utilities for SettingsPage sub-components
// ---------------------------------------------------------------------------

export interface SundayEditionStatsData {
  total: number;
  withAudio: number;
  withImage: number;
  oldest: string | null;
  newest: string | null;
}

export interface AiCoverageData {
  withSummary: number;
  withTags: number;
  withImage: number;
  withTranslations: number;
  total: number;
}

export interface ArticleStats {
  totalArticles: number | null;
  totalSources: number | null;
  articlesPerSource: { source_name: string; article_count: number }[];
  articlesPerYear: { year: number; article_count: number }[];
  sundayEditionStats?: SundayEditionStatsData;
  aiCoverage?: AiCoverageData;
}

export interface Source {
  id: number;
  name: string;
  url: string;
  is_active: boolean;
  enable_ai_summary: boolean;
  enable_ai_tags: boolean;
  enable_ai_image: boolean;
  enable_ai_translations: boolean;
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method?: string;
  os_title_selector: string | null;
  os_content_selector: string | null;
  os_date_selector: string | null;
  os_author_selector: string | null;
  os_thumbnail_selector: string | null;
  os_topics_selector: string | null;
  article_link_template: string | null;
  exclude_patterns: string | null;
  scrape_after_date: string | null;
}

export interface ModalFormData {
  name: string;
  url: string;
  enable_ai_summary: boolean;
  enable_ai_tags: boolean;
  enable_ai_image: boolean;
  enable_ai_translations: boolean;
  include_selectors: string | null;
  exclude_selectors: string | null;
  scraping_method: string;
  os_title_selector: string | null;
  os_content_selector: string | null;
  os_date_selector: string | null;
  os_author_selector: string | null;
  os_thumbnail_selector: string | null;
  os_topics_selector: string | null;
  article_link_template: string | null;
  exclude_patterns: string | null;
  scrape_after_date: string | null;
}

export interface SundayEditionAdmin {
  id: number;
  title: string;
  summary: string;
  narration_url: string | null;
  image_url: string | null;
  publication_date: string;
  created_at: string;
  updated_at: string;
}

export const emptyModalForm: ModalFormData = {
  name: '',
  url: '',
  enable_ai_summary: true,
  enable_ai_tags: true,
  enable_ai_image: true,
  enable_ai_translations: true,
  include_selectors: null,
  exclude_selectors: null,
  scraping_method: 'opensource',
  os_title_selector: null,
  os_content_selector: null,
  os_date_selector: null,
  os_author_selector: null,
  os_thumbnail_selector: null,
  os_topics_selector: null,
  article_link_template: null,
  exclude_patterns: null,
  scrape_after_date: null,
};

// ---------------------------------------------------------------------------
// Cron helpers
// ---------------------------------------------------------------------------

/** Validate a 5-field cron expression. Returns null if valid, error string if not. */
export function validateCron(expr: string): string | null {
  if (!expr || !expr.trim()) return 'Cron expression is required.';
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 'Must have exactly 5 fields: minute hour day month weekday.';
  const ranges = [
    { name: 'minute',  min: 0, max: 59 },
    { name: 'hour',    min: 0, max: 23 },
    { name: 'day',     min: 1, max: 31 },
    { name: 'month',   min: 1, max: 12 },
    { name: 'weekday', min: 0, max: 7  },
  ];
  for (let i = 0; i < 5; i++) {
    const field = parts[i];
    const { name, min, max } = ranges[i];
    if (field === '*') continue;
    // */n
    if (/^\*\/\d+$/.test(field)) {
      const n = parseInt(field.slice(2));
      if (n < 1) return `${name}: step must be ≥ 1.`;
      continue;
    }
    // n-m
    if (/^\d+-\d+$/.test(field)) {
      const [a, b] = field.split('-').map(Number);
      if (a < min || b > max || a > b) return `${name}: range ${field} is out of bounds (${min}-${max}).`;
      continue;
    }
    // list: 1,2,3 or ranges in list
    if (/^[\d,]+$/.test(field)) {
      const nums = field.split(',').map(Number);
      if (nums.some(n => n < min || n > max)) return `${name}: value out of bounds (${min}-${max}).`;
      continue;
    }
    // plain number
    if (/^\d+$/.test(field)) {
      const n = parseInt(field);
      if (n < min || n > max) return `${name}: ${n} is out of bounds (${min}-${max}).`;
      continue;
    }
    return `${name}: unrecognised pattern "${field}".`;
  }
  return null;
}

/** Parse a 5-field cron expression into a human-readable string. */
export function parseCron(expr: string): string {
  if (!expr) return '';
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return '';
  const [min, hour, dom, month, dow] = parts;

  if (expr === '* * * * *') return 'Every minute';
  if (min.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(min.slice(2));
    return `Every ${n} minute${n !== 1 ? 's' : ''}`;
  }
  if (min === '0' && hour.startsWith('*/') && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(hour.slice(2));
    return `Every ${n} hour${n !== 1 ? 's' : ''}`;
  }
  if (min === '0' && hour !== '*' && dom === '*' && month === '*' && dow === '*') {
    return `Daily at ${hour.padStart(2, '0')}:00`;
  }
  if (min === '0' && hour !== '*' && dom === '*' && month === '*' && dow !== '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNames = dow.split(',').map(d => days[parseInt(d)] ?? d).join(', ');
    return `Every ${dayNames} at ${hour.padStart(2, '0')}:00`;
  }
  if (min === '0' && hour !== '*' && dom !== '*' && month === '*' && dow === '*') {
    return `Monthly on day ${dom} at ${hour.padStart(2, '0')}:00`;
  }
  // step on hour field: */n with specific minute
  if (hour.startsWith('*/') && dom === '*' && month === '*' && dow === '*') {
    const n = parseInt(hour.slice(2));
    return `Every ${n} hour${n !== 1 ? 's' : ''} at :${min.padStart(2, '0')}`;
  }
  return 'Custom schedule';
}
