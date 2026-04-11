"""Centralized logging configuration for the application.

This module provides a custom logging setup that can be extended with multiple handlers
such as console output, file logging, Sentry, or other logging services.
"""

import json
import logging
import sys
from logging import LogRecord
from typing import Any

from typing_extensions import override


class ColoredFormatter(logging.Formatter):
    """Custom formatter that adds colors to log output for better readability."""

    # ANSI color codes for log levels
    LEVEL_COLORS = {
        "DEBUG": "\033[36m",  # Cyan
        "INFO": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "CRITICAL": "\033[35m",  # Magenta
    }

    # ANSI color codes for logger names (bright/bold versions for better distinction)
    NAME_COLORS = [
        "\033[94m",  # Bright Blue
        "\033[96m",  # Bright Cyan
        "\033[95m",  # Bright Magenta
        "\033[93m",  # Bright Yellow
        "\033[92m",  # Bright Green
        "\033[91m",  # Bright Red
        "\033[35m",  # Magenta
        "\033[34m",  # Blue
        "\033[33m",  # Yellow
    ]

    RESET = "\033[0m"
    GRAY = "\033[90m"  # Gray for timestamps

    @override
    def format(self, record: LogRecord) -> str:
        # Choose a consistent color for the logger name based on hash
        name_color = self.NAME_COLORS[hash(record.name) % len(self.NAME_COLORS)]

        # Get level color
        level_color = self.LEVEL_COLORS.get(record.levelname, "")

        # Format with colors
        colored_time = f"{self.GRAY}%(asctime)s{self.RESET}"
        colored_name = f"{name_color}%(name)s{self.RESET}"
        colored_level = f"{level_color}%(levelname)s{self.RESET}"
        colored_message = f"{level_color}%(message)s{self.RESET}"

        # Create a temporary formatter with colored format
        temp_format = (
            f"{colored_time} - {colored_name} - {colored_level} - {colored_message}"
        )
        temp_formatter = logging.Formatter(temp_format, datefmt="%H:%M:%S")

        return temp_formatter.format(record)


class PlainFormatter(logging.Formatter):
    """Plain text formatter without colors (for file logging, Sentry, etc.)."""

    def __init__(self):
        super().__init__(
            fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )


class Filter200Logs(logging.Filter):
    """Filter out HTTP 200 status code logs to reduce noise."""

    @override
    def filter(self, record: LogRecord):
        return "200" not in record.getMessage()


def setup_logging(level: int = logging.INFO):
    """Configure application logging with multiple handlers.

    This function sets up:
    - Console handler with colored output
    - Optional file handler (uncomment to enable)
    - Optional Sentry handler (uncomment and configure to enable)

    Args:
        level: The logging level (default: logging.INFO)
    """
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()

    # 1. Console Handler (colored output)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(ColoredFormatter())
    root_logger.addHandler(console_handler)

    # 2. File Handler (uncomment to enable)
    # Logs to a file with plain text formatting (no colors)
    # file_handler = logging.FileHandler("app.log")
    # file_handler.setFormatter(PlainFormatter())
    # root_logger.addHandler(file_handler)

    # 3. Sentry Handler (uncomment and configure to enable)
    # Requires: pip install sentry-sdk
    # import sentry_sdk
    # from sentry_sdk.integrations.logging import LoggingIntegration
    #
    # sentry_logging = LoggingIntegration(
    #     level=logging.INFO,        # Capture info and above as breadcrumbs
    #     event_level=logging.ERROR  # Send errors and above as events
    # )
    # sentry_sdk.init(
    #     dsn="your-sentry-dsn-here",
    #     integrations=[sentry_logging],
    # )

    # Configure specific loggers
    logging.getLogger("reminder.reminder_checker").setLevel(logging.WARNING)
    logging.getLogger("db.db_service").setLevel(logging.WARNING)
    logging.getLogger("apn.apn_service").setLevel(logging.WARNING)
    logging.getLogger("auth.auth_dependencies").setLevel(logging.WARNING)

    # Filter out HTTP 200 logs from uvicorn
    logging.getLogger("uvicorn.access").addFilter(Filter200Logs())

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the given name.

    This is a convenience function that returns a logger with the proper configuration.

    Args:
        name: The name of the logger (usually __name__)

    Returns:
        A configured logger instance
    """
    return logging.getLogger(name)


class MyLogger:
    """Custom logger with filtering and structured attributes support.

    Features:
    - Filter logs by logger name (allowlist/blocklist)
    - Add structured attributes to logs
    - Context-aware logging
    - Different behavior for debug/verbose vs production logs
    - Support for logging database records and other structured data
    """

    # Class-level configuration
    allowed_console_contexts: list[str] = []
    ignored_console_contexts: list[str] = []
    include_default_attributes_for_debug: bool = False
    show_records: bool = True  # Show/hide record objects in logs

    def __init__(self, context: str | None = None):
        """Initialize logger with optional context.

        Args:
            context: Logger context (usually module name or class name)
        """
        self.context = context
        self.logger = logging.getLogger(context or "app")

    def _should_log_to_console(self) -> bool:
        """Check if this logger should output to console based on filters.

        Returns:
            True if logs should be output to console, False otherwise
        """
        # If this context is explicitly ignored, don't log
        if self.context and self.context in self.ignored_console_contexts:
            return False

        # If no allowlist is set, log everything (except ignored)
        if not self.allowed_console_contexts:
            return True

        # If allowlist is set, only log if context is in the list
        return self.context in self.allowed_console_contexts if self.context else False

    def _serialize_value(self, value: Any) -> Any:
        """Serialize a value for JSON logging.

        Handles Pydantic models, database records, and other complex objects.

        Args:
            value: Value to serialize

        Returns:
            JSON-serializable value
        """
        # Handle Pydantic models
        if hasattr(value, "model_dump"):
            return value.model_dump()

        # Handle database row objects (psycopg2 RealDictRow, etc.)
        if hasattr(value, "_asdict"):
            return dict(value._asdict())

        # Handle dict-like objects
        if hasattr(value, "items") and callable(value.items):
            return dict(value.items())

        # Handle lists/tuples
        if isinstance(value, (list, tuple)):
            return [self._serialize_value(item) for item in value]

        # Default: convert to string
        return str(value)

    def _format_attributes(self, attributes: dict[str, Any] | None) -> str:
        """Format attributes as colored JSON string.

        Args:
            attributes: Dictionary of attributes to format

        Returns:
            Formatted string with ANSI color codes
        """
        if not attributes or not attributes:
            return ""

        # Serialize complex objects
        serialized = {}
        for key, value in attributes.items():
            serialized[key] = self._serialize_value(value)

        formatted = "\n" + json.dumps(serialized, indent=2, default=str)
        # Add cyan color to attributes
        return "\033[36m" + formatted + "\033[0m"

    def _add_default_attributes(
        self, attributes: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Add default context attributes to the log.

        Args:
            attributes: Existing attributes dictionary

        Returns:
            Dictionary with default attributes added
        """
        if attributes is None:
            attributes = {}

        if self.context:
            attributes["context"] = self.context

        # Add user context (can be extended with actual user info)
        # attributes.update(self._get_user_context())

        return attributes

    def _get_user_context(self) -> dict[str, Any]:
        """Get current user context for logging.

        Override this method to add user-specific information to logs.

        Returns:
            Dictionary with user context
        """
        # Example: return {"user_id": current_user.id}
        return {}

    def info(self, message: str, attributes: dict[str, Any] | None = None):
        """Log info message with optional attributes.

        Args:
            message: Log message
            attributes: Optional structured attributes
        """
        if not self._should_log_to_console():
            return

        attrs = self._add_default_attributes(attributes)
        self.logger.info(message + self._format_attributes(attrs))

    def error(self, message: str, attributes: dict[str, Any] | None = None):
        """Log error message with optional attributes.

        Args:
            message: Log message
            attributes: Optional structured attributes
        """
        attrs = self._add_default_attributes(attributes)
        self.logger.error(message + self._format_attributes(attrs))

    def warning(self, message: str, attributes: dict[str, Any] | None = None):
        """Log warning message with optional attributes.

        Args:
            message: Log message
            attributes: Optional structured attributes
        """
        attrs = self._add_default_attributes(attributes)
        self.logger.warning(message + self._format_attributes(attrs))

    def debug(self, message: str, attributes: dict[str, Any] | None = None):
        """Log debug message with optional attributes.

        Debug messages are not sent to Sentry (for future integration).

        Args:
            message: Log message
            attributes: Optional structured attributes
        """
        if not self._should_log_to_console():
            return

        final_attrs = (
            self._add_default_attributes(attributes)
            if self.include_default_attributes_for_debug
            else attributes
        )

        if final_attrs:
            self.logger.debug(message + self._format_attributes(final_attrs))
        else:
            self.logger.debug(message)

    def critical(self, message: str, attributes: dict[str, Any] | None = None):
        """Log critical message with optional attributes.

        Args:
            message: Log message
            attributes: Optional structured attributes
        """
        attrs = self._add_default_attributes(attributes)
        self.logger.critical(message + self._format_attributes(attrs))

    def info_with_record(
        self,
        message: str,
        record: Any,
        attributes: dict[str, Any] | None = None,
    ):
        """Log info message with a database record or model object.

        Args:
            message: Log message
            record: Database record, Pydantic model, or any object to log
            attributes: Optional additional structured attributes
        """
        if not self._should_log_to_console():
            return

        if not self.show_records:
            # If records are hidden, just log the message without the record
            attrs = self._add_default_attributes(attributes)
            self.logger.info(message + self._format_attributes(attrs))
            return

        # Combine record with attributes
        combined_attrs = attributes.copy() if attributes else {}
        combined_attrs["record"] = record

        attrs = self._add_default_attributes(combined_attrs)
        self.logger.info(message + self._format_attributes(attrs))

    def error_with_record(
        self,
        message: str,
        record: Any,
        attributes: dict[str, Any] | None = None,
    ):
        """Log error message with a database record or model object.

        Args:
            message: Log message
            record: Database record, Pydantic model, or any object to log
            attributes: Optional additional structured attributes
        """
        if not self.show_records:
            # If records are hidden, just log the message without the record
            attrs = self._add_default_attributes(attributes)
            self.logger.error(message + self._format_attributes(attrs))
            return

        # Combine record with attributes
        combined_attrs = attributes.copy() if attributes else {}
        combined_attrs["record"] = record

        attrs = self._add_default_attributes(combined_attrs)
        self.logger.error(message + self._format_attributes(attrs))

    def debug_with_record(
        self,
        message: str,
        record: Any,
        attributes: dict[str, Any] | None = None,
    ):
        """Log debug message with a database record or model object.

        Args:
            message: Log message
            record: Database record, Pydantic model, or any object to log
            attributes: Optional additional structured attributes
        """
        if not self._should_log_to_console():
            return

        if not self.show_records:
            # If records are hidden, just log the message without the record
            final_attrs = (
                self._add_default_attributes(attributes)
                if self.include_default_attributes_for_debug
                else attributes
            )
            if final_attrs:
                self.logger.debug(message + self._format_attributes(final_attrs))
            else:
                self.logger.debug(message)
            return

        # Combine record with attributes
        combined_attrs = attributes.copy() if attributes else {}
        combined_attrs["record"] = record

        final_attrs = (
            self._add_default_attributes(combined_attrs)
            if self.include_default_attributes_for_debug
            else combined_attrs
        )

        self.logger.debug(message + self._format_attributes(final_attrs))


# Convenience function to create a logger instance
def create_logger(context: str | None = None) -> MyLogger:
    """Create a MyLogger instance with the given context.

    Args:
        context: Logger context (usually __name__)

    Returns:
        A configured MyLogger instance

    Example:
        logger = create_logger(__name__)
        logger.info("User logged in", {"user_id": "123", "ip": "192.168.1.1"})
    """
    return MyLogger(context)
