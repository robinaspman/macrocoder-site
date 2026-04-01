class ToolkitError(Exception):
    """Base toolkit error."""


class URLValidationError(ToolkitError):
    """Raised when a URL is invalid or unsafe."""


class FetchError(ToolkitError):
    """Raised when HTTP fetching fails."""


class ExtractionError(ToolkitError):
    """Raised when content extraction fails."""


class RepoProfileError(ToolkitError):
    """Raised when repo profiling fails."""


class PricingError(ToolkitError):
    """Raised when pricing cannot be computed."""


class QuoteVersionError(ToolkitError):
    """Raised when quote records cannot be handled."""
