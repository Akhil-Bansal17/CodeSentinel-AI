"""Security advisory dataset management, validation, and querying service."""

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import uuid

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from backend.app.core.exceptions import ValidationError
from backend.app.core.logging import logger
from backend.app.models.base import AdvisoryDataset, VulnerabilityAdvisory
from backend.app.services.dependencies.parsers.base import normalize_package_name

VALID_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO", "UNKNOWN"}
INITIAL_ADVISORIES_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "advisories" / "initial_advisories.json"


class AdvisoryService:
    """Service handling trustworthy security advisory ingestion, provenance, and matching queries."""

    def __init__(self, db: Session):
        self.db = db

    def get_active_dataset(self) -> Optional[AdvisoryDataset]:
        """Fetch current active advisory dataset."""
        stmt = (
            select(AdvisoryDataset)
            .where(AdvisoryDataset.status == "active")
            .order_by(desc(AdvisoryDataset.created_at))
            .limit(1)
        )
        return self.db.scalars(stmt).first()

    def get_dataset_status(self) -> Dict[str, Any]:
        """Retrieve authoritative status and provenance for active advisory dataset."""
        active = self.get_active_dataset()
        if not active:
            return {
                "status": "UNAVAILABLE",
                "dataset_version": None,
                "source_name": None,
                "records_count": 0,
                "checksum": None,
                "message": "No active vulnerability advisory dataset is loaded.",
            }

        if active.records_count == 0:
            return {
                "status": "EMPTY_VALID",
                "dataset_version": active.dataset_version,
                "source_name": active.source_name,
                "records_count": 0,
                "checksum": active.checksum,
                "message": "Active dataset is present but empty (contains zero advisory records).",
            }

        return {
            "status": "POPULATED",
            "dataset_version": active.dataset_version,
            "source_name": active.source_name,
            "records_count": active.records_count,
            "checksum": active.checksum,
            "updated_at": active.updated_at.isoformat() if active.updated_at else None,
            "message": f"Active dataset version {active.dataset_version} with {active.records_count} advisories.",
        }

    def import_advisories(
        self,
        raw_advisories: List[Dict[str, Any]],
        dataset_version: str,
        source_name: str = "codesentinel_curated",
    ) -> Tuple[AdvisoryDataset, int, int]:
        """Validate and atomically import security advisories with rollback protection.

        Returns:
            Tuple[AdvisoryDataset, accepted_count, rejected_count]
        """
        if not dataset_version or not dataset_version.strip():
            raise ValidationError("dataset_version is required for advisory import")

        now = datetime.now(timezone.utc)
        clean_version = dataset_version.strip()

        # Compute checksum of input data for provenance
        data_bytes = json.dumps(raw_advisories, sort_keys=True).encode("utf-8")
        checksum = hashlib.sha256(data_bytes).hexdigest()

        accepted_records: List[VulnerabilityAdvisory] = []
        rejected_count = 0
        seen_keys = set()

        new_dataset = AdvisoryDataset(
            id=str(uuid.uuid4()),
            dataset_version=clean_version,
            source_name=source_name,
            status="staging",  # Staged until validation passes
            records_count=0,
            checksum=checksum,
            metadata_json={"total_submitted": len(raw_advisories)},
            created_at=now,
            updated_at=now,
        )

        try:
            self.db.add(new_dataset)
            self.db.flush()

            for item in raw_advisories:
                if not isinstance(item, dict):
                    rejected_count += 1
                    continue

                adv_id = item.get("advisory_id")
                ecosystem = item.get("ecosystem")
                raw_pkg = item.get("package_name")
                summary = item.get("summary")
                affected_ranges = item.get("affected_ranges_json")

                # Validation of required fields
                if not adv_id or not ecosystem or not raw_pkg or not summary or affected_ranges is None:
                    rejected_count += 1
                    continue

                eco_clean = ecosystem.strip().lower()
                norm_pkg = normalize_package_name(eco_clean, str(raw_pkg))
                adv_id_clean = str(adv_id).strip()

                # Deduplicate by (advisory_id, ecosystem, package_name)
                dedup_key = (adv_id_clean, eco_clean, norm_pkg)
                if dedup_key in seen_keys:
                    rejected_count += 1
                    continue
                seen_keys.add(dedup_key)

                # Severity normalization
                raw_sev = str(item.get("severity", "UNKNOWN")).strip().upper()
                sev = raw_sev if raw_sev in VALID_SEVERITIES else "UNKNOWN"

                # Parse dates if present
                pub_at = None
                raw_pub = item.get("published_at")
                if raw_pub and isinstance(raw_pub, str):
                    try:
                        pub_at = datetime.fromisoformat(raw_pub.replace("Z", "+00:00"))
                    except Exception:
                        pass

                mod_at = None
                raw_mod = item.get("modified_at")
                if raw_mod and isinstance(raw_mod, str):
                    try:
                        mod_at = datetime.fromisoformat(raw_mod.replace("Z", "+00:00"))
                    except Exception:
                        pass

                cvss = None
                raw_cvss = item.get("cvss_score")
                if raw_cvss is not None:
                    try:
                        cvss = float(raw_cvss)
                    except (ValueError, TypeError):
                        pass

                cve_ids = item.get("cve_ids", [])
                if not isinstance(cve_ids, list):
                    cve_ids = [str(cve_ids)]

                fixed_versions = item.get("fixed_versions_json", [])
                if not isinstance(fixed_versions, list):
                    fixed_versions = [str(fixed_versions)]

                advisory_record = VulnerabilityAdvisory(
                    id=str(uuid.uuid4()),
                    dataset_id=new_dataset.id,
                    advisory_id=adv_id_clean,
                    ecosystem=eco_clean,
                    package_name=norm_pkg,
                    summary=str(summary)[:1024],
                    description=str(item.get("description", ""))[:4096] if item.get("description") else None,
                    severity=sev,
                    severity_source=str(item.get("severity_source", "AUTHORITATIVE"))[:64],
                    cvss_score=cvss,
                    cve_ids=[str(c) for c in cve_ids],
                    affected_ranges_json=affected_ranges if isinstance(affected_ranges, list) else [affected_ranges],
                    fixed_versions_json=[str(f) for f in fixed_versions],
                    source_url=str(item.get("source_url", ""))[:1024] if item.get("source_url") else None,
                    published_at=pub_at,
                    modified_at=mod_at,
                    created_at=now,
                    updated_at=now,
                )
                accepted_records.append(advisory_record)

            # Persist records
            batch_size = 500
            for i in range(0, len(accepted_records), batch_size):
                self.db.add_all(accepted_records[i : i + batch_size])
                self.db.flush()

            # Atomically deprecate previous active datasets and activate new one
            existing_active = self.db.scalars(
                select(AdvisoryDataset).where(AdvisoryDataset.status == "active")
            ).all()
            for old_ds in existing_active:
                old_ds.status = "superseded"
                self.db.add(old_ds)

            new_dataset.status = "active"
            new_dataset.records_count = len(accepted_records)
            new_dataset.metadata_json = {
                "accepted_count": len(accepted_records),
                "rejected_count": rejected_count,
                "total_submitted": len(raw_advisories),
            }
            self.db.add(new_dataset)
            self.db.commit()
            self.db.refresh(new_dataset)

            logger.info(
                "Advisory import successful: dataset '%s' active with %d accepted records (%d rejected)",
                clean_version,
                len(accepted_records),
                rejected_count,
            )
            return new_dataset, len(accepted_records), rejected_count

        except Exception as exc:
            self.db.rollback()
            logger.exception("Failed to import advisory dataset: %s", exc)
            raise

    def load_initial_dataset_if_empty(self) -> Optional[AdvisoryDataset]:
        """Auto-seed initial curated advisories if no active dataset exists."""
        active = self.get_active_dataset()
        if active:
            return active

        if not INITIAL_ADVISORIES_FILE.exists():
            logger.warning("Initial advisories file not found at %s", INITIAL_ADVISORIES_FILE)
            return None

        try:
            raw_text = INITIAL_ADVISORIES_FILE.read_text(encoding="utf-8")
            payload = json.loads(raw_text)
            version = payload.get("dataset_version", "2026.10.1")
            source = payload.get("source_name", "codesentinel_curated_osv")
            advisories = payload.get("advisories", [])
            dataset, accepted, _ = self.import_advisories(
                raw_advisories=advisories,
                dataset_version=version,
                source_name=source,
            )
            return dataset
        except Exception as exc:
            logger.error("Failed to auto-seed initial advisory dataset: %s", exc)
            return None

    def find_advisories_for_packages(
        self,
        ecosystem: str,
        package_names: List[str],
    ) -> Dict[str, List[VulnerabilityAdvisory]]:
        """Look up all active advisories for a list of normalized package names."""
        active = self.get_active_dataset()
        if not active or not package_names:
            return {}

        eco_clean = ecosystem.strip().lower()
        norm_names = [normalize_package_name(eco_clean, p) for p in package_names]

        stmt = (
            select(VulnerabilityAdvisory)
            .where(
                VulnerabilityAdvisory.dataset_id == active.id,
                VulnerabilityAdvisory.ecosystem == eco_clean,
                VulnerabilityAdvisory.package_name.in_(norm_names),
            )
        )
        results = self.db.scalars(stmt).all()

        advisory_map: Dict[str, List[VulnerabilityAdvisory]] = {}
        for adv in results:
            advisory_map.setdefault(adv.package_name, []).append(adv)

        return advisory_map
