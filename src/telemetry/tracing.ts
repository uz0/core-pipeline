import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace } from '@opentelemetry/api';

export function initTracing() {
  const serviceName = process.env.OTEL_SERVICE_NAME || 'core-pipeline';
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
  const tracingEnabled = process.env.TRACING_ENABLED !== 'false';

  if (!tracingEnabled) {
    console.log('OpenTelemetry tracing disabled');
    return null;
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'development',
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
    headers: {},
  });

  const sdk = new NodeSDK({
    resource,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-http': {
          requestHook: (span) => {
            span.setAttribute('http.request.body', '{}');
          },
        },
      }),
    ],
    spanProcessor: new BatchSpanProcessor(traceExporter),
  });

  sdk.start();
  console.log(`OpenTelemetry tracing initialized for ${serviceName}`);

  return trace.getTracer(serviceName);
}
