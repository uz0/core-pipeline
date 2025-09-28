import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace, context } from '@opentelemetry/api';

export class TracingService {
  private sdk: NodeSDK;

  constructor() {
    const serviceName = process.env.OTEL_SERVICE_NAME || 'core-pipeline';
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
    const tracingEnabled = process.env.TRACING_ENABLED !== 'false';

    if (!tracingEnabled) {
      console.log('OpenTelemetry tracing is disabled');
      return;
    }

    const traceExporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      headers: {},
    });

    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      }),
    );

    this.sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        }),
      ],
    });
  }

  async start() {
    if (!this.sdk) {
      return;
    }

    try {
      await this.sdk.start();
      console.log('OpenTelemetry tracing initialized');
    } catch (error) {
      console.error('Error initializing OpenTelemetry tracing:', error);
    }
  }

  async shutdown() {
    if (!this.sdk) {
      return;
    }

    try {
      await this.sdk.shutdown();
      console.log('OpenTelemetry tracing shut down');
    } catch (error) {
      console.error('Error shutting down OpenTelemetry tracing:', error);
    }
  }

  createSpan(name: string) {
    const tracer = trace.getTracer('core-pipeline');
    return tracer.startSpan(name);
  }

  getActiveSpan() {
    return trace.getSpan(context.active());
  }
}