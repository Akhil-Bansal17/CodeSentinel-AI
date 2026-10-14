"""Tests for Phase 5 Codebase Health Intelligence Engine."""

import pytest
from backend.app.models.base import (
    AnalysisRun,
    ArchitectureRun,
    DependencyRun,
    RepositorySnapshot,
)
from backend.app.services.health.health_service import (
    CodebaseHealthEngine,
    DEFAULT_WEIGHTS,
    SCORING_ALGORITHM_VERSION,
)


def test_complete_all_phases_health_calculation():
    """Verify health score when all phases (2, 3, 4, 5, snapshot) are completed and clean."""
    snapshot = RepositorySnapshot(id="snap-1", source_file_count=10)

    # Phase 2: Static Analysis (Clean)
    analysis_run = AnalysisRun(
        id="run-analysis-1",
        status="completed",
        files_analyzed=10,
        files_skipped=0,
        summary_json={
            "severity_distribution": {},
            "category_distribution": {},
        },
    )

    # Phase 3: Dependency SCA (Clean)
    dep_run = DependencyRun(
        id="run-dep-1",
        status="completed",
        vulnerabilities_count=0,
        summary_json={"vulnerabilities_by_severity": {}},
    )

    # Phase 5: Architecture (Clean)
    arch_run = ArchitectureRun(
        id="run-arch-1",
        status="completed",
        cycles_count=0,
        violations_count=0,
        unresolved_count=0,
    )

    health = CodebaseHealthEngine.calculate_health(
        analysis_run=analysis_run,
        dependency_run=dep_run,
        architecture_run=arch_run,
        snapshot=snapshot,
    )

    assert health.scoring_version == SCORING_ALGORITHM_VERSION
    assert health.status == "completed"
    assert health.overall_score == 100.0
    assert len(health.missing_inputs) == 0

    # Check all 5 dimensions are present and HEALTHY
    assert health.dimensions["maintainability"].status == "HEALTHY"
    assert health.dimensions["maintainability"].score == 100.0
    assert health.dimensions["application_security"].status == "HEALTHY"
    assert health.dimensions["application_security"].score == 100.0
    assert health.dimensions["architectural_health"].status == "HEALTHY"
    assert health.dimensions["architectural_health"].score == 100.0
    assert health.dimensions["dependency_risk"].status == "HEALTHY"
    assert health.dimensions["dependency_risk"].score == 100.0
    assert health.dimensions["analysis_coverage"].status == "HEALTHY"
    assert health.dimensions["analysis_coverage"].score == 100.0


def test_deductions_and_recommendations_generation():
    """Verify deductions across dimensions trigger prioritized recommendations."""
    snapshot = RepositorySnapshot(id="snap-1", source_file_count=20)

    # Security findings (1 critical, 1 high)
    # Maintainability findings (2 complexity, 1 code smell)
    analysis_run = AnalysisRun(
        id="run-analysis-2",
        status="completed",
        files_analyzed=15,
        files_skipped=5,
        summary_json={
            "severity_distribution": {"CRITICAL": 1, "HIGH": 1},
            "category_distribution": {"SECURITY": 2, "COMPLEXITY": 2, "CODE_SMELL": 1},
        },
    )

    # Dependency SCA (1 critical vulnerability)
    dep_run = DependencyRun(
        id="run-dep-2",
        status="completed",
        vulnerabilities_count=1,
        summary_json={"vulnerabilities_by_severity": {"CRITICAL": 1}},
    )

    # Architecture (1 cycle, 2 violations)
    arch_run = ArchitectureRun(
        id="run-arch-2",
        status="completed",
        cycles_count=1,
        violations_count=2,
        unresolved_count=0,
    )

    health = CodebaseHealthEngine.calculate_health(
        analysis_run=analysis_run,
        dependency_run=dep_run,
        architecture_run=arch_run,
        snapshot=snapshot,
    )

    assert health.status == "completed"
    assert health.overall_score < 100.0

    # Dependency risk deduction: 100 - (1 * 25) = 75.0
    assert health.dimensions["dependency_risk"].score == 75.0

    # Architecture deduction: 100 - (10.0 + 30.0) = 60.0
    assert health.dimensions["architectural_health"].score == 60.0

    # Security deduction: 100 - (25.0 + 15.0) = 60.0
    assert health.dimensions["application_security"].score == 60.0

    # Verify recommendations are ordered by priority (CRITICAL first, then HIGH)
    assert len(health.recommendations) > 0
    assert health.recommendations[0]["priority"] == "CRITICAL"


def test_missing_runs_returns_partial_status():
    """Verify missing architecture or dependency runs results in 'partial' status without fabricating scores."""
    snapshot = RepositorySnapshot(id="snap-1", source_file_count=10)

    analysis_run = AnalysisRun(
        id="run-analysis-3",
        status="completed",
        files_analyzed=10,
        files_skipped=0,
        summary_json={},
    )

    # No dependency_run and no architecture_run
    health = CodebaseHealthEngine.calculate_health(
        analysis_run=analysis_run,
        dependency_run=None,
        architecture_run=None,
        snapshot=snapshot,
    )

    assert health.status == "partial"
    assert health.overall_score is not None  # Re-normalized over available dimensions
    assert health.dimensions["dependency_risk"].status == "UNAVAILABLE"
    assert health.dimensions["dependency_risk"].score is None
    assert health.dimensions["architectural_health"].status == "UNAVAILABLE"
    assert health.dimensions["architectural_health"].score is None
    assert len(health.missing_inputs) >= 2


def test_completely_missing_runs_returns_unavailable():
    """Verify completely missing analyses returns unavailable status."""
    health = CodebaseHealthEngine.calculate_health(
        analysis_run=None,
        dependency_run=None,
        architecture_run=None,
        snapshot=None,
    )

    assert health.status == "unavailable"
    assert health.overall_score is None
