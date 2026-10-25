import { describe, expect, it } from 'vitest';

import { formatPublishedDate } from '@features/catalogue/format';

describe('catalogue presentation formatting', () => {
  it('formats an authored ISO date in French without a timezone shift', () => {
    expect(formatPublishedDate('2024-04-11')).toBe('11 avril 2024');
  });
});
