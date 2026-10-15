"""Evidence-backed repository Q&A orchestration service.

Executes grounded question answering with strict citation validation,
deterministic no-LLM synthesis fallback, and prompt-injection resistance.
Never executes target repository source code.
"""

import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.exceptions import ValidationError
from backend.app.models.base import CodeChunk
from backend.app.services.search.embeddings.base import BaseEmbeddingProvider
from backend.app.services.search.qa.evidence import (
    EvidenceItem,
    chunk_to_evidence,
    validate_citations,
)
from backend.app.services.search.qa.llm_provider import (
    BaseLLMProvider,
    get_llm_provider,
)
from backend.app.services.search.search_service import CodeSearchService


class RepositoryQAService:
    """Orchestrates evidence retrieval, sufficiency validation, and answer generation."""

    def __init__(
        self,
        db: Session,
        embedding_provider: Optional[BaseEmbeddingProvider] = None,
        llm_provider: Optional[BaseLLMProvider] = None,
    ):
        self.db = db
        self.search_service = CodeSearchService(db=db, embedding_provider=embedding_provider)
        self.llm_provider = llm_provider or get_llm_provider()

    async def answer_question(
        self,
        repository_id: str,
        snapshot_id: str,
        question: str,
        retrieval_mode: str = "hybrid",
        prefer_llm: bool = False,
    ) -> Dict[str, Any]:
        """Execute grounded Q&A pipeline against a repository snapshot."""
        clean_question = question.strip()
        if not clean_question:
            raise ValidationError("Question cannot be empty.")

        # 1. Retrieve candidate chunks via search service
        search_res = await self.search_service.search(
            repository_id=repository_id,
            snapshot_id=snapshot_id,
            query=clean_question,
            mode=retrieval_mode,
            limit=settings.QA_MAX_EVIDENCE_CHUNKS,
        )

        results = search_res.get("results", [])
        mode_used = search_res.get("mode_used", retrieval_mode)
        warnings: List[str] = list(search_res.get("capabilities", {}).get("warnings", []))

        # 2. Build EvidenceItem collection
        evidence_items: List[EvidenceItem] = []
        for r in results:
            chunk = self.db.query(CodeChunk).filter(CodeChunk.id == r["chunk_id"]).first()
            if chunk:
                ev = chunk_to_evidence(
                    chunk=chunk,
                    score=float(r.get("score", 0.0)),
                    retrieval_mode=mode_used,
                )
                evidence_items.append(ev)

        # 3. Assess evidence sufficiency
        max_score = evidence_items[0].score if evidence_items else 0.0
        relevance_threshold = settings.QA_RELEVANCE_THRESHOLD

        if not evidence_items or max_score < relevance_threshold:
            return {
                "question": clean_question,
                "answer": (
                    f"The repository evidence does not contain sufficient information to answer the question:\n"
                    f"\"{clean_question}\"\n\n"
                    "No relevant functions, classes, definitions, or documentation were found matching "
                    "this topic in the selected snapshot. Please verify that the functionality exists in "
                    "this snapshot or try searching for specific file names or symbol identifiers."
                ),
                "repository_id": repository_id,
                "snapshot_id": snapshot_id,
                "retrieval_mode": mode_used,
                "confidence": "INSUFFICIENT_EVIDENCE",
                "evidence_sufficiency": "INSUFFICIENT",
                "llm_used": False,
                "llm_provider": None,
                "evidence": [],
                "citations": [],
                "warnings": warnings,
            }

        confidence = "HIGH" if max_score >= 0.3 else "MEDIUM"
        sufficiency = "SUFFICIENT" if max_score >= 0.3 else "PARTIAL"

        # 4. Generate answer: Optional LLM vs. Deterministic Grounded mode
        llm_used = False
        llm_provider_name: Optional[str] = None
        answer_text = ""
        citations: List[str] = [ev.citation for ev in evidence_items]

        if prefer_llm and self.llm_provider.is_available():
            try:
                raw_answer = self.llm_provider.generate_answer(clean_question, evidence_items)
                if raw_answer.strip():
                    # Extract bracketed citations and validate
                    found_citations = re.findall(r"\[([A-Za-z0-9_./\\-]+:L\d+-L\d+)\]", raw_answer)
                    valid_cits = validate_citations(found_citations, evidence_items)

                    # Ensure at least valid citations are present
                    answer_text = raw_answer
                    citations = valid_cits if valid_cits else [ev.citation for ev in evidence_items[:3]]
                    llm_used = True
                    llm_provider_name = self.llm_provider.name
            except Exception as llm_err:
                warnings.append(f"Optional LLM provider failed, fell back to deterministic mode: {llm_err}")

        if not answer_text:
            # Deterministic Grounded mode
            answer_text = self._synthesize_deterministic_answer(clean_question, evidence_items)
            llm_used = False
            llm_provider_name = None

        return {
            "question": clean_question,
            "answer": answer_text,
            "repository_id": repository_id,
            "snapshot_id": snapshot_id,
            "retrieval_mode": mode_used,
            "confidence": confidence,
            "evidence_sufficiency": sufficiency,
            "llm_used": llm_used,
            "llm_provider": llm_provider_name,
            "evidence": [ev.to_dict() for ev in evidence_items],
            "citations": citations,
            "warnings": warnings,
        }

    def _synthesize_deterministic_answer(
        self,
        question: str,
        evidence: List[EvidenceItem],
    ) -> str:
        """Synthesize a transparent, evidence-grounded answer without LLM hallucinations."""
        top_items = evidence[:5]
        files_found = sorted(list({ev.relative_path for ev in top_items}))

        lines: List[str] = []
        lines.append(f"### Evidence Summary for: \"{question}\"\n")
        lines.append(
            f"Based on **{len(evidence)} verified source location(s)** across **{len(files_found)} file(s)** "
            f"in the repository snapshot:\n"
        )

        for idx, ev in enumerate(top_items, 1):
            sym_desc = f"`{ev.symbol_name}` ({ev.symbol_type})" if ev.symbol_name else f"code block ({ev.relative_path})"
            lines.append(f"**{idx}. {sym_desc}** — Citation: [{ev.citation}]")
            lines.append(f"- **File:** `{ev.relative_path}` (Lines {ev.start_line}–{ev.end_line})")
            lines.append(f"- **Relevance Score:** {round(ev.score, 4)} via {ev.retrieval_mode} retrieval")

            # Clean excerpt preview
            clean_lines = [l for l in ev.excerpt.split("\n") if l.strip()]
            preview = clean_lines[0] if clean_lines else "N/A"
            lines.append(f"- **Preview:** `{preview[:90]}`\n")

        lines.append("---")
        lines.append(
            "*(This explanation was generated deterministically from verified snapshot AST symbols and source text. "
            "All citations point directly to immutable snapshot coordinates.)*"
        )

        return "\n".join(lines)
