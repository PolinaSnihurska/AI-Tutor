// Monitoring types and interfaces

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail';
      message?: string;
      responseTime?: number;
    };
  };
}

export interface MetricLabels {
  [key: string]: string | number;
}

export interface CustomMetric {
  name: string;
  value: number;
  labels?: MetricLabels;
  timestamp?: Date;
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}
