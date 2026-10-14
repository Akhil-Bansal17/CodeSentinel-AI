"""Deterministic Codebase Health Intelligence Engine for CodeSentinel AI.

Synthesizes persisted, evidence-backed diagnostics across:
1. Maintainability (Phase 2 static code metrics)
2. Dependency Risk (Phase 3 SCA vulnerability intelligence)
3. Application Security (Phase 4 deterministic security rules)
4. Architectural Health (Phase 5 coupling, cycles, and governance)
5. Analysis Coverage (parser success and file coverage)

Emits versioned, reproducible health assessments on a 0-100 scale with explicit
handling for missing or partial analysis phases.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import uuid

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from backend.app.core.exceptions import NotFoundError, ValidationError
from backend.app.models.base import (
    AnalysisRun,
    ArchitectureRun,
    CodebaseHealthAssessment,
    DependencyRun,
    Repository,
    RepositorySnapshot,
)

SCORING_ALGORITHM_VERSION = "1.0.0"

# Standard dimension weights (sum to 1.0)
DEFAULT_WEIGHTS = {
    "maintainability": 0.25,
    "application_security": 0.25,
    "architectural_health": 0.20,
    "dependency_risk": 0.20,
    "analysis_coverage": 0.10,
}


@dataclass
class HealthDimensionResult:
    """Individual health dimension assessment."""

    name: str
    score: Optional[float]  # 0.0 - 100.0, or None if unavailable
    status: str  # "HEALTHY" (>=80), "WARNING" (60-79), "CRITICAL" (<60), "UNAVAILABLE"
    weight: float
    contribution: Optional[float]  # score * weight
    metrics: Dict[str, Any] = field(default_factory=dict)
    reasons: List[str] = field(default_factory=list)


@dataclass
class CodebaseHealthResult:
    """Complete, deterministic codebase health assessment."""

    scoring_version: str = SCORING_ALGORITHM_VERSION
    overall_score: Optional[float] = None
    status: str = "completed"  # "completed", "partial", "unavailable"
    dimensions: Dict[str, HealthDimensionResult] = field(default_factory=dict)
    contributing_runs: Dict[str, Optional[str]] = field(default_factory=dict)
    missing_inputs: List[str] = field(default_factory=list)
    recommendations: List[Dict[str, Any]] = field(default_factory=list)
    assessed_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CodebaseHealthEngine:
    """Calculates deterministic codebase health scores from multi-phase analysis runs."""

    @classmethod
    def calculate_health(
        cls,
        analysis_run: Optional[Any] = None,  # AnalysisRun model or dict
        dependency_run: Optional[Any] = None,  # DependencyRun model or dict
        architecture_run: Optional[Any] = None,  # ArchitectureRun model or dict
        snapshot: Optional[Any] = None,  # RepositorySnapshot model or dict
    ) -> CodebaseHealthResult:
        """Compute an explainable, deterministic health assessment."""
        result = CodebaseHealthResult()
        recommendations: List[Dict[str, Any]] = []

        # Record contributing runs
        result.contributing_runs = {
            "analysis_run_id": getattr(analysis_run, "id", None) if analysis_run else None,
            "dependency_run_id": getattr(dependency_run, "id", None) if dependency_run else None,
            "architecture_run_id": getattr(architecture_run, "id", None) if architecture_run else None,
            "snapshot_id": getattr(snapshot, "id", None) if snapshot else None,
        }

        # -------------------------------------------------------------
        # 1. Maintainability Dimension (Phase 2 Static Analysis)
        # -------------------------------------------------------------
        if analysis_run and getattr(analysis_run, "status", None) == "completed":
            summary = getattr(analysis_run, "summary_json", {}) or {}
            sev_dist = summary.get("severity_distribution", {}) or {}
            cat_dist = summary.get("category_distribution", {}) or {}

            complexity_findings = cat_dist.get("COMPLEXITY", 0)
            smell_findings = cat_dist.get("CODE_SMELL", 0)
            maintainability_findings = cat_dist.get("MAINTAINABILITY", 0)

            # Deductions
            deductions = 0.0
            deductions += complexity_findings * 4.0
            deductions += smell_findings * 2.0
            deductions += maintainability_findings * 3.0

            maint_score = max(0.0, min(100.0, round(100.0 - deductions, 1)))

            maint_reasons = []
            if complexity_findings > 0:
                maint_reasons.append(f"{complexity_findings} functions exceed cyclomatic complexity threshold (10)")
                recommendations.append({
                    "priority": "HIGH" if complexity_findings >= 3 else "MEDIUM",
                    "dimension": "maintainability",
                    "title": f"Refactor {complexity_findings} high-complexity functions",
                    "action": "Decompose complex conditional logic and nested loops into smaller helper methods.",
                })
            if smell_findings > 0:
                maint_reasons.append(f"{smell_findings} code smell issues detected (e.g. duplicate imports)")
            if not maint_reasons:
                maint_reasons.append("Code complexity and function lengths are within acceptable thresholds")

            maint_status = "HEALTHY" if maint_score >= 80 else ("WARNING" if maint_score >= 60 else "CRITICAL")
            result.dimensions["maintainability"] = HealthDimensionResult(
                name="Maintainability",
                score=maint_score,
                status=maint_status,
                weight=DEFAULT_WEIGHTS["maintainability"],
                contribution=round(maint_score * DEFAULT_WEIGHTS["maintainability"], 2),
                metrics={
                    "complexity_findings": complexity_findings,
                    "code_smell_findings": smell_findings,
                    "maintainability_findings": maintainability_findings,
                },
                reasons=maint_reasons,
            )
        else:
            result.missing_inputs.append("Static code analysis (Phase 2) is missing or incomplete")
            result.dimensions["maintainability"] = HealthDimensionResult(
                name="Maintainability",
                score=None,
                status="UNAVAILABLE",
                weight=DEFAULT_WEIGHTS["maintainability"],
                contribution=None,
                reasons=["No completed static analysis run available for this snapshot"],
            )

        # -------------------------------------------------------------
        # 2. Application Security Dimension (Phase 4 Security Intelligence)
        # -------------------------------------------------------------
        if analysis_run and getattr(analysis_run, "status", None) == "completed":
            summary = getattr(analysis_run, "summary_json", {}) or {}
            cat_dist = summary.get("category_distribution", {}) or {}
            sec_count = cat_dist.get("SECURITY", 0)

            # Inspect findings list if present
            findings = getattr(analysis_run, "findings", []) or []
            sec_findings = [f for f in findings if getattr(f, "category", "") == "SECURITY"]

            sec_deductions = 0.0
            crit_count = 0
            high_count = 0
            med_count = 0
            low_count = 0

            for f in sec_findings:
                sev = getattr(f, "severity", "MEDIUM")
                conf = getattr(f, "confidence", "MEDIUM")
                if sev == "CRITICAL":
                    sec_deductions += 25.0
                    crit_count += 1
                elif sev == "HIGH":
                    sec_deductions += 18.0 if conf == "HIGH" else 12.0
                    high_count += 1
                elif sev == "MEDIUM":
                    sec_deductions += 6.0
                    med_count += 1
                else:
                    sec_deductions += 2.0
                    low_count += 1

            # If findings relationship wasn't loaded, fallback to severity distribution
            if not sec_findings and sec_count > 0:
                sev_dist = summary.get("severity_distribution", {}) or {}
                crit_count = sev_dist.get("CRITICAL", 0)
                high_count = sev_dist.get("HIGH", 0)
                med_count = sev_dist.get("MEDIUM", 0)
                low_count = sev_dist.get("LOW", 0)
                sec_deductions = (crit_count * 25.0) + (high_count * 15.0) + (med_count * 6.0) + (low_count * 2.0)

            sec_score = max(0.0, min(100.0, round(100.0 - sec_deductions, 1)))

            sec_reasons = []
            if crit_count > 0:
                sec_reasons.append(f"{crit_count} critical application security vulnerabilities detected")
                recommendations.append({
                    "priority": "CRITICAL",
                    "dimension": "application_security",
                    "title": f"Remediate {crit_count} critical security sinks",
                    "action": "Eliminate raw code execution or unescaped HTML injection points immediately.",
                })
            if high_count > 0:
                sec_reasons.append(f"{high_count} high-risk security patterns detected")
                recommendations.append({
                    "priority": "HIGH",
                    "dimension": "application_security",
                    "title": f"Review {high_count} high-severity security patterns",
                    "action": "Replace dangerous deserialization, shell calls, or dynamic SQL queries with safe APIs.",
                })
            if med_count > 0:
                sec_reasons.append(f"{med_count} medium-risk security patterns detected")
            if not sec_reasons:
                sec_reasons.append("Zero security anti-patterns detected under documented deterministic rules")

            sec_status = "HEALTHY" if sec_score >= 80 else ("WARNING" if sec_score >= 60 else "CRITICAL")
            result.dimensions["application_security"] = HealthDimensionResult(
                name="Application Security",
                score=sec_score,
                status=sec_status,
                weight=DEFAULT_WEIGHTS["application_security"],
                contribution=round(sec_score * DEFAULT_WEIGHTS["application_security"], 2),
                metrics={
                    "security_findings_count": sec_count,
                    "critical": crit_count,
                    "high": high_count,
                    "medium": med_count,
                    "low": low_count,
                },
                reasons=sec_reasons,
            )
        else:
            result.missing_inputs.append("Application security analysis (Phase 4) is missing or incomplete")
            result.dimensions["application_security"] = HealthDimensionResult(
                name="Application Security",
                score=None,
                status="UNAVAILABLE",
                weight=DEFAULT_WEIGHTS["application_security"],
                contribution=None,
                reasons=["No completed analysis run available for security assessment"],
            )

        # -------------------------------------------------------------
        # 3. Architectural Health Dimension (Phase 5)
        # -------------------------------------------------------------
        if architecture_run and getattr(architecture_run, "status", None) == "completed":
            cycles_count = getattr(architecture_run, "cycles_count", 0)
            violations_count = getattr(architecture_run, "violations_count", 0)
            unresolved_count = getattr(architecture_run, "unresolved_count", 0)

            arch_deductions = 0.0
            arch_deductions += min(40.0, cycles_count * 10.0)
            arch_deductions += min(50.0, violations_count * 15.0)
            arch_deductions += min(20.0, unresolved_count * 2.0)

            arch_score = max(0.0, min(100.0, round(100.0 - arch_deductions, 1)))

            arch_reasons = []
            if violations_count > 0:
                arch_reasons.append(f"{violations_count} architectural layer/boundary policy violations")
                recommendations.append({
                    "priority": "HIGH",
                    "dimension": "architectural_health",
                    "title": f"Resolve {violations_count} architectural layer violations",
                    "action": "Enforce strict dependency directions between presentation, domain, and infrastructure layers.",
                })
            if cycles_count > 0:
                arch_reasons.append(f"{cycles_count} circular dependency components detected")
                recommendations.append({
                    "priority": "MEDIUM",
                    "dimension": "architectural_health",
                    "title": f"Decouple {cycles_count} cyclic module dependencies",
                    "action": "Break circular imports by introducing abstractions or moving shared logic to a common module.",
                })
            if unresolved_count > 0:
                arch_reasons.append(f"{unresolved_count} unresolved imports found")
            if not arch_reasons:
                arch_reasons.append("Clean module dependency graph with no detected cycles or layer violations")

            arch_status = "HEALTHY" if arch_score >= 80 else ("WARNING" if arch_score >= 60 else "CRITICAL")
            result.dimensions["architectural_health"] = HealthDimensionResult(
                name="Architectural Health",
                score=arch_score,
                status=arch_status,
                weight=DEFAULT_WEIGHTS["architectural_health"],
                contribution=round(arch_score * DEFAULT_WEIGHTS["architectural_health"], 2),
                metrics={
                    "cycles_count": cycles_count,
                    "violations_count": violations_count,
                    "unresolved_imports": unresolved_count,
                },
                reasons=arch_reasons,
            )
        else:
            result.missing_inputs.append("Architectural dependency analysis (Phase 5) is missing or incomplete")
            result.dimensions["architectural_health"] = HealthDimensionResult(
                name="Architectural Health",
                score=None,
                status="UNAVAILABLE",
                weight=DEFAULT_WEIGHTS["architectural_health"],
                contribution=None,
                reasons=["No completed architectural run available for this snapshot"],
            )

        # -------------------------------------------------------------
        # 4. Dependency Risk Dimension (Phase 3 SCA)
        # -------------------------------------------------------------
        if dependency_run and getattr(dependency_run, "status", None) == "completed":
            vuln_count = getattr(dependency_run, "vulnerabilities_count", 0)
            summary = getattr(dependency_run, "summary_json", {}) or {}
            vulns_by_sev = summary.get("vulnerabilities_by_severity", {}) or {}

            crit_vulns = vulns_by_sev.get("CRITICAL", 0)
            high_vulns = vulns_by_sev.get("HIGH", 0)
            med_vulns = vulns_by_sev.get("MEDIUM", 0)
            low_vulns = vulns_by_sev.get("LOW", 0)

            dep_deductions = (crit_vulns * 25.0) + (high_vulns * 15.0) + (med_vulns * 8.0) + (low_vulns * 3.0)
            dep_score = max(0.0, min(100.0, round(100.0 - dep_deductions, 1)))

            dep_reasons = []
            if crit_vulns > 0:
                dep_reasons.append(f"{crit_vulns} critical vulnerabilities in external dependencies")
                recommendations.append({
                    "priority": "CRITICAL",
                    "dimension": "dependency_risk",
                    "title": f"Upgrade {crit_vulns} critical vulnerable packages",
                    "action": "Check remediation versions in dependency inventory and bump lockfile requirements.",
                })
            if high_vulns > 0:
                dep_reasons.append(f"{high_vulns} high vulnerabilities in external dependencies")
                recommendations.append({
                    "priority": "HIGH",
                    "dimension": "dependency_risk",
                    "title": f"Upgrade {high_vulns} high-severity vulnerable packages",
                    "action": "Update third-party dependencies to patched release versions.",
                })
            if med_vulns > 0:
                dep_reasons.append(f"{med_vulns} medium vulnerabilities in dependencies")
            if not dep_reasons:
                dep_reasons.append("All discovered packages match zero known vulnerability advisories")

            dep_status = "HEALTHY" if dep_score >= 80 else ("WARNING" if dep_score >= 60 else "CRITICAL")
            result.dimensions["dependency_risk"] = HealthDimensionResult(
                name="Dependency Risk",
                score=dep_score,
                status=dep_status,
                weight=DEFAULT_WEIGHTS["dependency_risk"],
                contribution=round(dep_score * DEFAULT_WEIGHTS["dependency_risk"], 2),
                metrics={
                    "total_vulnerabilities": vuln_count,
                    "critical": crit_vulns,
                    "high": high_vulns,
                    "medium": med_vulns,
                    "low": low_vulns,
                },
                reasons=dep_reasons,
            )
        else:
            result.missing_inputs.append("Dependency SCA analysis (Phase 3) is missing or incomplete")
            result.dimensions["dependency_risk"] = HealthDimensionResult(
                name="Dependency Risk",
                score=None,
                status="UNAVAILABLE",
                weight=DEFAULT_WEIGHTS["dependency_risk"],
                contribution=None,
                reasons=["No completed dependency SCA run available for this snapshot"],
            )

        # -------------------------------------------------------------
        # 5. Analysis Coverage Dimension
        # -------------------------------------------------------------
        if snapshot:
            source_files = getattr(snapshot, "source_file_count", 0) or 1
            analyzed_files = getattr(analysis_run, "files_analyzed", 0) if analysis_run else 0
            skipped_files = getattr(analysis_run, "files_skipped", 0) if analysis_run else 0

            coverage_pct = round((min(analyzed_files, source_files) / max(1, source_files)) * 100.0, 1)
            cov_score = max(0.0, min(100.0, coverage_pct))

            cov_reasons = [f"{analyzed_files} of {source_files} source files analyzed ({coverage_pct}%)"]
            if skipped_files > 0:
                cov_reasons.append(f"{skipped_files} files skipped due to limits or non-source format")

            cov_status = "HEALTHY" if cov_score >= 80 else ("WARNING" if cov_score >= 50 else "CRITICAL")
            result.dimensions["analysis_coverage"] = HealthDimensionResult(
                name="Analysis Coverage",
                score=cov_score,
                status=cov_status,
                weight=DEFAULT_WEIGHTS["analysis_coverage"],
                contribution=round(cov_score * DEFAULT_WEIGHTS["analysis_coverage"], 2),
                metrics={
                    "source_files_count": source_files,
                    "analyzed_files_count": analyzed_files,
                    "skipped_files_count": skipped_files,
                    "coverage_percentage": coverage_pct,
                },
                reasons=cov_reasons,
            )
        else:
            result.dimensions["analysis_coverage"] = HealthDimensionResult(
                name="Analysis Coverage",
                score=None,
                status="UNAVAILABLE",
                weight=DEFAULT_WEIGHTS["analysis_coverage"],
                contribution=None,
                reasons=["Repository snapshot metadata not supplied"],
            )

        # -------------------------------------------------------------
        # Overall Composite Calculation
        # -------------------------------------------------------------
        available_dims = [d for d in result.dimensions.values() if d.score is not None]

        if not available_dims or (result.dimensions["maintainability"].score is None and result.dimensions["application_security"].score is None):
            result.overall_score = None
            result.status = "unavailable"
        else:
            # Re-normalize weights over available dimensions
            total_weight = sum(d.weight for d in available_dims)
            if total_weight > 0:
                raw_overall = sum(d.score * (d.weight / total_weight) for d in available_dims)
                result.overall_score = round(raw_overall, 1)
                result.status = "completed" if len(available_dims) == len(result.dimensions) else "partial"
            else:
                result.overall_score = None
                result.status = "unavailable"

        # Prioritize recommendations
        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        recommendations.sort(key=lambda r: priority_order.get(r.get("priority", "MEDIUM"), 99))
        result.recommendations = recommendations

        return result


class CodebaseHealthService:
    """Service orchestrating multi-phase codebase health calculation and persistence."""

    def __init__(self, db: Session):
        self.db = db

    def get_assessment_by_id(self, assessment_id: str) -> Optional[CodebaseHealthAssessment]:
        """Fetch a CodebaseHealthAssessment by ID."""
        stmt = select(CodebaseHealthAssessment).where(CodebaseHealthAssessment.id == assessment_id)
        return self.db.scalars(stmt).first()

    def list_assessments_for_repository(
        self,
        repository_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[CodebaseHealthAssessment], int]:
        """List historical health assessments for a repository paginated with deterministic ordering."""
        repo = self.db.scalar(select(Repository).where(Repository.id == repository_id))
        if not repo:
            raise NotFoundError("Repository", repository_id)

        count_stmt = select(func.count(CodebaseHealthAssessment.id)).where(
            CodebaseHealthAssessment.repository_id == repository_id
        )
        total = self.db.scalar(count_stmt) or 0

        offset = (page - 1) * page_size
        stmt = (
            select(CodebaseHealthAssessment)
            .where(CodebaseHealthAssessment.repository_id == repository_id)
            .order_by(desc(CodebaseHealthAssessment.created_at))
            .offset(offset)
            .limit(page_size)
        )
        assessments = self.db.scalars(stmt).all()
        return list(assessments), total

    def get_or_compute_health(
        self,
        repository_id: str,
        snapshot_id: Optional[str] = None,
    ) -> CodebaseHealthAssessment:
        """Retrieve latest assessment or deterministically compute and persist a new health assessment."""
        repo = self.db.scalar(select(Repository).where(Repository.id == repository_id))
        if not repo:
            raise NotFoundError("Repository", repository_id)

        # 1. Resolve snapshot
        if snapshot_id:
            stmt = select(RepositorySnapshot).where(
                RepositorySnapshot.id == snapshot_id,
                RepositorySnapshot.repository_id == repository_id,
            )
            snapshot = self.db.scalars(stmt).first()
            if not snapshot:
                raise NotFoundError("Snapshot", snapshot_id)
        else:
            stmt = (
                select(RepositorySnapshot)
                .where(
                    RepositorySnapshot.repository_id == repository_id,
                    RepositorySnapshot.status == "completed",
                )
                .order_by(desc(RepositorySnapshot.started_at))
                .limit(1)
            )
            snapshot = self.db.scalars(stmt).first()

        if not snapshot:
            raise ValidationError(
                "No completed snapshot is available for health assessment.",
                details={"repository_id": repository_id},
            )

        # 2. Query latest completed runs for this snapshot
        analysis_run = self.db.scalar(
            select(AnalysisRun)
            .where(
                AnalysisRun.snapshot_id == snapshot.id,
                AnalysisRun.status == "completed",
            )
            .order_by(desc(AnalysisRun.started_at))
            .limit(1)
        )

        dependency_run = self.db.scalar(
            select(DependencyRun)
            .where(
                DependencyRun.snapshot_id == snapshot.id,
                DependencyRun.status == "completed",
            )
            .order_by(desc(DependencyRun.started_at))
            .limit(1)
        )

        architecture_run = self.db.scalar(
            select(ArchitectureRun)
            .where(
                ArchitectureRun.snapshot_id == snapshot.id,
                ArchitectureRun.status == "completed",
            )
            .order_by(desc(ArchitectureRun.started_at))
            .limit(1)
        )

        # 3. Compute deterministic health
        health_result: CodebaseHealthResult = CodebaseHealthEngine.calculate_health(
            analysis_run=analysis_run,
            dependency_run=dependency_run,
            architecture_run=architecture_run,
            snapshot=snapshot,
        )

        # 4. Check if assessment record already exists for this snapshot and runs
        existing_assessment = self.db.scalar(
            select(CodebaseHealthAssessment)
            .where(
                CodebaseHealthAssessment.repository_id == repository_id,
                CodebaseHealthAssessment.snapshot_id == snapshot.id,
            )
            .order_by(desc(CodebaseHealthAssessment.created_at))
            .limit(1)
        )

        dimensions_dict = {
            k: {
                "name": v.name,
                "score": v.score,
                "status": v.status,
                "weight": v.weight,
                "contribution": v.contribution,
                "metrics": v.metrics,
                "reasons": v.reasons,
            }
            for k, v in health_result.dimensions.items()
        }

        if existing_assessment:
            # Update existing record
            existing_assessment.analysis_run_id = analysis_run.id if analysis_run else None
            existing_assessment.dependency_run_id = dependency_run.id if dependency_run else None
            existing_assessment.architecture_run_id = architecture_run.id if architecture_run else None
            existing_assessment.scoring_version = health_result.scoring_version
            existing_assessment.overall_score = health_result.overall_score
            existing_assessment.status = health_result.status
            existing_assessment.dimensions_json = dimensions_dict
            existing_assessment.metrics_json = {
                "contributing_runs": health_result.contributing_runs,
                "missing_inputs": health_result.missing_inputs,
            }
            existing_assessment.recommendations_json = health_result.recommendations
            self.db.commit()
            self.db.refresh(existing_assessment)
            return existing_assessment

        # Create new record
        assessment = CodebaseHealthAssessment(
            id=str(uuid.uuid4()),
            repository_id=repository_id,
            snapshot_id=snapshot.id,
            analysis_run_id=analysis_run.id if analysis_run else None,
            dependency_run_id=dependency_run.id if dependency_run else None,
            architecture_run_id=architecture_run.id if architecture_run else None,
            scoring_version=health_result.scoring_version,
            overall_score=health_result.overall_score,
            status=health_result.status,
            dimensions_json=dimensions_dict,
            metrics_json={
                "contributing_runs": health_result.contributing_runs,
                "missing_inputs": health_result.missing_inputs,
            },
            recommendations_json=health_result.recommendations,
        )
        self.db.add(assessment)
        self.db.commit()
        self.db.refresh(assessment)
        return assessment

