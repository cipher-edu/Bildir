"""
OpenTelemetry — Django auto-instrumentation + manual span'lar uchun helper.
Jaeger (OTLP) ga eksport qiladi.

Aktivlash:
    pip install opentelemetry-api opentelemetry-sdk \
                opentelemetry-instrumentation-django \
                opentelemetry-instrumentation-psycopg \
                opentelemetry-instrumentation-redis \
                opentelemetry-instrumentation-celery \
                opentelemetry-exporter-otlp

Settings.py ichida:
    from utils.telemetry import setup_otel
    setup_otel()
"""
import logging
import os

logger = logging.getLogger("eduverify.telemetry")


def setup_otel() -> None:
    """Bir marta chaqiriladi, idempotent."""
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "")
    if not endpoint:
        logger.info("OTEL_EXPORTER_OTLP_ENDPOINT yo'q — tracing o'chirilgan")
        return

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    except ImportError as e:
        logger.warning("opentelemetry paketlari o'rnatilmagan: %s", e)
        return

    service_name = os.environ.get("OTEL_SERVICE_NAME", "exam_core")
    resource = Resource.create({
        "service.name":      service_name,
        "service.namespace": "eduverify",
        "deployment.environment": os.environ.get("DJANGO_ENV", "development"),
    })

    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    # Auto-instrumentations
    try:
        from opentelemetry.instrumentation.django import DjangoInstrumentor
        DjangoInstrumentor().instrument(is_sql_commentor_enabled=True)
    except Exception as e:
        logger.warning("Django instrument xato: %s", e)

    try:
        from opentelemetry.instrumentation.psycopg import PsycopgInstrumentor
        PsycopgInstrumentor().instrument(enable_commenter=True)
    except Exception as e:
        logger.warning("Psycopg instrument xato: %s", e)

    try:
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        RedisInstrumentor().instrument()
    except Exception as e:
        logger.warning("Redis instrument xato: %s", e)

    try:
        from opentelemetry.instrumentation.celery import CeleryInstrumentor
        CeleryInstrumentor().instrument()
    except Exception as e:
        logger.warning("Celery instrument xato: %s", e)

    logger.info("OpenTelemetry tracing aktivlashtirildi (endpoint=%s)", endpoint)
