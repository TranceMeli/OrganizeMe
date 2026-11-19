import { describe, expect, it } from 'vitest'
import { formatLongDate } from '@/utils/date'

describe('formatLongDate', () => {
  it('returns an empty string when there is no date', () => {
    expect(formatLongDate('')).toBe('')
    expect(formatLongDate(undefined)).toBe('')
    expect(formatLongDate(null)).toBe('')
  })

  it('writes the weekday and a numeric date in US order', () => {
    expect(formatLongDate('2026-11-17T12:00:00')).toBe('Tuesday, 11/17/2026')
  })

  it('pads day and month to two digits', () => {
    expect(formatLongDate('2026-05-08T12:00:00')).toBe('Friday, 05/08/2026')
  })
})
