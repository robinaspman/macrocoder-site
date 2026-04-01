class ToolkitError(Exception):
    """Base toolkit error."""


class ProjectScanError(ToolkitError):
    """Raised when a project cannot be scanned safely."""


class ParseError(ToolkitError):
    """Raised when a file or payload cannot be parsed."""


class ExportError(ToolkitError):
    """Raised when export or transmission fails."""


class SecurityIssue(ToolkitError):
    """Raised when a security condition blocks an operation."""
