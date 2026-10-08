"""Conceptual Domain Architecture Models for CodeSentinel AI.

This module defines the architectural data contracts for Phase 0 and future phases:
- Repository & Ingestion (Repository, RepositorySnapshot, RepositoryFile)
- Deterministic Intelligence (AnalysisRun, AnalysisFinding, HealthScore, Dependency, TestMetric, SecurityFinding)
- Knowledge Representation (CodeChunk, CodeEmbedding)
- AI Reasoning & Agency (AIConversation, Recommendation, AgentTask)
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# --- Enums ---

class AnalysisStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class FindingSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class FindingCategory(str, Enum):
    SECURITY = "security"
    QUALITY = "quality"
    STATIC_ANALYSIS = "static_analysis"
    DEPENDENCY = "dependency"
    TEST = "test"
    DOCUMENTATION = "documentation"


class AgentTaskStatus(str, Enum):
    PROPOSED = "proposed"
    VALIDATING = "validating"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTED = "executed"


# --- 1. Repository & Ingestion ---

class RepositorySnapshot(BaseModel):
    """Point-in-time immutable snapshot of a repository commit."""

    id: str
    repository_id: str
    commit_sha: str
    branch: str
    total_files: int
    total_lines_of_code: int
    primary_languages: List[str]
    created_at: datetime


class RepositoryFile(BaseModel):
    """File metadata and content reference within a repository snapshot."""

    id: str
    snapshot_id: str
    path: str
    language: str
    size_bytes: int
    line_count: int
    sha256: str
    is_binary: bool = False


# --- 2. Deterministic Intelligence ---

class AnalysisRun(BaseModel):
    """Execution record of deterministic analysis engines on a repository snapshot."""

    id: str
    snapshot_id: str
    status: AnalysisStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    engine_versions: Dict[str, str] = Field(default_factory=dict)
    summary: Dict[str, Any] = Field(default_factory=dict)


class AnalysisFinding(BaseModel):
    """Deterministic, verified fact or issue identified by an analysis engine."""

    id: str
    analysis_run_id: str
    category: FindingCategory
    severity: FindingSeverity
    title: str
    description: str
    file_path: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    rule_id: str
    engine: str
    evidence: Dict[str, Any] = Field(default_factory=dict)


class HealthScore(BaseModel):
    """Aggregated, deterministic multi-dimensional health scoring."""

    overall_score: float = Field(..., ge=0.0, le=100.0)
    security_score: float = Field(..., ge=0.0, le=100.0)
    maintainability_score: float = Field(..., ge=0.0, le=100.0)
    test_coverage_score: float = Field(..., ge=0.0, le=100.0)
    documentation_score: float = Field(..., ge=0.0, le=100.0)
    dependencies_score: float = Field(..., ge=0.0, le=100.0)
    evaluated_at: datetime


class Dependency(BaseModel):
    """Software package or dependency extracted from package manifests."""

    id: str
    name: str
    version: str
    ecosystem: str  # npm, pypi, cargo, maven, etc.
    is_direct: bool = True
    has_vulnerabilities: bool = False
    vulnerability_count: int = 0
    license: Optional[str] = None


class TestMetric(BaseModel):
    """Deterministic test intelligence metric."""

    suite_name: str
    total_tests: int
    passed_tests: int
    failed_tests: int
    skipped_tests: int
    coverage_percentage: Optional[float] = None
    execution_time_seconds: Optional[float] = None


class SecurityFinding(BaseModel):
    """Specific verified vulnerability or security concern with evidence."""

    id: str
    cwe_id: Optional[str] = None
    cve_id: Optional[str] = None
    severity: FindingSeverity
    title: str
    vulnerable_file: str
    line_number: Optional[int] = None
    remediation_guidance: Optional[str] = None
    evidence_snippet: Optional[str] = None


# --- 3. Knowledge Representation ---

class CodeChunk(BaseModel):
    """Semantically coherent syntax chunk of code for indexing."""

    id: str
    file_path: str
    chunk_type: str  # function, class, module, block
    symbol_name: Optional[str] = None
    start_line: int
    end_line: int
    content: str
    token_count: int


class CodeEmbedding(BaseModel):
    """Vector embedding metadata pointing to vector store index."""

    id: str
    chunk_id: str
    vector_id: str
    model_name: str
    dimensions: int
    created_at: datetime


# --- 4. AI Reasoning & Agency ---

class AIConversation(BaseModel):
    """Grounded conversation session over verified repository evidence."""

    id: str
    repository_id: str
    created_at: datetime
    active_snapshot_id: str
    message_count: int = 0


class Recommendation(BaseModel):
    """AI-reasoned, prioritized engineering recommendation based on deterministic evidence."""

    id: str
    priority: int = Field(..., ge=1, le=5)
    title: str
    rationale: str
    impact: str
    effort: str
    grounding_finding_ids: List[str] = Field(default_factory=list)


class AgentTask(BaseModel):
    """Safe, auditable proposal for code modification with diff and validation plan."""

    id: str
    recommendation_id: Optional[str] = None
    status: AgentTaskStatus
    goal_description: str
    proposed_diff: Optional[str] = None
    target_files: List[str] = Field(default_factory=list)
    validation_commands: List[str] = Field(default_factory=list)
    created_at: datetime
