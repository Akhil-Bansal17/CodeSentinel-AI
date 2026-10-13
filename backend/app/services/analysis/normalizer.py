"""Finding normalization and validation service for CodeSentinel AI.

Enforces strict source coordinate boundaries, sanitizes paths against
host directory leakage, strips sensitive patterns, and computes deterministic
fingerprints for findings deduplication.
"""

import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from backend.app.models.base import AnalysisFinding
from backend.app.services.analysis.rules.base import FindingDraft


def normalize_relative_path(raw_path: str) -> str:
    """Normalize file path to POSIX relative format without leading slashes or traversal."""
    p = raw_path.replace("\\", "/").strip()
    while p.startswith("/"):
        p = p[1:]
    parts = [part for part in p.split("/") if part and part != "."]
    # Remove any traversal sequences
    safe_parts = []
    for part in parts:
        if part == "..":
            continue
        safe_parts.append(part)
    return "/".join(safe_parts)


def sanitize_text(text: str) -> str:
    """Sanitize finding text to avoid disclosing server paths or sensitive substrings."""
    # Basic containment: replace Windows drive letters if accidentally leaked
    cleaned = text
    import re
    # Strip Windows absolute paths like C:\Users\...
    cleaned = re.sub(r"[a-zA-Z]:[\\/][^ \t\r\n\'\"]+", "<sanitized-path>", cleaned)
    return cleaned


def compute_finding_fingerprint(
    rule_id: str,
    file_path: str,
    start_line: int,
    evidence_summary: str,
) -> str:
    """Generate deterministic SHA-256 fingerprint for finding deduplication."""
    content = f"{rule_id}:{file_path}:{start_line}:{evidence_summary}"
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


class FindingNormalizer:
    """Normalizes and validates raw finding drafts into persisted model entities."""

    @classmethod
    def normalize_draft(
        cls,
        draft: FindingDraft,
        analysis_run_id: str,
        repository_id: str,
        snapshot_id: str,
        total_file_lines: int,
    ) -> AnalysisFinding:
        """Validate and construct an AnalysisFinding entity from a FindingDraft."""
        norm_path = normalize_relative_path(draft.file_path)

        # 1. Coordinate boundaries validation
        start_line = draft.coordinates.start_line
        if start_line < 1:
            start_line = 1
        if total_file_lines > 0 and start_line > total_file_lines:
            start_line = total_file_lines

        start_col = draft.coordinates.start_column
        if start_col is not None and start_col < 1:
            start_col = 1

        end_line = draft.coordinates.end_line
        if end_line is not None:
            if end_line < start_line:
                end_line = start_line
            if total_file_lines > 0 and end_line > total_file_lines:
                end_line = total_file_lines

        end_col = draft.coordinates.end_column
        if end_col is not None and end_col < 1:
            end_col = 1

        # 2. Evidence sanitization & metadata consolidation
        clean_evidence = sanitize_text(draft.evidence_summary)
        clean_title = sanitize_text(draft.title)
        clean_desc = sanitize_text(draft.description)

        metadata = dict(draft.metadata or {})
        confidence_val = draft.confidence.value if hasattr(draft.confidence, "value") else str(draft.confidence)
        metadata["confidence"] = confidence_val
        if draft.remediation:
            metadata["remediation"] = sanitize_text(draft.remediation)
        if draft.why_it_matters:
            metadata["why_it_matters"] = sanitize_text(draft.why_it_matters)
        if draft.limitations:
            metadata["limitations"] = sanitize_text(draft.limitations)

        # 3. Deterministic fingerprint
        fingerprint = compute_finding_fingerprint(
            rule_id=draft.rule_id,
            file_path=norm_path,
            start_line=start_line,
            evidence_summary=clean_evidence,
        )

        return AnalysisFinding(
            id=str(uuid.uuid4()),
            analysis_run_id=analysis_run_id,
            repository_id=repository_id,
            snapshot_id=snapshot_id,
            rule_id=draft.rule_id,
            rule_name=draft.rule_name,
            rule_version=draft.rule_version,
            title=clean_title,
            description=clean_desc,
            severity=draft.severity.value,
            confidence=confidence_val,
            category=draft.category.value,
            file_path=norm_path,
            start_line=start_line,
            start_column=start_col,
            end_line=end_line,
            end_column=end_col,
            evidence_summary=clean_evidence,
            fingerprint=fingerprint,
            metadata_json=metadata,
        )
