"""Deterministic repository metrics calculation service for CodeSentinel AI.

Calculates exact, verified metrics exclusively from discovered files.
Never injects synthetic or speculative metrics.
"""

from collections import defaultdict
from typing import Any, Dict, List
from backend.app.services.file_discovery import DiscoveredFile, DiscoveryResult


def calculate_repository_metrics(discovery: DiscoveryResult) -> Dict[str, Any]:
    """Calculate deterministic repository metrics from discovery results."""
    files: List[DiscoveredFile] = discovery.files

    total_files = len(files)
    source_files = 0
    total_loc = 0
    total_size = 0

    # Aggregations
    lang_stats: Dict[str, Dict[str, int]] = defaultdict(lambda: {"file_count": 0, "size_bytes": 0, "lines_of_code": 0})
    category_stats: Dict[str, Dict[str, int]] = defaultdict(lambda: {"file_count": 0, "size_bytes": 0, "lines_of_code": 0})
    top_level_dirs: Dict[str, Dict[str, int]] = defaultdict(lambda: {"file_count": 0, "size_bytes": 0})

    for f in files:
        total_size += f.size_bytes
        if f.is_source_file:
            source_files += 1

        loc = f.line_count or 0
        total_loc += loc

        # Language aggregation
        lang_stats[f.language]["file_count"] += 1
        lang_stats[f.language]["size_bytes"] += f.size_bytes
        lang_stats[f.language]["lines_of_code"] += loc

        # Category aggregation
        category_stats[f.category]["file_count"] += 1
        category_stats[f.category]["size_bytes"] += f.size_bytes
        category_stats[f.category]["lines_of_code"] += loc

        # Top-level directory aggregation
        parts = f.relative_path.split("/")
        if len(parts) > 1:
            top_dir = parts[0]
            top_level_dirs[top_dir]["file_count"] += 1
            top_level_dirs[top_dir]["size_bytes"] += f.size_bytes
        else:
            top_level_dirs["/ (root)"]["file_count"] += 1
            top_level_dirs["/ (root)"]["size_bytes"] += f.size_bytes

    # Compute language distribution with percentages
    # Sort deterministically: highest file_count desc, then language name asc
    language_distribution: Dict[str, Any] = {}
    sorted_langs = sorted(
        lang_stats.items(),
        key=lambda item: (-item[1]["file_count"], -item[1]["size_bytes"], item[0]),
    )

    for lang, stats in sorted_langs:
        pct = round((stats["file_count"] / total_files * 100), 2) if total_files > 0 else 0.0
        language_distribution[lang] = {
            "file_count": stats["file_count"],
            "size_bytes": stats["size_bytes"],
            "lines_of_code": stats["lines_of_code"],
            "percentage": pct,
        }

    # Deterministic category distribution
    category_distribution = {
        cat: {
            "file_count": stats["file_count"],
            "size_bytes": stats["size_bytes"],
            "lines_of_code": stats["lines_of_code"],
        }
        for cat, stats in sorted(category_stats.items(), key=lambda x: -x[1]["file_count"])
    }

    # Top 10 largest files deterministically: size_bytes desc, relative_path asc
    sorted_files_by_size = sorted(
        files,
        key=lambda f: (-f.size_bytes, f.relative_path),
    )[:10]

    largest_files = [
        {
            "relative_path": f.relative_path,
            "file_name": f.file_name,
            "size_bytes": f.size_bytes,
            "language": f.language,
            "line_count": f.line_count,
        }
        for f in sorted_files_by_size
    ]

    # Top-level directories deterministically: file_count desc, name asc
    sorted_dirs = sorted(
        [
            {"name": name, "file_count": s["file_count"], "total_size_bytes": s["size_bytes"]}
            for name, s in top_level_dirs.items()
        ],
        key=lambda d: (-d["file_count"], d["name"]),
    )

    return {
        "summary": {
            "total_files": total_files,
            "source_files": source_files,
            "ignored_files": discovery.ignored_files_count,
            "total_size_bytes": total_size,
            "directory_count": discovery.directory_count,
            "total_lines_of_code": total_loc,
        },
        "language_distribution": language_distribution,
        "category_distribution": category_distribution,
        "largest_files": largest_files,
        "top_level_directories": sorted_dirs,
    }
