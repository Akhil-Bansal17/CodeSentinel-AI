"""Secure CI result ingestion service with HMAC verification and idempotency."""

import hashlib
import hmac
import json
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.base import CIAuditRun, Repository
from backend.app.schemas.cicd import CIIngestRequest, CIIngestResponse


MAX_PAYLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


class CIIngestionService:
    """Handles external CI result webhook ingestion with cryptographic verification."""

    @staticmethod
    def verify_signature(payload_bytes: bytes, signature_header: Optional[str], secret: Optional[str] = None) -> bool:
        """Verify HMAC-SHA256 signature against payload."""
        webhook_secret = secret or getattr(settings, "CI_WEBHOOK_SECRET", None) or "codesentinel-ci-default-secret"
        if not signature_header:
            return False

        # Support 'sha256=<hex>' or raw '<hex>'
        clean_sig = signature_header.replace("sha256=", "").strip()
        expected = hmac.new(webhook_secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected.lower(), clean_sig.lower())

    @classmethod
    def ingest_ci_result(
        cls,
        db: Session,
        request: CIIngestRequest,
        raw_payload_bytes: Optional[bytes] = None,
        signature_header: Optional[str] = None,
    ) -> CIIngestResponse:
        """Ingest CI audit run payload with replay protection and authorization checks."""
        # 1. Authorize repository
        repo = db.query(Repository).filter(Repository.id == request.repository_id).first()
        if not repo:
            raise ValueError(f"Repository not found: {request.repository_id}")

        # 2. Check payload size
        if raw_payload_bytes and len(raw_payload_bytes) > MAX_PAYLOAD_BYTES:
            raise ValueError(f"Payload size ({len(raw_payload_bytes)} bytes) exceeds 5 MB ceiling")

        # 3. Idempotency & Replay Protection
        existing = (
            db.query(CIAuditRun)
            .filter(CIAuditRun.repository_id == request.repository_id, CIAuditRun.idempotency_key == request.idempotency_key)
            .first()
        )
        if existing:
            return CIIngestResponse(
                id=existing.id,
                repository_id=existing.repository_id,
                status=existing.status,
                signature_verified=existing.signature_verified,
                message="Duplicate run detected. Idempotent result returned.",
                is_duplicate=True,
            )

        # 4. Signature verification
        sig_verified = False
        if signature_header and raw_payload_bytes:
            sig_verified = cls.verify_signature(raw_payload_bytes, signature_header)

        # 5. Persist record
        ci_run = CIAuditRun(
            repository_id=request.repository_id,
            idempotency_key=request.idempotency_key,
            ci_provider=request.ci_provider,
            commit_sha=request.commit_sha,
            branch=request.branch,
            event_name=request.event_name,
            workflow_name=request.workflow_name,
            status=request.status,
            payload_json=request.payload,
            signature_verified=sig_verified,
        )
        db.add(ci_run)
        db.commit()
        db.refresh(ci_run)

        return CIIngestResponse(
            id=ci_run.id,
            repository_id=ci_run.repository_id,
            status=ci_run.status,
            signature_verified=sig_verified,
            message="CI run result successfully ingested.",
            is_duplicate=False,
        )
