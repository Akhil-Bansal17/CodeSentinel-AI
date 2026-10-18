"""Reusable, multi-pillar audit orchestration runner for CodeSentinel AI."""

from datetime import datetime, timezone
import time
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.base import (
    AnalysisRun,
    ArchitectureRun,
    AuditRun,
    CodebaseHealthAssessment,
    DependencyRun,
    RemediationProposal,
    Repository,
    RepositorySnapshot,
)
from backend.app.schemas.cicd import AuditCheckItem, AuditRunResponse, AuditRunSummary
from backend.app.services.audit.sarif_exporter import SarifExporter


class AuditRunner:
    """Orchestrates comprehensive, read-only multi-pillar audits across Phases 1-7."""

    @classmethod
    def execute_audit(cls, db: Session, repository_id: str, snapshot_id: Optional[str] = None) -> AuditRunResponse:
        """Execute all supported audit checks against a repository snapshot."""
        repo = db.query(Repository).filter(Repository.id == repository_id).first()
        if not repo:
            raise ValueError(f"Repository not found: {repository_id}")

        if snapshot_id:
            snapshot = (
                db.query(RepositorySnapshot)
                .filter(RepositorySnapshot.id == snapshot_id, RepositorySnapshot.repository_id == repository_id)
                .first()
            )
        else:
            snapshot = (
                db.query(RepositorySnapshot)
                .filter(RepositorySnapshot.repository_id == repository_id)
                .order_by(RepositorySnapshot.started_at.desc())
                .first()
            )

        if not snapshot:
            raise ValueError(f"No snapshot found for repository: {repository_id}")

        started_at = datetime.now(timezone.utc)
        checks: List[AuditCheckItem] = []
        all_findings: List[Dict[str, Any]] = []

        # ====================================================================
        # Check 1: Ingestion & Snapshot Integrity
        # ====================================================================
        t0 = time.perf_counter()
        file_count = snapshot.file_count or 0
        source_count = snapshot.source_file_count or 0
        snap_status = "PASSED" if snapshot.status == "completed" and file_count > 0 else "WARNING"
        checks.append(
            AuditCheckItem(
                check_id="AUDIT-INGEST-001",
                category="INGESTION",
                name="Snapshot Integrity & File Inventory",
                status=snap_status,
                description="Verifies snapshot completeness, SHA-256 fingerprinting, and file classification.",
                details={
                    "snapshot_id": snapshot.id,
                    "file_count": file_count,
                    "source_file_count": source_count,
                    "status": snapshot.status,
                },
                duration_ms=int((time.perf_counter() - t0) * 1000),
            )
        )

        # ====================================================================
        # Check 2: Static Code Quality & AST Complexity (Phase 2)
        # ====================================================================
        t0 = time.perf_counter()
        latest_analysis = (
            db.query(AnalysisRun)
            .filter(AnalysisRun.repository_id == repository_id, AnalysisRun.snapshot_id == snapshot.id)
            .order_by(AnalysisRun.started_at.desc())
            .first()
        )
        if latest_analysis and latest_analysis.status == "completed":
            complexity_findings = [f for f in latest_analysis.findings if "COMPLEXITY" in f.rule_id or "FUNCTION" in f.rule_id]
            quality_status = "FAILED" if len(complexity_findings) > 10 else ("WARNING" if complexity_findings else "PASSED")
            for f in complexity_findings:
                all_findings.append({
                    "rule_id": f.rule_id,
                    "rule_name": f.rule_name,
                    "category": "COMPLEXITY",
                    "severity": f.severity,
                    "confidence": f.confidence,
                    "file_path": f.file_path,
                    "start_line": f.start_line,
                    "start_column": f.start_column,
                    "end_line": f.end_line,
                    "end_column": f.end_column,
                    "evidence_summary": f.evidence_summary,
                    "fingerprint": f.fingerprint,
                })
            checks.append(
                AuditCheckItem(
                    check_id="AUDIT-STATIC-001",
                    category="STATIC_ANALYSIS",
                    name="AST Cyclomatic Complexity & Function Boundaries",
                    status=quality_status,
                    description="Evaluates McCabe cyclomatic complexity and function length thresholds.",
                    details={
                        "analysis_run_id": latest_analysis.id,
                        "complexity_findings_count": len(complexity_findings),
                        "total_findings": getattr(latest_analysis, "findings_count", getattr(latest_analysis, "total_findings", 0)),
                    },
                    duration_ms=int((time.perf_counter() - t0) * 1000),
                )
            )
        else:
            checks.append(
                AuditCheckItem(
                    check_id="AUDIT-STATIC-001",
                    category="STATIC_ANALYSIS",
                    name="AST Cyclomatic Complexity & Function Boundaries",
                    status="SKIPPED",
                    description="Evaluates McCabe cyclomatic complexity and function length thresholds.",
                    details={"reason": "Static analysis has not been executed for this snapshot."},
                    duration_ms=int((time.perf_counter() - t0) * 1000),
                )
            )

        # ====================================================================
        # Check 3: Software Composition Analysis & Vulnerabilities (Phase 3)
        # ====================================================================
        t0 = time.perf_counter()
        latest_dep = (
            db.query(DependencyRun)
            .filter(DependencyRun.repository_id == repository_id, DependencyRun.snapshot_id == snapshot.id)
            .order_by(DependencyRun.started_at.desc())
            .first()
        )
        if latest_dep and latest_dep.status == "completed":
            vulns = latest_dep.vulnerabilities
            has_crit = any(v.severity == "CRITICAL" for v in vulns)
            has_high = any(v.severity == "HIGH" for v in vulns)
            sca_status = "FAILED" if (has_crit or has_high) else ("WARNING" if vulns else "PASSED")
            for v in vulns:
                all_findings.append({
                    "rule_id": f"VULN-{v.advisory_id}",
                    "rule_name": f"Dependency Vulnerability in {v.package_name}",
                    "category": "DEPENDENCY_SCA",
                    "severity": v.severity,
                    "confidence": "HIGH",
                    "file_path": v.manifest_path,
                    "start_line": 1,
                    "start_column": 1,
                    "end_line": 1,
                    "end_column": 1,
                    "evidence_summary": f"Vulnerability {v.advisory_id} in {v.package_name} ({v.resolved_version})",
                    "fingerprint": v.fingerprint,
                })
            checks.append(
                AuditCheckItem(
                    check_id="AUDIT-SCA-001",
                    category="DEPENDENCY_SCA",
                    name="Software Composition Analysis & Known Vulnerabilities",
                    status=sca_status,
                    description="Scans direct and transitive dependencies against local OSV advisory catalog.",
                    details={
                        "dependency_run_id": latest_dep.id,
                        "dependencies_count": latest_dep.dependencies_discovered,
                        "vulnerabilities_count": len(vulns),
                    },
                    duration_ms=int((time.perf_counter() - t0) * 1000),
                )
            )
        else:
            checks.append(
                AuditCheckItem(
                    check_id="AUDIT-SCA-001",
                    category="DEPENDENCY_SCA",
                    name="Software Composition Analysis & Known Vulnerabilities",
                    status="SKIPPED",
                    description="Scans direct and transitive dependencies against local OSV advisory catalog.",
                    details={"reason": "Dependency analysis has not been executed for this snapshot."},
                    duration_ms=int((time.perf_counter() - t0) * 1000),
                )
            )

        # ====================================================================
        # Check 4: Application Security Intelligence (Phase 4)
        # ====================================================================
        t0 = time.perf_counter()
        if latest_analysis and latest_analysis.status == "completed":
            sec_findings = [f for f in latest_analysis.findings if "SEC" in f.rule_id]
            has_crit_sec = any(f.severity == "CRITICAL" for f in sec_findings)
            has_high_sec = any(f.severity == "HIGH" for f in sec_findings)
            sec_status = "FAILED" if (has_crit_sec or has_high_sec) else ("WARNING" if sec_findings else "PASSED")
            for f in sec_findings:
                all_findings.append({
                    "rule_id": f.rule_id,
                    "rule_name": f.rule_name,
                    "category": "SECURITY",
                    "severity": f.severity,
                    "confidence": f.confidence,
                    "file_path": f.file_path,
                    "start_line": f.start_line,
                    "start_column": f.start_column,
                    "end_line": f.end_line,
                    "end_column": f.end_column,
                    "evidence_summary": f.evidence_summary,
                    "fingerprint": f.fingerprint,
                })
            checks.append(
                AuditCheckItem(
                    check_id="AUDIT-APPSEC-001",
                    category="APPSEC_INTELLIGENCE",
                    name="Application Security Syntactic Vulnerability Audit",
                    status=sec_status,
                    description="Evaluates 10 deterministic AppSec rules across dynamic code, TLS, hashes, and sinks.",
                    details={
                        "analysis_run_id": latest_analysis.id,
                        "security_findings_count": len(sec_findings),
                    },
                    duration_ms=int((time.perf_counter() - t0) * 1000),
                )
            )
        else:
            checks.append(
                AuditCheckItem(
                    check_id="AUDIT-APPSEC-001",
                    category="APPSEC_INTELLIGENCE",
                    name="Application Security Syntactic Vulnerability Audit",
                    status="SKIPPED",
                    description="Evaluates 10 deterministic AppSec rules across dynamic code, TLS, hashes, and sinks.",
                    details={"reason": "Security analysis has not been executed for this snapshot."},
                    duration_ms=int((time.perf_counter() - t0) * 1000),
                )
            )

        # ====================================================================
        # Check 5: Architectural Modularity & Governance (Phase 5)
        # ====================================================================
        t0 = time.perf_counter()
        latest_arch = (
            db.query(ArchitectureRun)
            .filter(ArchitectureRun.repository_id == repository_id, ArchitectureRun.snapshot_id == snapshot.id)
            .order_by(ArchitectureRun.started_at.desc())
            .first()
        )
        if latest_arch and latest_arch.status == "completed":
            violations_count = latest_arch.violations_count or 0
            cycles_count = latest_arch.cycles_count or 0
            arch_status = "FAILED" if violations_count > 0 else ("WARNING" if cycles_count > 0 else "PASSED")
            checks.append(
                AuditCheckItem(
                    check_id="AUDIT-ARCH-001",
                    category="ARCHITECTURE_GOVERNANCE",
                    name="Architectural Boundaries & Cycle Detection",
                    status=arch_status,
                    description="Verifies declarative layer boundaries and circular dependency components.",
                    details={
                        "architecture_run_id": latest_arch.id,
                        "modules_analyzed": latest_arch.modules_analyzed,
                        "cycles_count": cycles_count,
                        "violations_count": violations_count,
                    },
                    duration_ms=int((time.perf_counter() - t0) * 1000),
                )
            )
        else:
            checks.append(
                AuditCheckItem(
                    check_id="AUDIT-ARCH-001",
                    category="ARCHITECTURE_GOVERNANCE",
                    name="Architectural Boundaries & Cycle Detection",
                    status="SKIPPED",
                    description="Verifies declarative layer boundaries and circular dependency components.",
                    details={"reason": "Architectural analysis has not been executed for this snapshot."},
                    duration_ms=int((time.perf_counter() - t0) * 1000),
                )
            )

        # ====================================================================
        # Check 6: Remediation Feasibility & Patch Proposals (Phase 7)
        # ====================================================================
        t0 = time.perf_counter()
        proposals = (
            db.query(RemediationProposal)
            .filter(RemediationProposal.repository_id == repository_id, RemediationProposal.snapshot_id == snapshot.id)
            .all()
        )
        validated_count = sum(1 for p in proposals if p.status in ("VALIDATED", "APPROVED", "APPLIED"))
        remediation_status = "PASSED" if proposals else "WARNING"
        checks.append(
            AuditCheckItem(
                check_id="AUDIT-REMEDIATION-001",
                category="REMEDIATION_VALIDATION",
                name="Automated Remediation Feasibility & Validated Proposals",
                status=remediation_status,
                description="Checks availability of validated, reviewable code patch proposals for discovered findings.",
                details={
                    "total_proposals": len(proposals),
                    "validated_or_approved_proposals": validated_count,
                },
                duration_ms=int((time.perf_counter() - t0) * 1000),
            )
        )

        # ====================================================================
        # Aggregation & Overall Status
        # ====================================================================
        completed_at = datetime.now(timezone.utc)
        passed_count = sum(1 for c in checks if c.status == "PASSED")
        failed_count = sum(1 for c in checks if c.status == "FAILED")
        warning_count = sum(1 for c in checks if c.status == "WARNING")
        skipped_count = sum(1 for c in checks if c.status == "SKIPPED")
        unsupported_count = sum(1 for c in checks if c.status == "UNSUPPORTED")
        error_count = sum(1 for c in checks if c.status == "ERROR")

        if failed_count > 0:
            overall_status = "FAILED"
        elif warning_count > 0:
            overall_status = "WARNING"
        elif error_count > 0:
            overall_status = "ERROR"
        else:
            overall_status = "PASSED"

        # Severity breakdown
        sev_counts: Dict[str, int] = {}
        for f in all_findings:
            sev = str(f.get("severity", "MEDIUM")).upper()
            sev_counts[sev] = sev_counts.get(sev, 0) + 1

        summary = AuditRunSummary(
            total_checks=len(checks),
            passed=passed_count,
            failed=failed_count,
            warning=warning_count,
            skipped=skipped_count,
            unsupported=unsupported_count,
            error=error_count,
            total_findings=len(all_findings),
            findings_by_severity=sev_counts,
        )

        # Generate SARIF report
        sarif_data = SarifExporter.export(all_findings, repository_name=repo.name)

        # Generate Markdown report
        markdown_lines = [
            f"# CodeSentinel AI Audit Report: {repo.name}",
            f"- **Execution Timestamp**: {completed_at.strftime('%Y-%m-%d %H:%M:%S UTC')}",
            f"- **Repository ID**: `{repo.id}`",
            f"- **Snapshot ID**: `{snapshot.id}`",
            f"- **Overall Audit Outcome**: **{overall_status}**",
            "",
            "## Summary Telemetry",
            f"- **Total Checks**: {len(checks)} (Passed: {passed_count}, Failed: {failed_count}, Warnings: {warning_count}, Skipped: {skipped_count})",
            f"- **Total Findings**: {len(all_findings)}",
        ]
        if sev_counts:
            markdown_lines.append(f"- **Severity Breakdown**: {', '.join(f'{k}: {v}' for k, v in sorted(sev_counts.items()))}")
        markdown_lines.extend([
            "",
            "## Audit Pillar Checklist",
            "| Check ID | Category | Name | Status | Details |",
            "| :--- | :--- | :--- | :--- | :--- |",
        ])
        for c in checks:
            detail_str = "; ".join(f"{k}={v}" for k, v in c.details.items()) if c.details else ""
            markdown_lines.append(f"| `{c.check_id}` | {c.category} | {c.name} | **{c.status}** | {detail_str} |")

        if all_findings:
            markdown_lines.extend([
                "",
                "## Findings Inventory",
                "| Rule ID | Severity | File Path | Lines | Evidence |",
                "| :--- | :--- | :--- | :--- | :--- |",
            ])
            for f in all_findings[:50]:  # Limit first 50 in markdown
                lines_span = f"{f.get('start_line', 1)}-{f.get('end_line', 1)}"
                markdown_lines.append(
                    f"| `{f.get('rule_id')}` | {f.get('severity')} | `{f.get('file_path')}` | {lines_span} | {f.get('evidence_summary', '')[:80]} |"
                )
            if len(all_findings) > 50:
                markdown_lines.append(f"\n*...and {len(all_findings) - 50} additional findings (see full SARIF/JSON export).*")

        markdown_report = "\n".join(markdown_lines)

        # Persist to database
        db_audit = AuditRun(
            repository_id=repository_id,
            snapshot_id=snapshot.id,
            status="COMPLETED",
            overall_status=overall_status,
            summary_json=summary.model_dump(),
            checks_json=[c.model_dump() for c in checks],
            findings_json=all_findings,
            markdown_report=markdown_report,
            sarif_json=sarif_data,
            started_at=started_at,
            completed_at=completed_at,
        )
        db.add(db_audit)
        db.commit()
        db.refresh(db_audit)

        return AuditRunResponse(
            id=db_audit.id,
            repository_id=db_audit.repository_id,
            snapshot_id=db_audit.snapshot_id,
            status=db_audit.status,
            overall_status=db_audit.overall_status,
            summary=summary,
            checks=checks,
            findings=all_findings,
            markdown_report=markdown_report,
            sarif_json=sarif_data,
            started_at=db_audit.started_at,
            completed_at=db_audit.completed_at,
        )
