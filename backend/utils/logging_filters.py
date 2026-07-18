"""
JSON structured logging + Request ID filter
- Trace ID: OpenTelemetry trace context (agar otel ulansa) yoki uuid4
- Foydalanuvchi, sessiya kontekstini ham qo'shadi
"""
import json
import logging
import os
import socket
import time
import uuid
from contextvars import ContextVar

# Request kontekstida saqlanadigan ID — middleware tomonidan o'rnatiladi
_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
_user_id_ctx:    ContextVar[str] = ContextVar("user_id",    default="-")
_session_id_ctx: ContextVar[str] = ContextVar("session_id", default="-")


def set_request_context(request_id: str = "", user_id: str = "", session_id: str = "") -> None:
    if request_id: _request_id_ctx.set(request_id)
    if user_id:    _user_id_ctx.set(user_id)
    if session_id: _session_id_ctx.set(session_id)


def get_request_id() -> str:
    return _request_id_ctx.get()


def new_request_id() -> str:
    return uuid.uuid4().hex


class RequestIDFilter(logging.Filter):
    """LogRecord ga request_id, user_id, session_id qo'shadi."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id_ctx.get()
        record.user_id    = _user_id_ctx.get()
        record.session_id = _session_id_ctx.get()
        return True


_HOSTNAME = socket.gethostname()
_SERVICE  = os.environ.get("OTEL_SERVICE_NAME", "exam_core")


class JsonFormatter(logging.Formatter):
    """Loki/ELK uchun JSON line formatter."""

    _RESERVED = {
        "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
        "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
        "created", "msecs", "relativeCreated", "thread", "threadName",
        "processName", "process", "message", "request_id", "user_id", "session_id",
    }

    def format(self, record: logging.LogRecord) -> str:
        data = {
            "ts":         time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level":      record.levelname,
            "logger":     record.name,
            "msg":        record.getMessage(),
            "module":     record.module,
            "func":       record.funcName,
            "line":       record.lineno,
            "service":    _SERVICE,
            "host":       _HOSTNAME,
            "request_id": getattr(record, "request_id", "-"),
            "user_id":    getattr(record, "user_id",    "-"),
            "session_id": getattr(record, "session_id", "-"),
        }
        # Foydalanuvchi extra'lari
        for k, v in record.__dict__.items():
            if k not in self._RESERVED and not k.startswith("_"):
                try:
                    json.dumps(v)
                    data[k] = v
                except TypeError:
                    data[k] = str(v)

        if record.exc_info:
            data["exc"] = self.formatException(record.exc_info)
        if record.stack_info:
            data["stack"] = record.stack_info

        return json.dumps(data, ensure_ascii=False, default=str)
