"""Syntax-aware and bounded line-based source code chunker.

Transforms source code into deterministic, traceable chunks representing
functions, classes, methods, imports, module definitions, or documentation.
Preserves exact 1-indexed source line coordinates and content hashes.
Never executes or imports analyzed source code.
"""

from dataclasses import dataclass, field
import hashlib
from pathlib import Path
import re
from typing import Any, Dict, List, Optional

from backend.app.core.config import settings
from backend.app.services.analysis.parsers.base import ParserStatus
from backend.app.services.analysis.parsers.js_ts_adapter import JsTsParser
from backend.app.services.analysis.parsers.python_parser import PythonParser


@dataclass
class CodeChunkDraft:
    """In-memory representation of an indexed source code chunk."""

    relative_path: str
    file_name: str
    language: str
    chunk_index: int
    chunk_type: str  # function, class, method, import, doc, code_block
    symbol_name: Optional[str]
    symbol_type: Optional[str]
    start_line: int
    end_line: int
    start_column: Optional[int]
    end_column: Optional[int]
    content: str
    content_hash: str
    chunk_fingerprint: str
    metadata_json: Dict[str, Any] = field(default_factory=dict)


def compute_sha256(text: str) -> str:
    """Compute standard SHA-256 hex digest for text."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def compute_chunk_fingerprint(
    snapshot_id: str,
    relative_path: str,
    start_line: int,
    end_line: int,
    content_hash: str,
) -> str:
    """Compute deterministic fingerprint for snapshot chunk consistency."""
    payload = f"{snapshot_id}:{relative_path}:{start_line}:{end_line}:{content_hash}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class SourceChunker:
    """Extracts syntax-aware and bounded chunks from source files."""

    MAX_CHUNK_LINES = 120
    DEFAULT_WINDOW_LINES = 50
    DEFAULT_OVERLAP_LINES = 5

    @classmethod
    def chunk_file(
        cls,
        snapshot_id: str,
        relative_path: str,
        content: str,
        language: str,
    ) -> List[CodeChunkDraft]:
        """Produce deterministic chunks for a given file content and language."""
        if not content.strip():
            return []

        lines = content.split("\n")
        total_lines = len(lines)
        file_name = Path(relative_path).name
        ext = Path(relative_path).suffix.lower()

        chunks: List[CodeChunkDraft] = []

        # 1. Python AST-based syntax chunking
        if language.lower() == "python" or ext == ".py":
            chunks = cls._chunk_python(snapshot_id, relative_path, file_name, lines, content)

        # 2. JavaScript / TypeScript syntax chunking
        elif language.lower() in {"javascript", "typescript", "jsx", "tsx"} or ext in {".js", ".jsx", ".ts", ".tsx"}:
            chunks = cls._chunk_js_ts(snapshot_id, relative_path, file_name, lines, content, language)

        # 3. Documentation chunking (Markdown, RST, TXT)
        elif ext in {".md", ".rst", ".txt"} or language.lower() in {"markdown", "documentation", "text"}:
            chunks = cls._chunk_markdown(snapshot_id, relative_path, file_name, lines)

        # 4. Fallback: bounded sliding line window
        if not chunks:
            chunks = cls._chunk_line_window(snapshot_id, relative_path, file_name, lines, language)

        # Ensure chunk ordering, bounded chunk bytes, and indexes
        bounded_chunks: List[CodeChunkDraft] = []
        max_bytes = settings.MAX_CHUNK_BYTES

        for raw_chunk in chunks:
            # Enforce max byte limit by slicing if symbol is excessively large
            encoded_bytes = raw_chunk.content.encode("utf-8")
            if len(encoded_bytes) > max_bytes:
                sub_chunks = cls._split_large_chunk(raw_chunk, max_bytes, snapshot_id)
                bounded_chunks.extend(sub_chunks)
            else:
                bounded_chunks.append(raw_chunk)

        # Reindex chunk_index sequentially
        for idx, chunk in enumerate(bounded_chunks):
            chunk.chunk_index = idx

        # Respect MAX_CHUNKS_PER_FILE limit
        max_chunks = settings.MAX_CHUNKS_PER_FILE
        return bounded_chunks[:max_chunks]

    @classmethod
    def _slice_lines(cls, lines: List[str], start_line: int, end_line: int) -> str:
        """Safely slice 1-indexed line numbers inclusive."""
        s = max(0, start_line - 1)
        e = min(len(lines), end_line)
        return "\n".join(lines[s:e])

    @classmethod
    def _chunk_python(
        cls,
        snapshot_id: str,
        relative_path: str,
        file_name: str,
        lines: List[str],
        content: str,
    ) -> List[CodeChunkDraft]:
        """Chunk Python files using AST parse symbols."""
        parse_result = PythonParser.parse(relative_path, content)
        if parse_result.status != ParserStatus.SUCCESS:
            return []

        chunks: List[CodeChunkDraft] = []
        covered_ranges: List[tuple] = []

        # 1. Imports block chunk
        if parse_result.imports:
            imp_start = min(imp.coordinates.start_line for imp in parse_result.imports)
            imp_end = max(
                imp.coordinates.end_line or imp.coordinates.start_line for imp in parse_result.imports
            )
            imp_text = cls._slice_lines(lines, imp_start, imp_end)
            if imp_text.strip():
                h = compute_sha256(imp_text)
                fp = compute_chunk_fingerprint(snapshot_id, relative_path, imp_start, imp_end, h)
                chunks.append(
                    CodeChunkDraft(
                        relative_path=relative_path,
                        file_name=file_name,
                        language="Python",
                        chunk_index=0,
                        chunk_type="import",
                        symbol_name=None,
                        symbol_type="imports_block",
                        start_line=imp_start,
                        end_line=imp_end,
                        start_column=1,
                        end_column=None,
                        content=imp_text,
                        content_hash=h,
                        chunk_fingerprint=fp,
                        metadata_json={"import_count": len(parse_result.imports)},
                    )
                )
                covered_ranges.append((imp_start, imp_end))

        # 2. Classes
        for cls_item in parse_result.classes:
            c_start = cls_item.coordinates.start_line
            c_end = cls_item.coordinates.end_line or c_start
            # If class is moderately sized, index as whole class chunk
            class_text = cls._slice_lines(lines, c_start, c_end)
            if class_text.strip():
                h = compute_sha256(class_text)
                fp = compute_chunk_fingerprint(snapshot_id, relative_path, c_start, c_end, h)
                chunks.append(
                    CodeChunkDraft(
                        relative_path=relative_path,
                        file_name=file_name,
                        language="Python",
                        chunk_index=0,
                        chunk_type="class",
                        symbol_name=cls_item.name,
                        symbol_type="class",
                        start_line=c_start,
                        end_line=c_end,
                        start_column=cls_item.coordinates.start_column,
                        end_column=cls_item.coordinates.end_column,
                        content=class_text,
                        content_hash=h,
                        chunk_fingerprint=fp,
                        metadata_json={"methods_count": cls_item.methods_count, "is_abstract": cls_item.is_abstract},
                    )
                )
                covered_ranges.append((c_start, c_end))

        # 3. Functions & Methods
        for func in parse_result.functions:
            f_start = func.coordinates.start_line
            f_end = func.coordinates.end_line or f_start
            func_text = cls._slice_lines(lines, f_start, f_end)
            if func_text.strip():
                h = compute_sha256(func_text)
                fp = compute_chunk_fingerprint(snapshot_id, relative_path, f_start, f_end, h)
                chunks.append(
                    CodeChunkDraft(
                        relative_path=relative_path,
                        file_name=file_name,
                        language="Python",
                        chunk_index=0,
                        chunk_type="function",
                        symbol_name=func.name,
                        symbol_type="function",
                        start_line=f_start,
                        end_line=f_end,
                        start_column=func.coordinates.start_column,
                        end_column=func.coordinates.end_column,
                        content=func_text,
                        content_hash=h,
                        chunk_fingerprint=fp,
                        metadata_json={"complexity": func.cyclomatic_complexity, "line_count": func.line_count},
                    )
                )
                covered_ranges.append((f_start, f_end))

        # 4. Fill gaps (e.g. module level code, configs)
        chunks.sort(key=lambda c: (c.start_line, c.end_line))
        return chunks

    @classmethod
    def _chunk_js_ts(
        cls,
        snapshot_id: str,
        relative_path: str,
        file_name: str,
        lines: List[str],
        content: str,
        language: str,
    ) -> List[CodeChunkDraft]:
        """Chunk JS/TS files using Node parser when available, else fallback."""
        parse_result = JsTsParser.parse(relative_path, content, language)
        if parse_result.status != ParserStatus.SUCCESS or (not parse_result.functions and not parse_result.classes):
            return []

        chunks: List[CodeChunkDraft] = []

        # 1. Imports block
        if parse_result.imports:
            imp_start = min(imp.coordinates.start_line for imp in parse_result.imports)
            imp_end = max(imp.coordinates.end_line or imp.coordinates.start_line for imp in parse_result.imports)
            imp_text = cls._slice_lines(lines, imp_start, imp_end)
            if imp_text.strip():
                h = compute_sha256(imp_text)
                fp = compute_chunk_fingerprint(snapshot_id, relative_path, imp_start, imp_end, h)
                chunks.append(
                    CodeChunkDraft(
                        relative_path=relative_path,
                        file_name=file_name,
                        language=language,
                        chunk_index=0,
                        chunk_type="import",
                        symbol_name=None,
                        symbol_type="imports_block",
                        start_line=imp_start,
                        end_line=imp_end,
                        start_column=1,
                        end_column=None,
                        content=imp_text,
                        content_hash=h,
                        chunk_fingerprint=fp,
                        metadata_json={"import_count": len(parse_result.imports)},
                    )
                )

        # 2. Classes
        for cls_item in parse_result.classes:
            c_start = cls_item.coordinates.start_line
            c_end = cls_item.coordinates.end_line or c_start
            class_text = cls._slice_lines(lines, c_start, c_end)
            if class_text.strip():
                h = compute_sha256(class_text)
                fp = compute_chunk_fingerprint(snapshot_id, relative_path, c_start, c_end, h)
                chunks.append(
                    CodeChunkDraft(
                        relative_path=relative_path,
                        file_name=file_name,
                        language=language,
                        chunk_index=0,
                        chunk_type="class",
                        symbol_name=cls_item.name,
                        symbol_type="class",
                        start_line=c_start,
                        end_line=c_end,
                        start_column=cls_item.coordinates.start_column,
                        end_column=cls_item.coordinates.end_column,
                        content=class_text,
                        content_hash=h,
                        chunk_fingerprint=fp,
                        metadata_json={"methods_count": cls_item.methods_count},
                    )
                )

        # 3. Functions
        for func in parse_result.functions:
            f_start = func.coordinates.start_line
            f_end = func.coordinates.end_line or f_start
            func_text = cls._slice_lines(lines, f_start, f_end)
            if func_text.strip():
                h = compute_sha256(func_text)
                fp = compute_chunk_fingerprint(snapshot_id, relative_path, f_start, f_end, h)
                chunks.append(
                    CodeChunkDraft(
                        relative_path=relative_path,
                        file_name=file_name,
                        language=language,
                        chunk_index=0,
                        chunk_type="function",
                        symbol_name=func.name,
                        symbol_type="function",
                        start_line=f_start,
                        end_line=f_end,
                        start_column=func.coordinates.start_column,
                        end_column=func.coordinates.end_column,
                        content=func_text,
                        content_hash=h,
                        chunk_fingerprint=fp,
                        metadata_json={"complexity": func.cyclomatic_complexity},
                    )
                )

        chunks.sort(key=lambda c: (c.start_line, c.end_line))
        return chunks

    @classmethod
    def _chunk_markdown(
        cls,
        snapshot_id: str,
        relative_path: str,
        file_name: str,
        lines: List[str],
    ) -> List[CodeChunkDraft]:
        """Chunk Markdown / documentation files by headings (#, ##, ###)."""
        heading_indices: List[tuple] = []
        heading_pattern = re.compile(r"^(#{1,4})\s+(.+)$")

        for idx, line in enumerate(lines):
            match = heading_pattern.match(line.strip())
            if match:
                heading_indices.append((idx + 1, match.group(2).strip()))

        if not heading_indices:
            return []

        chunks: List[CodeChunkDraft] = []
        total_lines = len(lines)

        for i, (start_l, heading_text) in enumerate(heading_indices):
            end_l = heading_indices[i + 1][0] - 1 if i + 1 < len(heading_indices) else total_lines
            if end_l < start_l:
                end_l = start_l

            section_text = cls._slice_lines(lines, start_l, end_l)
            if section_text.strip():
                h = compute_sha256(section_text)
                fp = compute_chunk_fingerprint(snapshot_id, relative_path, start_l, end_l, h)
                chunks.append(
                    CodeChunkDraft(
                        relative_path=relative_path,
                        file_name=file_name,
                        language="Markdown",
                        chunk_index=0,
                        chunk_type="doc",
                        symbol_name=heading_text,
                        symbol_type="heading",
                        start_line=start_l,
                        end_line=end_l,
                        start_column=1,
                        end_column=None,
                        content=section_text,
                        content_hash=h,
                        chunk_fingerprint=fp,
                        metadata_json={"heading": heading_text},
                    )
                )

        return chunks

    @classmethod
    def _chunk_line_window(
        cls,
        snapshot_id: str,
        relative_path: str,
        file_name: str,
        lines: List[str],
        language: str,
    ) -> List[CodeChunkDraft]:
        """Fallback chunking using bounded sliding line windows with overlap."""
        total_lines = len(lines)
        if total_lines == 0:
            return []

        window = cls.DEFAULT_WINDOW_LINES
        overlap = settings.INDEXING_OVERLAP_LINES
        step = max(1, window - overlap)

        chunks: List[CodeChunkDraft] = []
        curr_start = 1

        while curr_start <= total_lines:
            curr_end = min(total_lines, curr_start + window - 1)
            chunk_text = cls._slice_lines(lines, curr_start, curr_end)

            if chunk_text.strip():
                h = compute_sha256(chunk_text)
                fp = compute_chunk_fingerprint(snapshot_id, relative_path, curr_start, curr_end, h)
                chunks.append(
                    CodeChunkDraft(
                        relative_path=relative_path,
                        file_name=file_name,
                        language=language or "Text",
                        chunk_index=0,
                        chunk_type="code_block",
                        symbol_name=None,
                        symbol_type=None,
                        start_line=curr_start,
                        end_line=curr_end,
                        start_column=1,
                        end_column=None,
                        content=chunk_text,
                        content_hash=h,
                        chunk_fingerprint=fp,
                        metadata_json={"strategy": "line_window"},
                    )
                )

            if curr_end >= total_lines:
                break
            curr_start += step

        return chunks

    @classmethod
    def _split_large_chunk(
        cls,
        chunk: CodeChunkDraft,
        max_bytes: int,
        snapshot_id: str,
    ) -> List[CodeChunkDraft]:
        """Subdivide oversized chunks into smaller bounded sections."""
        lines = chunk.content.split("\n")
        total_lines = len(lines)
        sub_chunks: List[CodeChunkDraft] = []

        curr_lines: List[str] = []
        sub_start_offset = 0
        current_byte_count = 0

        for idx, line in enumerate(lines):
            line_bytes = len(line.encode("utf-8")) + 1
            if current_byte_count + line_bytes > max_bytes and curr_lines:
                sub_text = "\n".join(curr_lines)
                s_line = chunk.start_line + sub_start_offset
                e_line = s_line + len(curr_lines) - 1
                h = compute_sha256(sub_text)
                fp = compute_chunk_fingerprint(snapshot_id, chunk.relative_path, s_line, e_line, h)
                sub_chunks.append(
                    CodeChunkDraft(
                        relative_path=chunk.relative_path,
                        file_name=chunk.file_name,
                        language=chunk.language,
                        chunk_index=0,
                        chunk_type=chunk.chunk_type,
                        symbol_name=chunk.symbol_name,
                        symbol_type=chunk.symbol_type,
                        start_line=s_line,
                        end_line=e_line,
                        start_column=1,
                        end_column=None,
                        content=sub_text,
                        content_hash=h,
                        chunk_fingerprint=fp,
                        metadata_json={**chunk.metadata_json, "part": len(sub_chunks) + 1},
                    )
                )
                curr_lines = [line]
                sub_start_offset = idx
                current_byte_count = line_bytes
            else:
                curr_lines.append(line)
                current_byte_count += line_bytes

        if curr_lines:
            sub_text = "\n".join(curr_lines)
            s_line = chunk.start_line + sub_start_offset
            e_line = s_line + len(curr_lines) - 1
            h = compute_sha256(sub_text)
            fp = compute_chunk_fingerprint(snapshot_id, chunk.relative_path, s_line, e_line, h)
            sub_chunks.append(
                CodeChunkDraft(
                    relative_path=chunk.relative_path,
                    file_name=chunk.file_name,
                    language=chunk.language,
                    chunk_index=0,
                    chunk_type=chunk.chunk_type,
                    symbol_name=chunk.symbol_name,
                    symbol_type=chunk.symbol_type,
                    start_line=s_line,
                    end_line=e_line,
                    start_column=1,
                    end_column=None,
                    content=sub_text,
                    content_hash=h,
                    chunk_fingerprint=fp,
                    metadata_json={**chunk.metadata_json, "part": len(sub_chunks) + 1},
                )
            )

        return sub_chunks
