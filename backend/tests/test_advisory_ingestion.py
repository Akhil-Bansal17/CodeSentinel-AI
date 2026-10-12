"""Tests for Phase 3 Security Advisory Ingestion, Validation, and Provenance."""

import pytest
from sqlalchemy import select

from backend.app.models.base import AdvisoryDataset, VulnerabilityAdvisory
from backend.app.services.dependencies.advisory_service import AdvisoryService


def test_advisory_ingestion_valid_batch(test_db_session):
    """Verify importing a valid batch of security advisories."""
    service = AdvisoryService(test_db_session)
    records = [
        {
            "advisory_id": "GHSA-test-0001",
            "ecosystem": "pypi",
            "package_name": "sample-pkg",
            "summary": "Sample test advisory",
            "severity": "HIGH",
            "cve_ids": ["CVE-2024-9999"],
            "affected_ranges_json": ["< 2.0.0"],
            "fixed_versions_json": ["2.0.0"],
        },
        {
            "advisory_id": "GHSA-test-0002",
            "ecosystem": "npm",
            "package_name": "sample-node-pkg",
            "summary": "Sample node advisory",
            "severity": "CRITICAL",
            "cve_ids": [],
            "affected_ranges_json": [
                {
                    "type": "ECOSYSTEM",
                    "events": [{"introduced": "0"}, {"fixed": "1.5.0"}],
                }
            ],
            "fixed_versions_json": ["1.5.0"],
        },
    ]

    dataset, accepted, rejected = service.import_advisories(
        raw_advisories=records,
        dataset_version="v1.0.0-test",
        source_name="test_curated",
    )
    assert dataset.status == "active"
    assert accepted == 2
    assert rejected == 0
    assert dataset.checksum is not None

    status = service.get_dataset_status()
    assert status["status"] == "POPULATED"
    assert status["records_count"] == 2
    assert status["dataset_version"] == "v1.0.0-test"


def test_advisory_ingestion_validation_and_rejection(test_db_session):
    """Verify invalid or malformed records are rejected and duplicate records are deduplicated."""
    service = AdvisoryService(test_db_session)
    records = [
        # Missing required advisory_id
        {"ecosystem": "pypi", "package_name": "pkg-a", "summary": "missing id", "affected_ranges_json": ["< 1.0"]},
        # Missing package_name
        {"advisory_id": "GHSA-1", "ecosystem": "pypi", "summary": "missing pkg", "affected_ranges_json": ["< 1.0"]},
        # Missing affected_ranges
        {"advisory_id": "GHSA-2", "ecosystem": "pypi", "package_name": "pkg-b", "summary": "missing ranges"},
        # Valid record
        {"advisory_id": "GHSA-valid", "ecosystem": "pypi", "package_name": "pkg-valid", "summary": "valid", "affected_ranges_json": ["< 1.0"]},
        # Duplicate of above record
        {"advisory_id": "GHSA-valid", "ecosystem": "pypi", "package_name": "pkg-valid", "summary": "duplicate", "affected_ranges_json": ["< 1.0"]},
    ]

    dataset, accepted, rejected = service.import_advisories(records, "v1.0.1-validation-test")
    assert accepted == 1
    assert rejected == 4


def test_advisory_ingestion_atomic_replacement(test_db_session):
    """Verify that importing a new batch replaces the active dataset atomically and supersedes the old one."""
    service = AdvisoryService(test_db_session)

    # 1. First import
    first_records = [
        {"advisory_id": "GHSA-first", "ecosystem": "pypi", "package_name": "requests", "summary": "First", "affected_ranges_json": ["< 2.0.0"]}
    ]
    ds1, _, _ = service.import_advisories(first_records, "batch-1")
    assert ds1.status == "active"

    # 2. Second import
    second_records = [
        {"advisory_id": "GHSA-second", "ecosystem": "pypi", "package_name": "flask", "summary": "Second", "affected_ranges_json": ["< 3.0.0"]}
    ]
    ds2, _, _ = service.import_advisories(second_records, "batch-2")

    test_db_session.refresh(ds1)
    test_db_session.refresh(ds2)
    assert ds1.status == "superseded"
    assert ds2.status == "active"

    active_now = service.get_active_dataset()
    assert active_now.id == ds2.id


def test_advisory_dataset_empty_status(test_db_session):
    """Verify empty dataset status reporting."""
    service = AdvisoryService(test_db_session)
    status_missing = service.get_dataset_status()
    assert status_missing["status"] == "UNAVAILABLE"

    # Import empty list
    ds, accepted, rejected = service.import_advisories([], "empty-test")
    status_empty = service.get_dataset_status()
    assert status_empty["status"] == "EMPTY_VALID"
    assert status_empty["records_count"] == 0
