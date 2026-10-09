"""Deterministic language detection and file classification service for CodeSentinel AI.

Uses explicit extension mappings, compound extension matching, and known filename rules.
Strictly deterministic without heuristic or LLM guessing.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Set, Tuple


@dataclass(frozen=True)
class LanguageClassification:
    """Deterministic classification result for a repository file."""

    language: str
    category: str  # "source", "configuration", "documentation", "data", "other"
    is_source_file: bool


# Exact filename matches (case-sensitive or normalized)
EXACT_FILENAME_MAP: Dict[str, Tuple[str, str, bool]] = {
    "dockerfile": ("Dockerfile", "source", True),
    "containerfile": ("Dockerfile", "source", True),
    "makefile": ("Makefile", "source", True),
    "gnumakefile": ("Makefile", "source", True),
    "gemfile": ("Ruby", "source", True),
    "rakefile": ("Ruby", "source", True),
    "vagrantfile": ("Ruby", "source", True),
    "procfile": ("Configuration", "configuration", False),
    "jenkinsfile": ("Groovy", "source", True),
    "cmakelists.txt": ("CMake", "configuration", False),
    "license": ("Text", "documentation", False),
    "licence": ("Text", "documentation", False),
    "copying": ("Text", "documentation", False),
    "readme": ("Text", "documentation", False),
    "authors": ("Text", "documentation", False),
    "contributing": ("Text", "documentation", False),
    "changelog": ("Text", "documentation", False),
}

# Compound extensions (checked first before single extension)
COMPOUND_EXTENSION_MAP: Dict[str, Tuple[str, str, bool]] = {
    ".d.ts": ("TypeScript", "source", True),
    ".d.mts": ("TypeScript", "source", True),
    ".d.cts": ("TypeScript", "source", True),
    ".test.ts": ("TypeScript", "source", True),
    ".test.tsx": ("TypeScript", "source", True),
    ".test.js": ("JavaScript", "source", True),
    ".test.jsx": ("JavaScript", "source", True),
    ".spec.ts": ("TypeScript", "source", True),
    ".spec.tsx": ("TypeScript", "source", True),
    ".spec.js": ("JavaScript", "source", True),
    ".spec.jsx": ("JavaScript", "source", True),
    ".blade.php": ("PHP", "source", True),
    ".tar.gz": ("Archive", "other", False),
    ".tar.bz2": ("Archive", "other", False),
    ".tar.xz": ("Archive", "other", False),
}

# Standard single file extensions
EXTENSION_MAP: Dict[str, Tuple[str, str, bool]] = {
    # Programming Languages (Source)
    ".py": ("Python", "source", True),
    ".pyw": ("Python", "source", True),
    ".pyi": ("Python", "source", True),
    ".js": ("JavaScript", "source", True),
    ".mjs": ("JavaScript", "source", True),
    ".cjs": ("JavaScript", "source", True),
    ".jsx": ("JavaScript", "source", True),
    ".ts": ("TypeScript", "source", True),
    ".mts": ("TypeScript", "source", True),
    ".cts": ("TypeScript", "source", True),
    ".tsx": ("TypeScript", "source", True),
    ".java": ("Java", "source", True),
    ".c": ("C", "source", True),
    ".h": ("C", "source", True),
    ".cpp": ("C++", "source", True),
    ".cc": ("C++", "source", True),
    ".cxx": ("C++", "source", True),
    ".hpp": ("C++", "source", True),
    ".hh": ("C++", "source", True),
    ".hxx": ("C++", "source", True),
    ".cs": ("C#", "source", True),
    ".go": ("Go", "source", True),
    ".rs": ("Rust", "source", True),
    ".rb": ("Ruby", "source", True),
    ".php": ("PHP", "source", True),
    ".kt": ("Kotlin", "source", True),
    ".kts": ("Kotlin", "source", True),
    ".swift": ("Swift", "source", True),
    ".dart": ("Dart", "source", True),
    ".scala": ("Scala", "source", True),
    ".sc": ("Scala", "source", True),
    ".sh": ("Shell", "source", True),
    ".bash": ("Shell", "source", True),
    ".zsh": ("Shell", "source", True),
    ".ps1": ("PowerShell", "source", True),
    ".psm1": ("PowerShell", "source", True),
    ".psd1": ("PowerShell", "source", True),
    ".sql": ("SQL", "source", True),
    ".html": ("HTML", "source", True),
    ".htm": ("HTML", "source", True),
    ".css": ("CSS", "source", True),
    ".scss": ("SCSS", "source", True),
    ".sass": ("Sass", "source", True),
    ".less": ("Less", "source", True),
    ".vue": ("Vue", "source", True),
    ".svelte": ("Svelte", "source", True),
    ".lua": ("Lua", "source", True),
    ".r": ("R", "source", True),
    ".pl": ("Perl", "source", True),
    ".pm": ("Perl", "source", True),
    ".ex": ("Elixir", "source", True),
    ".exs": ("Elixir", "source", True),
    ".erl": ("Erlang", "source", True),
    ".hrl": ("Erlang", "source", True),
    ".clj": ("Clojure", "source", True),
    ".cljs": ("Clojure", "source", True),
    ".hs": ("Haskell", "source", True),
    ".lhs": ("Haskell", "source", True),
    ".proto": ("Protocol Buffer", "source", True),
    ".graphql": ("GraphQL", "source", True),
    ".gql": ("GraphQL", "source", True),
    # Configuration
    ".json": ("JSON", "configuration", False),
    ".json5": ("JSON", "configuration", False),
    ".jsonc": ("JSON", "configuration", False),
    ".yaml": ("YAML", "configuration", False),
    ".yml": ("YAML", "configuration", False),
    ".toml": ("TOML", "configuration", False),
    ".xml": ("XML", "configuration", False),
    ".ini": ("INI", "configuration", False),
    ".cfg": ("Config", "configuration", False),
    ".conf": ("Config", "configuration", False),
    ".properties": ("Properties", "configuration", False),
    ".editorconfig": ("EditorConfig", "configuration", False),
    ".gitattributes": ("Git Attributes", "configuration", False),
    # Documentation
    ".md": ("Markdown", "documentation", False),
    ".markdown": ("Markdown", "documentation", False),
    ".mdown": ("Markdown", "documentation", False),
    ".rst": ("reStructuredText", "documentation", False),
    ".adoc": ("AsciiDoc", "documentation", False),
    ".txt": ("Plain Text", "documentation", False),
    ".pdf": ("PDF", "documentation", False),
    # Data
    ".csv": ("CSV", "data", False),
    ".tsv": ("TSV", "data", False),
    ".parquet": ("Parquet", "data", False),
    ".sqlite": ("SQLite", "data", False),
    ".db": ("Database", "data", False),
    # Binary / Media / Build artifacts
    ".png": ("PNG Image", "other", False),
    ".jpg": ("JPEG Image", "other", False),
    ".jpeg": ("JPEG Image", "other", False),
    ".gif": ("GIF Image", "other", False),
    ".svg": ("SVG Image", "other", False),
    ".ico": ("Icon", "other", False),
    ".woff": ("Font", "other", False),
    ".woff2": ("Font", "other", False),
    ".ttf": ("Font", "other", False),
    ".eot": ("Font", "other", False),
    ".zip": ("Zip Archive", "other", False),
    ".gz": ("Gzip Archive", "other", False),
    ".tar": ("Tar Archive", "other", False),
    ".exe": ("Executable", "other", False),
    ".dll": ("Library", "other", False),
    ".so": ("Library", "other", False),
    ".dylib": ("Library", "other", False),
    ".pyc": ("Python Bytecode", "other", False),
    ".wasm": ("WebAssembly", "other", False),
}

# Known binary extensions
KNOWN_BINARY_EXTENSIONS: Set[str] = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".bmp", ".tiff",
    ".pdf", ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
    ".exe", ".dll", ".so", ".dylib", ".bin", ".o", ".a", ".lib",
    ".class", ".pyc", ".pyo", ".wasm",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".mp3", ".mp4", ".avi", ".mov", ".flv", ".wav",
    ".sqlite", ".db", ".parquet",
}


def detect_file_language(file_path: str) -> LanguageClassification:
    """Deterministically classify a file based on its filename and extension."""
    path_obj = Path(file_path)
    filename = path_obj.name
    filename_lower = filename.lower()

    # 1. Exact filename match (e.g. Dockerfile, Makefile, Gemfile)
    if filename_lower in EXACT_FILENAME_MAP:
        lang, cat, is_src = EXACT_FILENAME_MAP[filename_lower]
        return LanguageClassification(language=lang, category=cat, is_source_file=is_src)

    # 2. Compound extension match (e.g. .d.ts, .test.tsx)
    for compound_ext, (lang, cat, is_src) in COMPOUND_EXTENSION_MAP.items():
        if filename_lower.endswith(compound_ext):
            return LanguageClassification(language=lang, category=cat, is_source_file=is_src)

    # 3. Single extension match (e.g. .py, .ts, .json)
    ext = path_obj.suffix.lower()
    if ext in EXTENSION_MAP:
        lang, cat, is_src = EXTENSION_MAP[ext]
        return LanguageClassification(language=lang, category=cat, is_source_file=is_src)

    # 4. Unknown extension
    return LanguageClassification(
        language="Unknown",
        category="other",
        is_source_file=False,
    )


def is_known_binary_extension(file_path: str) -> bool:
    """Check if the file has an extension known to be binary."""
    ext = Path(file_path).suffix.lower()
    return ext in KNOWN_BINARY_EXTENSIONS
