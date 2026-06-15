/**
 * AENEWS Agent OS X — Tracing & Metering Decorators
 *
 * @Trace() — Auto-traces a method execution with an OpenTelemetry span.
 *            Creates a span, records exceptions, and sets attributes.
 *
 * @Meter() — Auto-records execution duration in a Prometheus histogram
 *            via the MetricsService.
 *
 * Usage:
 *   @Trace('agent.decompose')
 *   async decompose(mission: Mission): Promise<Subtask[]> { ... }
 *
 *   @Meter('aenews_agent_execution_duration_seconds', { cluster: 'coding' })
 *   async execute(plan: ExecutionPlan): Promise<ExecutionResult[]> { ... }
 */

import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { isOtelEnabled } from '../tracing';

// ─── @Trace Decorator ───────────────────────────────────────────

/**
 * Method decorator that creates an OpenTelemetry span around the method execution.
 * When OTEL is disabled, the method runs without any tracing overhead.
 *
 * @param name - Optional span name. Defaults to `ClassName.methodName`.
 */
export function Trace(name?: string): MethodDecorator {
  return function (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className =
      (_target as any).constructor?.name || 'Unknown';
    const spanName = name || `${className}.${String(propertyKey)}`;

    descriptor.value = async function (...args: any[]) {
      if (!isOtelEnabled()) {
        return originalMethod.apply(this, args);
      }

      const tracer = trace.getTracer('aenews-agent-os-x');
      const span: Span = tracer.startSpan(spanName);

      return context.with(trace.setSpan(context.active(), span), async () => {
        try {
          // Set class and method attributes
          span.setAttribute('code.function', String(propertyKey));
          span.setAttribute('code.namespace', className);

          const result = await originalMethod.apply(this, args);

          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error: any) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error?.message || 'Unknown error',
          });
          span.recordException(error);
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}

// ─── @Meter Decorator ───────────────────────────────────────────

/**
 * Method decorator that records execution duration as a Prometheus metric.
 * Uses the MetricsService (injected on the class) to record the duration.
 *
 * @param metricName - The histogram metric name to record against.
 * @param labels - Optional static labels to attach to the metric.
 */
export function Meter(
  metricName: string,
  labels?: Record<string, string>,
): MethodDecorator {
  return function (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);

        // Try to record metric via MetricsService if available
        (this as any)?.['metricsService']?.recordPipelineStep?.(
          metricName,
          Date.now() - startTime,
          true,
          labels,
        );

        return result;
      } catch (error: any) {
        // Record failed execution
        (this as any)?.['metricsService']?.recordPipelineStep?.(
          metricName,
          Date.now() - startTime,
          false,
          labels,
        );

        throw error;
      }
    };

    return descriptor;
  };
}
