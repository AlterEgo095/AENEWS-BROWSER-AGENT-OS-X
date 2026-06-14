/**
 * AENEWS Agent OS X — OpenTelemetry Tracing & Metrics Initialization
 *
 * This file MUST be imported before NestJS bootstrap (first import in main.ts).
 *
 * When OTEL_ENABLED=false, tracing is completely disabled and no SDK is started.
 */

import { NodeSDK, resources } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { trace, metrics } from '@opentelemetry/api';

// ─── Configuration ──────────────────────────────────────────────

const OTEL_ENABLED = process.env.OTEL_ENABLED !== 'false'; // default: true
const OTEL_EXPORTER_OTLP_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const OTEL_EXPORTER_PROMETHEUS_PORT = parseInt(
  process.env.OTEL_EXPORTER_PROMETHEUS_PORT || '9464',
  10,
);
const APP_ENV = process.env.APP_ENV || 'development';
const APP_VERSION = process.env.APP_VERSION || '0.1.0';

let sdk: NodeSDK | null = null;

// ─── Initialization ─────────────────────────────────────────────

if (OTEL_ENABLED) {
  try {
    // Resource identifies this service in all telemetry
    const resource = resources.resourceFromAttributes({
      [SEMRESATTRS_SERVICE_NAME]: 'aenews-agent-os-x',
      [SEMRESATTRS_SERVICE_VERSION]: APP_VERSION,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: APP_ENV,
    });

    // OTLP HTTP Trace Exporter
    const traceExporter = new OTLPTraceExporter({
      url: `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
    });

    // Prometheus Metrics Exporter — starts a standalone HTTP server on the configured port
    const prometheusExporter = new PrometheusExporter(
      {
        port: OTEL_EXPORTER_PROMETHEUS_PORT,
        endpoint: '/metrics',
      },
      () => {
        console.log(
          `📊 Prometheus metrics endpoint running on port ${OTEL_EXPORTER_PROMETHEUS_PORT}/metrics`,
        );
      },
    );

    const meterProvider = new MeterProvider({
      resource,
      readers: [prometheusExporter],
    });

    // Build the SDK
    sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [],
    });

    // Start the SDK
    sdk.start();

    // Register the MeterProvider globally so OTEL API can use it
    metrics.setGlobalMeterProvider(meterProvider);

    console.log(
      `🔍 OpenTelemetry tracing initialized — OTLP: ${OTEL_EXPORTER_OTLP_ENDPOINT}, Prometheus: :${OTEL_EXPORTER_PROMETHEUS_PORT}/metrics`,
    );

    // Graceful shutdown
    const shutdown = async () => {
      try {
        await sdk?.shutdown();
        console.log('OpenTelemetry SDK shut down gracefully');
      } catch (err) {
        console.error('Error shutting down OpenTelemetry SDK', err);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry:', error);
    // Non-fatal — the application can still run without observability
  }
} else {
  console.log('🔍 OpenTelemetry tracing is DISABLED (OTEL_ENABLED=false)');
}

// ─── Exports ────────────────────────────────────────────────────

/**
 * Returns the global tracer, or a no-op tracer when OTEL is disabled.
 */
export function getTracer(serviceName = 'aenews-agent-os-x') {
  return trace.getTracer(serviceName);
}

/**
 * Whether OpenTelemetry is currently enabled and initialized.
 */
export function isOtelEnabled(): boolean {
  return OTEL_ENABLED && sdk !== null;
}

export { sdk };
