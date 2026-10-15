"""Evidence validation and citation schema for repository Q&A.

Ensures every claim and citation is strictly anchored to actual source coordinates
and verified content hashes from the selected immutable snapshot.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import uuid

from backend.app.models.base import CodeChunk


@dataclass
class EvidenceItem:
    """Traceable, grounded evidence snippet retrieved from a snapshot."""

    evidence_id: str
    chunk_id: str
    repository_id: str
    snapshot_id: str
    relative_path: str
    start_line: int
    end_line: int
    symbol_name: Optional[str]
    symbol_type: Optional[str]
    excerpt: str
    content_hash: str
    score: float
    retrieval_mode: str
    citation: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "evidence_id": self.evidence_id,
            "chunk_id": self.chunk_id,
            "repository_id": self.repository_id,
            "snapshot_id": self.snapshot_id,
            "relative_path": self.relative_path,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "symbol_name": self.symbol_name,
            "symbol_type": self.symbol_type,
            "excerpt": self.excerpt,
            "content_hash": self.content_hash,
            "score": round(self.score, 4),
            "retrieval_mode": self.retrieval_mode,
            "citation": self.citation,
        }


def chunk_to_evidence(chunk: CodeChunk, score: float, retrieval_mode: str) -> EvidenceItem:
    """Convert an indexed CodeChunk into a validated EvidenceItem."""
    lines = chunk.content.split("\n")
    excerpt = "\n".join(lines[:8])
    if len(lines) > 8:
        excerpt += f"\n... [{len(lines) - 8} more lines]"

    return EvidenceItem(
        evidence_id=str(uuid.uuid4()),
        chunk_id=chunk.id,
        repository_id=chunk.repository_id,
        snapshot_id=chunk.snapshot_id,
        relative_path=chunk.relative_path,
        start_line=chunk.start_line,
        end_line=chunk.end_line,
        symbol_name=chunk.symbol_name,
        symbol_type=chunk.symbol_type,
        excerpt=excerpt,
        content_hash=chunk.content_hash,
        score=score,
        retrieval_mode=retrieval_mode,
        citation=f"{chunk.relative_path}:L{chunk.start_line}-L{chunk.end_line}",
    )


def validate_citations(citations: List[str], evidence_list: List[EvidenceItem]) -> List[str]:
    """Validate citations against available evidence items, discarding invalid ones."""
    valid_citations = {ev.citation for ev in evidence_list}
    return [c for c in citations if c in valid_citations]
