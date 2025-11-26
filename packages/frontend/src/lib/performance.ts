/**
 * Performance monitoring utilities
 */

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

/**
 * Report Web Vitals metrics
 */
export function reportWebVitals(onPerfEntry?: (metric: PerformanceMetrics) => void): void {
  if (!onPerfEntry || typeof onPerfEntry !== 'function') {
    return;
  }

  // Use web-vitals library if available, otherwise use Performance API
  if ('PerformanceObserver' in window) {
    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          onPerfEntry({ fcp: entry.startTime });
        }
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      onPerfEntry({ lcp: lastEntry.startTime });
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as any;
        onPerfEntry({ fid: fidEntry.processingStart - fidEntry.startTime });
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
          onPerfEntry({ cls: clsValue });
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Time to First Byte
    if (window.performance && window.performance.timing) {
      const ttfb =
        window.performance.timing.responseStart - window.performance.timing.requestStart;
      onPerfEntry({ ttfb });
    }
  }
}

/**
 * Measure component render time
 */
export function measureRenderTime(componentName: string, callback: () => void): void {
  const startTime = performance.now();
  callback();
  const endTime = performance.now();
  const duration = endTime - startTime;

  if (duration > 16) {
    // Log slow renders (> 16ms = 60fps threshold)
    console.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
  }
}

/**
 * Mark performance milestone
 */
export function markPerformance(name: string): void {
  if (window.performance && window.performance.mark) {
    window.performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(name: string, startMark: string, endMark: string): number {
  if (window.performance && window.performance.measure) {
    window.performance.measure(name, startMark, endMark);
    const measure = window.performance.getEntriesByName(name)[0];
    return measure.duration;
  }
  return 0;
}

/**
 * Get navigation timing metrics
 */
export function getNavigationTiming(): Record<string, number> {
  if (!window.performance || !window.performance.timing) {
    return {};
  }

  const timing = window.performance.timing;
  const navigationStart = timing.navigationStart;

  return {
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    tcp: timing.connectEnd - timing.connectStart,
    request: timing.responseStart - timing.requestStart,
    response: timing.responseEnd - timing.responseStart,
    dom: timing.domComplete - timing.domLoading,
    load: timing.loadEventEnd - timing.loadEventStart,
    total: timing.loadEventEnd - navigationStart,
  };
}

/**
 * Log performance metrics to console (development only)
 */
export function logPerformanceMetrics(): void {
  if (import.meta.env.DEV) {
    reportWebVitals((metrics) => {
      console.log('Performance Metrics:', metrics);
    });

    window.addEventListener('load', () => {
      const timing = getNavigationTiming();
      console.log('Navigation Timing:', timing);
    });
  }
}

/**
 * Send performance metrics to analytics
 */
export function sendPerformanceMetrics(endpoint: string): void {
  reportWebVitals((metrics) => {
    // Send to analytics endpoint
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'web-vitals',
        metrics,
        timestamp: Date.now(),
        url: window.location.href,
      }),
    }).catch((error) => {
      console.error('Failed to send performance metrics:', error);
    });
  });
}
