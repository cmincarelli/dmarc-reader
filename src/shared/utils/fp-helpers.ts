/**
 * Functional Programming Helper Functions
 *
 * Utility functions for functional programming patterns used throughout the app.
 */

// ============================================================================
// Function Composition
// ============================================================================

/**
 * Composes functions from right to left
 * @example compose(f, g, h)(x) === f(g(h(x)))
 */
export const compose = <T>(...fns: Array<(arg: T) => T>) => {
  return (value: T): T => {
    return fns.reduceRight((acc, fn) => fn(acc), value);
  };
};

/**
 * Pipes functions from left to right
 * @example pipe(f, g, h)(x) === h(g(f(x)))
 */
export const pipe = <T>(...fns: Array<(arg: T) => T>) => {
  return (value: T): T => {
    return fns.reduce((acc, fn) => fn(acc), value);
  };
};

// ============================================================================
// Array Helpers
// ============================================================================

/**
 * Groups array elements by a key function
 * @pure
 */
export const groupBy = <T, K extends string | number>(
  array: readonly T[],
  keyFn: (item: T) => K
): Map<K, readonly T[]> => {
  const groups = new Map<K, T[]>();

  array.forEach((item) => {
    const key = keyFn(item);
    const existing = groups.get(key) || [];
    groups.set(key, [...existing, item]);
  });

  // Convert to readonly
  return new Map(Array.from(groups.entries()).map(([key, items]) => [key, items as readonly T[]]));
};

/**
 * Counts occurrences of each unique value
 * @pure
 */
export const countBy = <T, K extends string | number>(
  array: readonly T[],
  keyFn: (item: T) => K
): Map<K, number> => {
  const counts = new Map<K, number>();

  array.forEach((item) => {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return counts;
};

/**
 * Removes duplicate values from an array
 * @pure
 */
export const unique = <T>(array: readonly T[]): readonly T[] => {
  return Array.from(new Set(array));
};

/**
 * Sums values in an array
 * @pure
 */
export const sum = (numbers: readonly number[]): number => {
  return numbers.reduce((total, n) => total + n, 0);
};

/**
 * Calculates average of values in an array
 * @pure
 */
export const average = (numbers: readonly number[]): number => {
  if (numbers.length === 0) return 0;
  return sum(numbers) / numbers.length;
};

/**
 * Sorts array without mutation
 * @pure
 */
export const sortBy = <T>(array: readonly T[], compareFn: (a: T, b: T) => number): readonly T[] => {
  return [...array].sort(compareFn);
};

/**
 * Takes first n elements
 * @pure
 */
export const take = <T>(array: readonly T[], n: number): readonly T[] => {
  return array.slice(0, n);
};

/**
 * Partitions array into two based on predicate
 * @pure
 */
export const partition = <T>(
  array: readonly T[],
  predicate: (item: T) => boolean
): readonly [readonly T[], readonly T[]] => {
  const pass: T[] = [];
  const fail: T[] = [];

  array.forEach((item) => {
    if (predicate(item)) {
      pass.push(item);
    } else {
      fail.push(item);
    }
  });

  return [pass, fail];
};

// ============================================================================
// Object Helpers
// ============================================================================

/**
 * Picks specified keys from an object
 * @pure
 */
export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

/**
 * Omits specified keys from an object
 * @pure
 */
export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result;
};

// ============================================================================
// Functional Utilities
// ============================================================================

/**
 * Identity function (returns input unchanged)
 * @pure
 */
export const identity = <T>(value: T): T => value;

/**
 * Always returns the same value
 * @pure
 */
export const constant =
  <T>(value: T) =>
  (): T =>
    value;

/**
 * Negates a predicate function
 * @pure
 */
export const not = <T>(predicate: (value: T) => boolean) => {
  return (value: T): boolean => !predicate(value);
};

/**
 * Checks if value is not null or undefined
 * @pure
 */
export const isNotNullish = <T>(value: T | null | undefined): value is T => {
  return value != null;
};

/**
 * Safely accesses nested property
 * @pure
 */
export const get = <T, K extends keyof T>(obj: T, key: K): T[K] | undefined => {
  return obj?.[key];
};

// ============================================================================
// Memoization
// ============================================================================

/**
 * Simple memoization for pure functions with single argument
 * @pure
 */
export const memoize = <T, R>(fn: (arg: T) => R): ((arg: T) => R) => {
  const cache = new Map<T, R>();

  return (arg: T): R => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }

    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Checks if value is a string
 */
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

/**
 * Checks if value is a number
 */
export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !Number.isNaN(value);
};

/**
 * Checks if value is an array
 */
export const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

/**
 * Checks if value is an object
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};
