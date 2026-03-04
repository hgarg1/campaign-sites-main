/**
 * Performance Monitoring Utilities
 * Tracks page load times, API response times, and component rendering performance
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
  type: 'navigation' | 'api' | 'component' | 'custom';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private markMap: Map<string, number> = new Map();

  /**
   * Mark the start of a performance measurement
   */
  startMeasure(name: string): void {
    this.markMap.set(name, performance.now());
  }

  /**
   * End the measurement and record the metric
   */
  endMeasure(name: string, type: PerformanceMetric['type'] = 'custom'): number {
    const startTime = this.markMap.get(name);
    if (!startTime) {
      console.warn(`No start mark found for ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: new Date().toISOString(),
      type,
    };

    this.metrics.push(metric);
    this.markMap.delete(name);

    // Log slow operations
    if (this.isSlow(duration, type)) {
      console.warn(`⚠️ Slow ${type}: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Check if a metric duration is slower than expected
   */
  private isSlow(duration: number, type: PerformanceMetric['type']): boolean {
    const thresholds = {
      navigation: 2000,
      api: 500,
      component: 500,
      custom: 1000,
    };

    return duration > thresholds[type];
  }

  /**
   * Record an API call
   */
  recordApiCall(endpoint: string, duration: number, success: boolean): void {
    const metric: PerformanceMetric = {
      name: `API: ${endpoint}`,
      duration,
      timestamp: new Date().toISOString(),
      type: 'api',
    };

    this.metrics.push(metric);

    if (duration > 500) {
      console.warn(`⚠️ Slow API call: ${endpoint} took ${duration.toFixed(2)}ms`);
    }

    // Track failures
    if (!success) {
      console.error(`❌ API Error: ${endpoint}`);
    }
  }

  /**
   * Get average duration for metric name prefix
   */
  getAverageDuration(prefix: string): number {
    const matching = this.metrics.filter((m) => m.name.startsWith(prefix));
    if (matching.length === 0) return 0;

    const sum = matching.reduce((acc, m) => acc + m.duration, 0);
    return sum / matching.length;
  }

  /**
   * Get performance summary
   */
  getSummary() {
    return {
      totalMetrics: this.metrics.length,
      totalDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0),
      averageComponentTime: this.getAverageDuration('component'),
      averageApiTime: this.getAverageDuration('API'),
      slowMetrics: this.metrics.filter((m) => {
        const thresholds = { navigation: 2000, api: 500, component: 500, custom: 1000 };
        return m.duration > thresholds[m.type];
      }),
    };
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
    this.markMap.clear();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React Hook for component performance tracking
 */
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now();

  return {
    mark: (name: string) => performanceMonitor.startMeasure(`${componentName}:${name}`),
    finish: (name: string) => {
      const duration = performanceMonitor.endMeasure(`${componentName}:${name}`, 'component');
      return duration;
    },
    getSummary: () => performanceMonitor.getSummary(),
  };
}

/**
 * Fetch wrapper that tracks API performance
 */
export async function fetchWithMetrics(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const startTime = performance.now();

  try {
    const response = await fetch(url, options);
    const duration = performance.now() - startTime;

    performanceMonitor.recordApiCall(url, duration, response.ok);

    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.recordApiCall(url, duration, false);
    throw error;
  }
}
