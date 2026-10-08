"""Service boundary protocols and architectural interfaces for CodeSentinel AI.

These protocols establish clear contracts for future engine and service implementations,
enforcing separation between deterministic analysis and AI reasoning.
"""

from typing import Any, Dict, List, Optional, Protocol, runtime_checkable
from backend.app.schemas.domain import (
    AgentTask,
    AIConversation,
    AnalysisFinding,
    AnalysisRun,
    CodeChunk,
    CodeEmbedding,
    Dependency,
    HealthScore,
    Recommendation,
    RepositoryFile,
    RepositorySnapshot,
    SecurityFinding,
    TestMetric,
)


@runtime_checkable
class RepositoryService(Protocol):
    """Handles repository connectivity, snapshot creation, and workspace file management."""

    async def register_repository(self, name: str, remote_url: Optional[str] = None) -> Dict[str, Any]:
        ...

    async def list_repositories(self) -> List[Dict[str, Any]]:
        ...

    async def get_repository(self, repository_id: str) -> Optional[Dict[str, Any]]:
        ...

    async def create_snapshot(self, repository_id: str, commit_sha: str) -> RepositorySnapshot:
        ...


@runtime_checkable
class AnalysisService(Protocol):
    """Orchestrates deterministic analysis runs across a repository snapshot."""

    async def trigger_analysis(self, snapshot_id: str) -> AnalysisRun:
        ...

    async def get_analysis_status(self, run_id: str) -> AnalysisRun:
        ...

    async def calculate_health_score(self, run_id: str) -> HealthScore:
        ...


@runtime_checkable
class CodeIntelligenceService(Protocol):
    """Deterministic code parsing, AST extraction, language detection, and symbol graphing."""

    async def discover_files(self, snapshot_id: str) -> List[RepositoryFile]:
        ...

    async def parse_ast(self, file_id: str) -> Dict[str, Any]:
        ...

    async def extract_symbols(self, file_id: str) -> List[Dict[str, Any]]:
        ...


@runtime_checkable
class SecurityAnalysisService(Protocol):
    """Deterministic security scanning, SAST, secret detection, and CVE correlation."""

    async def scan_security(self, snapshot_id: str) -> List[SecurityFinding]:
        ...


@runtime_checkable
class DependencyAnalysisService(Protocol):
    """Deterministic dependency manifest parsing and license/vulnerability audit."""

    async def audit_dependencies(self, snapshot_id: str) -> List[Dependency]:
        ...


@runtime_checkable
class TestAnalysisService(Protocol):
    """Deterministic test intelligence, suite discovery, coverage analysis, and flaky test detection."""

    async def evaluate_tests(self, snapshot_id: str) -> List[TestMetric]:
        ...


@runtime_checkable
class DocumentationAnalysisService(Protocol):
    """Deterministic documentation completeness, docstring coverage, and API spec analysis."""

    async def evaluate_docs(self, snapshot_id: str) -> Dict[str, Any]:
        ...


@runtime_checkable
class EmbeddingService(Protocol):
    """Vector embedding generation for syntax code chunks and documentation."""

    async def chunk_codebase(self, snapshot_id: str) -> List[CodeChunk]:
        ...

    async def generate_embeddings(self, chunks: List[CodeChunk]) -> List[CodeEmbedding]:
        ...


@runtime_checkable
class RAGService(Protocol):
    """Retrieval-augmented grounding service over verified repository evidence."""

    async def retrieve_context(self, query: str, repository_id: str, top_k: int = 5) -> List[Dict[str, Any]]:
        ...


@runtime_checkable
class AIService(Protocol):
    """Grounded AI reasoning over deterministic repository findings."""

    async def chat(self, conversation_id: str, prompt: str, grounded_evidence: List[Dict[str, Any]]) -> str:
        ...

    async def explain_finding(self, finding: AnalysisFinding) -> str:
        ...


@runtime_checkable
class RecommendationService(Protocol):
    """Prioritizes and synthesizes verified deterministic findings into engineering recommendations."""

    async def generate_recommendations(self, run_id: str) -> List[Recommendation]:
        ...


@runtime_checkable
class AgentService(Protocol):
    """Safely plans and proposes auditable code modifications with strict verification bounds."""

    async def propose_task(self, recommendation_id: str, user_prompt: str) -> AgentTask:
        ...

    async def validate_task(self, task_id: str) -> Dict[str, Any]:
        ...
