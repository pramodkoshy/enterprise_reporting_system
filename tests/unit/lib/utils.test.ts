import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDuration,
  parseQueryParams,
  buildQueryString,
  debounce,
  throttle,
  deepClone,
  deepMerge,
  pick,
  omit,
  groupBy,
  uniqueBy,
  chunk,
  sleep,
  retry,
  memoize,
  truncate,
  slugify,
  isValidEmail,
  isValidUrl,
  generateId,
  hashString,
} from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn (classnames)', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
    });

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle objects', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('should handle mixed inputs', () => {
      expect(cn('base', ['array'], { object: true })).toBe('base array object');
    });

    it('should merge Tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });

    it('should handle undefined and null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('should handle empty strings', () => {
      expect(cn('foo', '', 'bar')).toBe('foo bar');
    });
  });

  describe('formatDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2024-03-15');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/Mar.*15.*2024/);
    });

    it('should format date string', () => {
      const formatted = formatDate('2024-03-15');
      expect(formatted).toMatch(/Mar.*15.*2024/);
    });

    it('should handle custom format', () => {
      const date = new Date('2024-03-15');
      const formatted = formatDate(date, 'yyyy-MM-dd');
      expect(formatted).toBe('2024-03-15');
    });

    it('should handle invalid date', () => {
      const formatted = formatDate('invalid');
      expect(formatted).toBe('Invalid Date');
    });

    it('should handle null/undefined', () => {
      expect(formatDate(null as unknown as Date)).toBe('-');
      expect(formatDate(undefined as unknown as Date)).toBe('-');
    });
  });

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const date = new Date('2024-03-15T14:30:00');
      const formatted = formatDateTime(date);
      expect(formatted).toMatch(/Mar.*15.*2024/);
      expect(formatted).toMatch(/2:30|14:30/);
    });

    it('should handle timezone', () => {
      const date = new Date('2024-03-15T14:30:00Z');
      const formatted = formatDateTime(date);
      expect(formatted).toBeDefined();
    });
  });

  describe('formatCurrency', () => {
    it('should format USD by default', () => {
      const formatted = formatCurrency(1234.56);
      expect(formatted).toMatch(/\$1,234\.56/);
    });

    it('should format with custom currency', () => {
      const formatted = formatCurrency(1234.56, 'EUR');
      expect(formatted).toMatch(/€|EUR/);
    });

    it('should handle negative numbers', () => {
      const formatted = formatCurrency(-1234.56);
      expect(formatted).toMatch(/-?\$1,234\.56/);
    });

    it('should handle zero', () => {
      const formatted = formatCurrency(0);
      expect(formatted).toMatch(/\$0\.00/);
    });

    it('should handle large numbers', () => {
      const formatted = formatCurrency(1234567890.12);
      expect(formatted).toMatch(/1,234,567,890\.12/);
    });
  });

  describe('formatNumber', () => {
    it('should format with thousand separators', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('should format with decimals', () => {
      expect(formatNumber(1234.567, 2)).toBe('1,234.57');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1234)).toBe('-1,234');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatPercentage', () => {
    it('should format as percentage', () => {
      expect(formatPercentage(0.25)).toBe('25%');
    });

    it('should handle decimals', () => {
      expect(formatPercentage(0.256, 1)).toBe('25.6%');
    });

    it('should handle values > 1', () => {
      expect(formatPercentage(1.5)).toBe('150%');
    });

    it('should handle negative values', () => {
      expect(formatPercentage(-0.1)).toBe('-10%');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(5000)).toBe('5.00s');
    });

    it('should format minutes', () => {
      expect(formatDuration(120000)).toBe('2m 0s');
    });

    it('should format hours', () => {
      expect(formatDuration(3661000)).toBe('1h 1m 1s');
    });
  });

  describe('parseQueryParams', () => {
    it('should parse query string', () => {
      const params = parseQueryParams('?foo=bar&baz=qux');
      expect(params).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should handle encoded values', () => {
      const params = parseQueryParams('?name=John%20Doe');
      expect(params.name).toBe('John Doe');
    });

    it('should handle array values', () => {
      const params = parseQueryParams('?tags=a&tags=b&tags=c');
      expect(params.tags).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty string', () => {
      const params = parseQueryParams('');
      expect(params).toEqual({});
    });

    it('should handle values with equals sign', () => {
      const params = parseQueryParams('?expr=a=b');
      expect(params.expr).toBe('a=b');
    });
  });

  describe('buildQueryString', () => {
    it('should build query string from object', () => {
      const qs = buildQueryString({ foo: 'bar', baz: 'qux' });
      expect(qs).toBe('foo=bar&baz=qux');
    });

    it('should encode special characters', () => {
      const qs = buildQueryString({ name: 'John Doe' });
      expect(qs).toBe('name=John%20Doe');
    });

    it('should handle arrays', () => {
      const qs = buildQueryString({ tags: ['a', 'b'] });
      expect(qs).toBe('tags=a&tags=b');
    });

    it('should skip undefined/null values', () => {
      const qs = buildQueryString({ a: 'value', b: undefined, c: null });
      expect(qs).toBe('a=value');
    });

    it('should handle empty object', () => {
      const qs = buildQueryString({});
      expect(qs).toBe('');
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      let callCount = 0;
      const fn = debounce(() => callCount++, 100);

      fn();
      fn();
      fn();

      expect(callCount).toBe(0);
      await sleep(150);
      expect(callCount).toBe(1);
    });

    it('should pass arguments to debounced function', async () => {
      let lastArg: unknown;
      const fn = debounce((arg: unknown) => { lastArg = arg; }, 50);

      fn('first');
      fn('second');
      fn('third');

      await sleep(100);
      expect(lastArg).toBe('third');
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', async () => {
      let callCount = 0;
      const fn = throttle(() => callCount++, 100);

      fn();
      fn();
      fn();

      expect(callCount).toBe(1);
      await sleep(150);
      fn();
      expect(callCount).toBe(2);
    });
  });

  describe('deepClone', () => {
    it('should clone simple objects', () => {
      const obj = { a: 1, b: 2 };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    it('should clone nested objects', () => {
      const obj = { a: { b: { c: 1 } } };
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned.a).not.toBe(obj.a);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, { a: 3 }];
      const cloned = deepClone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it('should handle null', () => {
      expect(deepClone(null)).toBeNull();
    });

    it('should handle primitives', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
    });
  });

  describe('deepMerge', () => {
    it('should merge simple objects', () => {
      const result = deepMerge({ a: 1 }, { b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should override values', () => {
      const result = deepMerge({ a: 1 }, { a: 2 });
      expect(result).toEqual({ a: 2 });
    });

    it('should merge nested objects', () => {
      const result = deepMerge(
        { a: { b: 1, c: 2 } },
        { a: { b: 3 } }
      );
      expect(result).toEqual({ a: { b: 3, c: 2 } });
    });

    it('should handle arrays by replacement', () => {
      const result = deepMerge({ a: [1, 2] }, { a: [3, 4] });
      expect(result).toEqual({ a: [3, 4] });
    });

    it('should merge multiple objects', () => {
      const result = deepMerge({ a: 1 }, { b: 2 }, { c: 3 });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('pick', () => {
    it('should pick specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(pick(obj, ['a', 'b'])).toEqual({ a: 1, b: 2 });
    });

    it('should handle missing keys', () => {
      const obj = { a: 1 };
      expect(pick(obj, ['a', 'b' as keyof typeof obj])).toEqual({ a: 1 });
    });

    it('should return empty object for empty keys', () => {
      const obj = { a: 1, b: 2 };
      expect(pick(obj, [])).toEqual({});
    });
  });

  describe('omit', () => {
    it('should omit specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(omit(obj, ['c'])).toEqual({ a: 1, b: 2 });
    });

    it('should handle missing keys', () => {
      const obj = { a: 1 };
      expect(omit(obj, ['b' as keyof typeof obj])).toEqual({ a: 1 });
    });

    it('should return copy for empty keys', () => {
      const obj = { a: 1, b: 2 };
      expect(omit(obj, [])).toEqual({ a: 1, b: 2 });
    });
  });

  describe('groupBy', () => {
    it('should group by key', () => {
      const items = [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 },
      ];
      const grouped = groupBy(items, 'type');
      expect(grouped.a).toHaveLength(2);
      expect(grouped.b).toHaveLength(1);
    });

    it('should group by function', () => {
      const items = [1, 2, 3, 4, 5];
      const grouped = groupBy(items, (n) => (n % 2 === 0 ? 'even' : 'odd'));
      expect(grouped.even).toEqual([2, 4]);
      expect(grouped.odd).toEqual([1, 3, 5]);
    });

    it('should handle empty array', () => {
      expect(groupBy([], 'key')).toEqual({});
    });
  });

  describe('uniqueBy', () => {
    it('should remove duplicates by key', () => {
      const items = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 1, name: 'c' },
      ];
      const unique = uniqueBy(items, 'id');
      expect(unique).toHaveLength(2);
      expect(unique[0].name).toBe('a'); // First occurrence kept
    });

    it('should handle function selector', () => {
      const items = ['apple', 'apricot', 'banana'];
      const unique = uniqueBy(items, (s) => s[0]);
      expect(unique).toHaveLength(2);
    });
  });

  describe('chunk', () => {
    it('should split array into chunks', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(chunk(arr, 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle exact division', () => {
      const arr = [1, 2, 3, 4];
      expect(chunk(arr, 2)).toEqual([[1, 2], [3, 4]]);
    });

    it('should handle empty array', () => {
      expect(chunk([], 2)).toEqual([]);
    });

    it('should handle size larger than array', () => {
      expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
    });
  });

  describe('sleep', () => {
    it('should delay for specified time', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('retry', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) throw new Error('fail');
        return 'success';
      };

      const result = await retry(fn, { maxAttempts: 5, delay: 10 });
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max attempts', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('always fails');
      };

      await expect(retry(fn, { maxAttempts: 3, delay: 10 })).rejects.toThrow('always fails');
      expect(attempts).toBe(3);
    });

    it('should succeed on first try', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        return 'success';
      };

      const result = await retry(fn, { maxAttempts: 3 });
      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });
  });

  describe('memoize', () => {
    it('should cache function results', () => {
      let callCount = 0;
      const fn = (n: number) => {
        callCount++;
        return n * 2;
      };

      const memoized = memoize(fn);
      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(callCount).toBe(1);
    });

    it('should handle different arguments', () => {
      let callCount = 0;
      const fn = (n: number) => {
        callCount++;
        return n * 2;
      };

      const memoized = memoize(fn);
      expect(memoized(5)).toBe(10);
      expect(memoized(10)).toBe(20);
      expect(callCount).toBe(2);
    });

    it('should use custom key function', () => {
      const fn = (obj: { id: number }) => obj.id * 2;
      const memoized = memoize(fn, (obj) => obj.id.toString());

      expect(memoized({ id: 5 })).toBe(10);
      expect(memoized({ id: 5 })).toBe(10); // Same key, cached
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should use custom suffix', () => {
      expect(truncate('Hello World', 5, '---')).toBe('Hello---');
    });

    it('should handle empty string', () => {
      expect(truncate('', 5)).toBe('');
    });
  });

  describe('slugify', () => {
    it('should convert to lowercase slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should replace special characters', () => {
      expect(slugify('Hello & Goodbye!')).toBe('hello-goodbye');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello    World')).toBe('hello-world');
    });

    it('should handle numbers', () => {
      expect(slugify('Product 123')).toBe('product-123');
    });

    it('should trim dashes', () => {
      expect(slugify(' Hello World ')).toBe('hello-world');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate IDs of specified length', () => {
      expect(generateId(10).length).toBe(10);
      expect(generateId(32).length).toBe(32);
    });

    it('should contain only alphanumeric characters', () => {
      const id = generateId();
      expect(/^[a-z0-9]+$/i.test(id)).toBe(true);
    });
  });

  describe('hashString', () => {
    it('should generate consistent hash', () => {
      const str = 'test string';
      expect(hashString(str)).toBe(hashString(str));
    });

    it('should generate different hashes for different strings', () => {
      expect(hashString('string1')).not.toBe(hashString('string2'));
    });

    it('should handle empty string', () => {
      expect(hashString('')).toBeDefined();
    });

    it('should handle unicode', () => {
      expect(hashString('你好')).toBeDefined();
    });
  });
});
