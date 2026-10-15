"""Deterministic BM25 lexical code search engine with AST symbol boosting.

Tokenizes source code identifiers (splitting snake_case and camelCase),
calculates BM25Okapi term weights, and provides exact symbol and path boosts.
Does not execute analyzed target repositories.
"""

from collections import Counter
import math
import re
from typing import Any, Dict, List, Optional, Tuple

from backend.app.models.base import CodeChunk


def tokenize_code(text: str) -> List[str]:
    """Tokenize source code or documentation text into normalized terms.

    Splits snake_case and camelCase identifiers while preserving full identifiers.
    """
    if not text:
        return []

    # Extract all raw word tokens
    raw_tokens = re.findall(r"[A-Za-z0-9_]+", text)
    tokens: List[str] = []

    for t in raw_tokens:
        # Lowercase version
        lower_t = t.lower()
        tokens.append(lower_t)

        # Split snake_case
        if "_" in t:
            parts = [p.lower() for p in t.split("_") if p]
            tokens.extend(parts)

        # Split camelCase
        camel_parts = re.findall(r"[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\b)|\d+", t)
        if len(camel_parts) > 1:
            tokens.extend([cp.lower() for cp in camel_parts])

        # Morphological root stems for common code & doc terms
        if len(lower_t) > 4:
            if lower_t.endswith("ation"):
                tokens.append(lower_t[:-5])
                tokens.append(lower_t[:-5] + "ate")
            elif lower_t.endswith("ing") and len(lower_t) > 5:
                tokens.append(lower_t[:-3])
            elif lower_t.endswith("ed") and len(lower_t) > 4:
                tokens.append(lower_t[:-2])
                tokens.append(lower_t[:-1])
            elif lower_t.endswith("es") and len(lower_t) > 4:
                tokens.append(lower_t[:-2])
            elif lower_t.endswith("s") and not lower_t.endswith("ss") and len(lower_t) > 3:
                tokens.append(lower_t[:-1])

    return tokens



class LexicalSearchResult:
    """Diagnostic result item from lexical retrieval."""

    def __init__(
        self,
        chunk: CodeChunk,
        score: float,
        raw_score: float,
        rank: int,
        matched_terms: List[str],
    ):
        self.chunk = chunk
        self.score = round(score, 4)
        self.raw_score = round(raw_score, 4)
        self.rank = rank
        self.matched_terms = matched_terms


class BM25SearchEngine:
    """In-memory BM25Okapi retrieval engine for indexed code chunks."""

    def __init__(self, chunks: List[CodeChunk], k1: float = 1.5, b: float = 0.75):
        self.chunks = chunks
        self.k1 = k1
        self.b = b
        self.corpus_size = len(chunks)
        self.doc_tokens: List[List[str]] = []
        self.doc_freqs: List[Counter] = []
        self.doc_lens: List[int] = []
        self.avg_doc_len = 0.0
        self.idf: Dict[str, float] = {}

        self._build_index()

    def _build_index(self) -> None:
        """Tokenize all chunks and compute document frequencies and IDFs."""
        if self.corpus_size == 0:
            return

        total_len = 0
        df: Counter = Counter()

        for chunk in self.chunks:
            # Build searchable text from symbol name, relative path, and content
            searchable_text = f"{chunk.symbol_name or ''} {chunk.file_name} {chunk.relative_path} {chunk.content}"
            tokens = tokenize_code(searchable_text)
            self.doc_tokens.append(tokens)
            freqs = Counter(tokens)
            self.doc_freqs.append(freqs)
            d_len = len(tokens)
            self.doc_lens.append(d_len)
            total_len += d_len

            # Update document frequency
            for term in set(tokens):
                df[term] += 1

        self.avg_doc_len = total_len / self.corpus_size if self.corpus_size > 0 else 1.0

        # Compute Robertson-Spärck Jones BM25 IDF: ln(1 + (N - n + 0.5) / (n + 0.5))
        for term, freq in df.items():
            self.idf[term] = math.log(1.0 + (self.corpus_size - freq + 0.5) / (freq + 0.5))

    def search(
        self,
        query: str,
        limit: int = 20,
        language_filter: Optional[str] = None,
        file_path_filter: Optional[str] = None,
        symbol_type_filter: Optional[str] = None,
    ) -> List[LexicalSearchResult]:
        """Perform filtered BM25 search with symbol and path boosts."""
        if not query.strip() or self.corpus_size == 0:
            return []

        query_tokens = tokenize_code(query)
        if not query_tokens:
            return []

        clean_query = query.strip().lower()
        scores: List[Tuple[int, float, List[str]]] = []

        for idx, chunk in enumerate(self.chunks):
            # Apply filters
            if language_filter and chunk.language.lower() != language_filter.lower():
                continue
            if file_path_filter and file_path_filter.lower() not in chunk.relative_path.lower():
                continue
            if symbol_type_filter and (chunk.symbol_type or "").lower() != symbol_type_filter.lower():
                continue

            doc_freq = self.doc_freqs[idx]
            d_len = self.doc_lens[idx]
            raw_bm25 = 0.0
            matched_terms: List[str] = []

            for q in query_tokens:
                if q in doc_freq:
                    matched_terms.append(q)
                    tf = doc_freq[q]
                    idf_val = self.idf.get(q, 0.0)
                    numerator = tf * (self.k1 + 1.0)
                    denominator = tf + self.k1 * (1.0 - self.b + self.b * (d_len / self.avg_doc_len))
                    raw_bm25 += idf_val * (numerator / denominator)

            # Apply exact & symbol bonuses
            bonus = 0.0
            sym_name = (chunk.symbol_name or "").lower()
            if sym_name:
                if clean_query == sym_name:
                    bonus += 4.0
                elif sym_name in clean_query:
                    bonus += 3.0
                elif any(q in sym_name for q in query_tokens if len(q) >= 4):
                    bonus += 2.0

            file_n = chunk.file_name.lower()
            if clean_query == file_n:
                bonus += 3.0
            elif file_n in clean_query:
                bonus += 2.0
            elif any(q in file_n for q in query_tokens if len(q) >= 4):
                bonus += 1.5

            total_score = raw_bm25 + bonus

            if total_score > 0.001:
                scores.append((idx, total_score, list(set(matched_terms))))

        # Sort descending by total score
        scores.sort(key=lambda x: x[1], reverse=True)

        # Normalize top scores to [0.0, 1.0]
        max_score = scores[0][1] if scores else 1.0
        results: List[LexicalSearchResult] = []

        for rank, (idx, total_score, matched) in enumerate(scores[:limit]):
            norm_score = total_score / max_score if max_score > 0 else 0.0
            results.append(
                LexicalSearchResult(
                    chunk=self.chunks[idx],
                    score=norm_score,
                    raw_score=total_score,
                    rank=rank + 1,
                    matched_terms=matched,
                )
            )

        return results
