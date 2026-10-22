import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict

# Regex patterns to detect and mask common secret patterns in logs
SENSITIVE_PATTERNS = [
    (re.compile(r"(password|token|secret|api_key|apikey|private_key|authorization)\s*[:=]\s*['\"]?([^'\",\s]+)['\"]?", re.IGNORECASE), r"\1=******"),
    (re.compile(r"(://[^:\s/]+):([^@\s/]+)@", re.IGNORECASE), r"\1:******@"),
    (re.compile(r"(Bearer\s+)([A-Za-z0-9_\-\.]+)", re.IGNORECASE), r"\1******"),
]


def sanitize_log_text(text: str) -> str:
    """Sanitize sensitive credentials, passwords, tokens, and URIs from text."""
    if not isinstance(text, str):
        return text
    result = text
    for pattern, replacement in SENSITIVE_PATTERNS:
        result = pattern.sub(replacement, result)
    return result


class SensitiveDataFilter(logging.Filter):
    """Filter that masks passwords, tokens, connection secrets, and authorization headers from log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = sanitize_log_text(record.msg)
        if record.args:
            cleaned_args = []
            for arg in record.args if isinstance(record.args, tuple) else [record.args]:
                if isinstance(arg, str):
                    arg = sanitize_log_text(arg)
                cleaned_args.append(arg)
            record.args = tuple(cleaned_args)
        return True



class JSONFormatter(logging.Formatter):
    """Formats log records as structured single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Include custom extra fields if present
        extra_fields = {
            k: v
            for k, v in record.__dict__.items()
            if k
            not in {
                "name",
                "msg",
                "args",
                "levelname",
                "levelno",
                "pathname",
                "filename",
                "module",
                "exc_info",
                "exc_text",
                "stack_info",
                "lineno",
                "funcName",
                "created",
                "msecs",
                "relativeCreated",
                "thread",
                "threadName",
                "processName",
                "process",
                "message",
            }
        }
        if extra_fields:
            log_entry["context"] = extra_fields

        return json.dumps(log_entry)


def setup_logging(log_level: str = "INFO", log_format: str = "json") -> None:
    """Configure structured logging for the application."""
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level.upper())

    # Clear existing handlers to prevent duplicate lines
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.addFilter(SensitiveDataFilter())

    if log_format.lower() == "json":
        console_handler.setFormatter(JSONFormatter())
    else:
        text_formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        console_handler.setFormatter(text_formatter)

    root_logger.addHandler(console_handler)

    # Set external libraries to appropriate log levels to reduce noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


logger = logging.getLogger("codesentinel")
