"""Services package for CodeSentinel AI."""

from .file_discovery import DiscoveredFile, DiscoveryResult, discover_repository_files
from .language_detector import LanguageClassification, detect_file_language, is_known_binary_extension
from .metrics_calculator import calculate_repository_metrics
from .repository_acquisition import acquire_repository
from .repository_service import RepositoryService
from .safe_extractor import extract_tar_archive_safely, extract_zip_archive_safely
from .source_validator import ValidatedSource, validate_repository_source

__all__ = [
    "RepositoryService",
    "ValidatedSource",
    "validate_repository_source",
    "extract_tar_archive_safely",
    "extract_zip_archive_safely",
    "DiscoveredFile",
    "DiscoveryResult",
    "discover_repository_files",
    "LanguageClassification",
    "detect_file_language",
    "is_known_binary_extension",
    "calculate_repository_metrics",
    "acquire_repository",
]
