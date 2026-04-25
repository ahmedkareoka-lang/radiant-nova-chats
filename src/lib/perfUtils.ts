import React from "react";

// 🎯 Utility functions for performance optimization

/**
 * Debounce: تأخير تنفيذ الدالة حتى يتوقف المستخدم عن الكتابة/التفاعل
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle: تحديد معدل تنفيذ الدالة (مثلاً: مرة كل 200مللي)
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Memoize: تخزين نتائج الدوال المكلفة لتجنب إعادة الحساب
 */
export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string,
): ((...args: Parameters<T>) => ReturnType<T>) => {
  const cache = new Map<string, ReturnType<T>>();

  return (...args: Parameters<T>): ReturnType<T> => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Lazy load component with prefetch support
 */
export const lazyWithPrefetch = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
) => {
  const Component = React.lazy(importFunc);
  return {
    Component,
    prefetch: () => importFunc(), // تحميل مسبق عند الحاجة
  };
};

/**
 * Measure performance of async operations
 */
export const measurePerformance = async <T,>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (import.meta.env.DEV) {
    console.log(`⏱️ [${label}] completed in ${duration.toFixed(2)}ms`);
  }
  return { result, duration };
};
