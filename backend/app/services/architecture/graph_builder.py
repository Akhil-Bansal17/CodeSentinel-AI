"""Deterministic Module Dependency Graph Builder and Coupling Metrics Engine.

Constructs directed dependency graphs from AST-extracted imports in Python,
JavaScript, and TypeScript source files. Resolves internal vs external dependencies,
detects dependency cycles using Tarjan's algorithm, and computes architectural coupling
metrics (Ca, Ce, Instability, Abstractness, Main Sequence Distance).
"""

from collections import defaultdict
from dataclasses import dataclass, field
import os
from pathlib import PurePosixPath
import sys
from typing import Any, Dict, List, Optional, Set, Tuple

from backend.app.services.analysis.parsers.base import ParseResult

# Standard library module names for Python (frozen set for fast lookup)
_PYTHON_STDLIB = frozenset(
    getattr(sys, "stdlib_module_names", {
        "abc", "argparse", "array", "ast", "asyncio", "base64", "binascii", "bisect",
        "builtins", "bz2", "calendar", "cmath", "cmd", "code", "codecs", "collections",
        "colorsys", "compileall", "concurrent", "configparser", "contextlib", "contextvars",
        "copy", "copyreg", "crypt", "csv", "ctypes", "curses", "dataclasses", "datetime",
        "dbm", "decimal", "difflib", "dis", "distutils", "doctest", "email", "encodings",
        "enum", "errno", "faulthandler", "fcntl", "filecmp", "fileinput", "fnmatch",
        "fractions", "ftplib", "functools", "gc", "getopt", "getpass", "gettext", "glob",
        "graphlib", "gzip", "hashlib", "heapq", "hmac", "html", "http", "idlelib", "imaplib",
        "imghdr", "importlib", "inspect", "io", "ipaddress", "itertools", "json", "keyword",
        "linecache", "locale", "logging", "lzma", "mailbox", "mailcap", "marshal", "math",
        "mimetypes", "mmap", "modulefinder", "multiprocessing", "netrc", "nntplib", "numbers",
        "operator", "optparse", "os", "pathlib", "pdb", "pickle", "pickletools", "pipes",
        "pkgutil", "platform", "plistlib", "poplib", "posix", "posixpath", "pprint", "profile",
        "pstats", "pty", "pwd", "py_compile", "pyclbr", "pydoc", "queue", "quopri", "random",
        "re", "readline", "reprlib", "resource", "rlcompleter", "runpy", "sched", "secrets",
        "select", "selectors", "shelve", "shlex", "shutil", "signal", "site", "smtpd",
        "smtplib", "sndhdr", "socket", "socketserver", "spwd", "sqlite3", "ssl", "stat",
        "statistics", "string", "stringprep", "struct", "subprocess", "sunau", "symbol",
        "symtable", "sys", "sysconfig", "syslog", "tabnanny", "tarfile", "telnetlib",
        "tempfile", "termios", "test", "textwrap", "threading", "time", "timeit", "tkinter",
        "token", "tokenize", "tomllib", "trace", "traceback", "tracemalloc", "tty", "turtle",
        "turtledemo", "types", "typing", "unicodedata", "unittest", "urllib", "uu", "uuid",
        "venv", "warnings", "wave", "weakref", "webbrowser", "winreg", "winsound", "wsgiref",
        "xdrlib", "xml", "xmlrpc", "zipapp", "zipfile", "zipimport", "zlib", "zoneinfo",
    })
)

# Common extensions to probe for JavaScript/TypeScript resolution
_JS_TS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"]


@dataclass
class ModuleNode:
    """Normalized module node in the codebase dependency graph."""

    path: str
    language: str
    total_lines: int = 0
    classes_count: int = 0
    abstract_classes_count: int = 0
    afferent_coupling: int = 0  # Ca: incoming internal dependencies
    efferent_coupling: int = 0  # Ce: outgoing internal dependencies
    instability: Optional[float] = None  # Ce / (Ca + Ce)
    abstractness: Optional[float] = None  # Na / Nc
    main_sequence_distance: Optional[float] = None  # |A + I - 1|


@dataclass
class DependencyEdge:
    """Directed dependency edge from source module to target module or package."""

    source_path: str
    target_path: str
    specifier: str
    line_number: int = 1
    is_external: bool = False
    is_unresolved: bool = False


@dataclass
class CycleInfo:
    """Detected dependency cycle."""

    id: str
    modules: List[str]
    length: int


@dataclass
class ModuleGraphResult:
    """Complete, deterministic result of codebase module graph analysis."""

    modules: Dict[str, ModuleNode] = field(default_factory=dict)
    internal_edges: List[DependencyEdge] = field(default_factory=list)
    external_edges: List[DependencyEdge] = field(default_factory=list)
    unresolved_edges: List[DependencyEdge] = field(default_factory=list)
    cycles: List[CycleInfo] = field(default_factory=list)
    summary: Dict[str, Any] = field(default_factory=dict)
    is_partial: bool = False


def _normalize_path(p: str) -> str:
    """Normalize path to forward-slashes and strip leading/trailing slashes."""
    return str(PurePosixPath(p.replace("\\", "/"))).lstrip("./")


def _resolve_python_import(
    source_path: str,
    specifier: str,
    module: Optional[str],
    is_from: bool,
    level: int,
    all_files: Set[str],
) -> Tuple[Optional[str], bool, bool]:
    """Resolve a Python import to (target_path, is_external, is_unresolved).

    Returns:
        target_path: normalized resolved internal file path or external package name
        is_external: True if external package or stdlib
        is_unresolved: True if cannot be resolved internally or externally
    """
    source_posix = PurePosixPath(source_path)
    source_dir = source_posix.parent

    # 1. Handle relative imports: from . import foo, from ..bar import baz
    if level > 0:
        target_dir = source_dir
        # level == 1 means same directory ('.')
        # level == 2 means parent directory ('..'), etc.
        for _ in range(level - 1):
            if target_dir != PurePosixPath("."):
                target_dir = target_dir.parent

        candidate_base = target_dir
        if module:
            candidate_base = candidate_base / module.replace(".", "/")

        # Check candidate files
        candidates = [
            f"{candidate_base}/{specifier}.py",
            f"{candidate_base}/{specifier}/__init__.py",
            f"{candidate_base}.py",
            f"{candidate_base}/__init__.py",
        ]
        for c in candidates:
            norm_c = _normalize_path(c)
            if norm_c in all_files:
                return norm_c, False, False

        # If relative import did not resolve
        return f"{candidate_base}/{specifier}", False, True

    # 2. Handle absolute imports: import a.b.c or from a.b import c
    full_spec = f"{module}.{specifier}" if (module and is_from) else specifier
    parts = full_spec.split(".")
    first_part = parts[0]

    # Check if candidate matches any file in the repository snapshot
    # Try longest match downwards
    for i in range(len(parts), 0, -1):
        prefix_path = "/".join(parts[:i])
        candidates = [
            f"{prefix_path}.py",
            f"{prefix_path}/__init__.py",
        ]
        for c in candidates:
            norm_c = _normalize_path(c)
            if norm_c in all_files:
                return norm_c, False, False

    # Also check relative to common source root prefixes if importing within package
    # e.g. source_dir is 'backend/app/services', import is 'app.models.base' or 'services.auth'
    for prefix in [source_dir, source_dir.parent, source_dir.parent.parent if source_dir.parent else None]:
        if prefix and prefix != PurePosixPath("."):
            for i in range(len(parts), 0, -1):
                prefix_path = "/".join(parts[:i])
                candidates = [
                    f"{prefix}/{prefix_path}.py",
                    f"{prefix}/{prefix_path}/__init__.py",
                ]
                for c in candidates:
                    norm_c = _normalize_path(c)
                    if norm_c in all_files:
                        return norm_c, False, False

    # Check if first_part matches an internal repository package/directory
    is_internal_pkg = any(f.startswith(f"{first_part}/") or f == f"{first_part}.py" for f in all_files)
    if is_internal_pkg:
        # Module within an internal package could not be resolved
        return full_spec, False, True

    # If first part is in Python stdlib -> external
    if first_part in _PYTHON_STDLIB:
        return first_part, True, False

    # If first part is not in snapshot and not stdlib, treat as external 3rd-party package
    return first_part, True, False



def _resolve_js_ts_import(
    source_path: str,
    specifier: str,
    all_files: Set[str],
) -> Tuple[Optional[str], bool, bool]:
    """Resolve a JavaScript/TypeScript import to (target_path, is_external, is_unresolved)."""
    # 1. Relative imports starting with ./ or ../
    if specifier.startswith("./") or specifier.startswith("../"):
        source_dir = PurePosixPath(source_path).parent
        resolved_base = source_dir / specifier

        # Normalize relative path (resolving .. and .)
        parts = []
        for p in resolved_base.parts:
            if p == ".":
                continue
            elif p == "..":
                if parts:
                    parts.pop()
            else:
                parts.append(p)
        clean_base = "/".join(parts) if parts else ""

        # Try exact match first (if extension was provided)
        if clean_base in all_files:
            return clean_base, False, False

        # Try appending extensions
        for ext in _JS_TS_EXTENSIONS:
            candidate = f"{clean_base}{ext}"
            if candidate in all_files:
                return candidate, False, False

        # Try index files inside directory
        for ext in _JS_TS_EXTENSIONS:
            candidate = f"{clean_base}/index{ext}"
            if candidate in all_files:
                return candidate, False, False

        # Could not resolve relative import
        return clean_base, False, True

    # 2. Non-relative imports
    # Check if matches exact file or alias in snapshot (e.g. 'src/components/Button')
    if specifier in all_files:
        return specifier, False, False

    for ext in _JS_TS_EXTENSIONS:
        if f"{specifier}{ext}" in all_files:
            return f"{specifier}{ext}", False, False
        if f"{specifier}/index{ext}" in all_files:
            return f"{specifier}/index{ext}", False, False

    # Otherwise it is an external package (e.g. 'react', 'lucide-react', 'express')
    # Strip subpaths for package identification: '@testing-library/react' -> '@testing-library/react'
    if specifier.startswith("@"):
        pkg_parts = specifier.split("/")
        pkg_name = "/".join(pkg_parts[:2]) if len(pkg_parts) >= 2 else specifier
    else:
        pkg_name = specifier.split("/")[0]

    return pkg_name, True, False


def _tarjan_scc(nodes: List[str], adj: Dict[str, Set[str]]) -> List[List[str]]:
    """Deterministic Tarjan's Strongly Connected Components algorithm.

    Returns list of strongly connected components with > 1 node (or 1 node with self loop).
    Sorted deterministically.
    """
    index = 0
    indices: Dict[str, int] = {}
    lowlink: Dict[str, int] = {}
    on_stack: Dict[str, bool] = {}
    stack: List[str] = []
    sccs: List[List[str]] = []

    sorted_nodes = sorted(nodes)

    def strongconnect(v: str):
        nonlocal index
        indices[v] = index
        lowlink[v] = index
        index += 1
        stack.append(v)
        on_stack[v] = True

        for w in sorted(adj.get(v, set())):
            if w not in indices:
                strongconnect(w)
                lowlink[v] = min(lowlink[v], lowlink[w])
            elif on_stack.get(w, False):
                lowlink[v] = min(lowlink[v], indices[w])

        if lowlink[v] == indices[v]:
            scc = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                scc.append(w)
                if w == v:
                    break
            # Cycle exists if >1 nodes or 1 node with self-loop
            if len(scc) > 1 or (len(scc) == 1 and v in adj.get(v, set())):
                scc.sort()
                sccs.append(scc)

    for node in sorted_nodes:
        if node not in indices:
            strongconnect(node)

    # Sort SCCs deterministically by length descending, then by first node name
    sccs.sort(key=lambda s: (-len(s), s[0]))
    return sccs


class DependencyGraphBuilder:
    """Builds and analyzes module dependency graphs and coupling metrics."""

    MAX_NODES_LIMIT = 5000
    MAX_EDGES_LIMIT = 25000

    @classmethod
    def build_graph(
        cls,
        parsed_files: List[ParseResult],
        all_snapshot_files: Optional[Set[str]] = None,
    ) -> ModuleGraphResult:
        """Construct the complete module dependency graph from parsed files."""
        result = ModuleGraphResult()

        if all_snapshot_files is None:
            all_snapshot_files = {p.relative_path for p in parsed_files}

        norm_snapshot_files = {_normalize_path(p) for p in all_snapshot_files}

        # Initialize module nodes
        for pf in parsed_files:
            norm_path = _normalize_path(pf.relative_path)
            classes_count = len(pf.classes)
            abstract_classes_count = sum(1 for c in pf.classes if c.is_abstract)

            abstractness: Optional[float] = None
            if classes_count > 0:
                abstractness = round(abstract_classes_count / classes_count, 4)

            result.modules[norm_path] = ModuleNode(
                path=norm_path,
                language=pf.language,
                total_lines=pf.total_lines,
                classes_count=classes_count,
                abstract_classes_count=abstract_classes_count,
                abstractness=abstractness,
            )

        # Adjacency tracking for coupling and cycles: source -> set of targets
        internal_adj: Dict[str, Set[str]] = defaultdict(set)
        # Reverse adjacency for afferent coupling: target -> set of sources
        reverse_adj: Dict[str, Set[str]] = defaultdict(set)

        seen_edges: Set[Tuple[str, str, str]] = set()

        # Extract and resolve edges
        for pf in parsed_files:
            source_path = _normalize_path(pf.relative_path)
            lang = pf.language.lower()

            for imp in pf.imports:
                if len(result.internal_edges) + len(result.external_edges) >= cls.MAX_EDGES_LIMIT:
                    result.is_partial = True
                    break

                target: Optional[str] = None
                is_external = False
                is_unresolved = False

                if lang == "python":
                    target, is_external, is_unresolved = _resolve_python_import(
                        source_path=source_path,
                        specifier=imp.name,
                        module=imp.module,
                        is_from=imp.is_from,
                        level=imp.level,
                        all_files=norm_snapshot_files,
                    )
                elif lang in ("javascript", "typescript"):
                    spec = imp.module or imp.name
                    target, is_external, is_unresolved = _resolve_js_ts_import(
                        source_path=source_path,
                        specifier=spec,
                        all_files=norm_snapshot_files,
                    )
                else:
                    target = imp.name
                    is_unresolved = True

                if not target:
                    continue

                edge_key = (source_path, target, imp.name)
                if edge_key in seen_edges:
                    continue
                seen_edges.add(edge_key)

                edge = DependencyEdge(
                    source_path=source_path,
                    target_path=target,
                    specifier=imp.name,
                    line_number=imp.coordinates.start_line,
                    is_external=is_external,
                    is_unresolved=is_unresolved,
                )

                if is_unresolved:
                    result.unresolved_edges.append(edge)
                elif is_external:
                    result.external_edges.append(edge)
                else:
                    # Internal dependency
                    result.internal_edges.append(edge)
                    internal_adj[source_path].add(target)
                    reverse_adj[target].add(source_path)

        # Calculate coupling metrics for all module nodes
        for path, node in result.modules.items():
            ce = len(internal_adj.get(path, set()))
            ca = len(reverse_adj.get(path, set()))
            node.efferent_coupling = ce
            node.afferent_coupling = ca

            # Instability: Ce / (Ca + Ce)
            if ca + ce > 0:
                node.instability = round(ce / (ca + ce), 4)
            else:
                node.instability = None

            # Main Sequence Distance: |A + I - 1|
            if node.abstractness is not None and node.instability is not None:
                node.main_sequence_distance = round(abs(node.abstractness + node.instability - 1.0), 4)
            else:
                node.main_sequence_distance = None

        # Detect cycles using Tarjan's SCC
        sccs = _tarjan_scc(list(result.modules.keys()), internal_adj)
        for idx, scc in enumerate(sccs, start=1):
            result.cycles.append(
                CycleInfo(
                    id=f"cycle-{idx}",
                    modules=scc,
                    length=len(scc),
                )
            )

        # Build comprehensive summary metrics
        total_modules = len(result.modules)
        internal_count = len(result.internal_edges)
        external_count = len(result.external_edges)
        unresolved_count = len(result.unresolved_edges)
        cycles_count = len(result.cycles)

        top_afferent = sorted(
            result.modules.values(),
            key=lambda m: (-m.afferent_coupling, m.path),
        )[:10]

        top_efferent = sorted(
            result.modules.values(),
            key=lambda m: (-m.efferent_coupling, m.path),
        )[:10]

        isolated_modules = [m.path for m in result.modules.values() if m.afferent_coupling == 0 and m.efferent_coupling == 0]

        result.summary = {
            "total_modules": total_modules,
            "internal_edges_count": internal_count,
            "external_dependencies_count": external_count,
            "unresolved_imports_count": unresolved_count,
            "cycles_count": cycles_count,
            "isolated_modules_count": len(isolated_modules),
            "top_afferent_modules": [
                {"path": m.path, "ca": m.afferent_coupling, "ce": m.efferent_coupling, "instability": m.instability}
                for m in top_afferent if m.afferent_coupling > 0
            ],
            "top_efferent_modules": [
                {"path": m.path, "ca": m.afferent_coupling, "ce": m.efferent_coupling, "instability": m.instability}
                for m in top_efferent if m.efferent_coupling > 0
            ],
            "is_partial": result.is_partial,
        }

        return result
