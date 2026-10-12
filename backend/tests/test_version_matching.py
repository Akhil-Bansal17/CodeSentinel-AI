"""Tests for Phase 3 Ecosystem-Aware Version Range Matching Engine."""

import pytest

from backend.app.services.dependencies.matcher.python_matcher import PythonVersionMatcher
from backend.app.services.dependencies.matcher.semver_matcher import (
    NpmRangeEvaluator,
    Semver,
    SemverMatcher,
)


# =========================================================================
# Python PEP 440 Matcher Tests
# =========================================================================

def test_python_matcher_boundary_fixed_version():
    """Verify strict boundary behavior for fixed versions in Python."""
    matcher = PythonVersionMatcher()
    affected_ranges = ["< 2.31.0"]
    fixed_versions = ["2.31.0"]

    # Below boundary: affected
    res_below = matcher.is_affected("2.30.9", affected_ranges, fixed_versions)
    assert res_below.is_matched is True
    assert res_below.remediation_version == "2.31.0"

    # Exactly at fixed version: not affected
    res_at = matcher.is_affected("2.31.0", affected_ranges, fixed_versions)
    assert res_at.is_matched is False

    # Above fixed version: not affected
    res_above = matcher.is_affected("2.31.1", affected_ranges, fixed_versions)
    assert res_above.is_matched is False


def test_python_matcher_osv_event_intervals():
    """Verify OSV introduced and fixed event intervals in Python."""
    matcher = PythonVersionMatcher()
    ranges = [
        {
            "type": "ECOSYSTEM",
            "events": [
                {"introduced": "1.26.0"},
                {"fixed": "2.0.7"},
            ],
        }
    ]
    fixed_versions = ["2.0.7"]

    # Below introduced: not affected
    assert matcher.is_affected("1.25.9", ranges, fixed_versions).is_matched is False

    # Exactly introduced: affected
    assert matcher.is_affected("1.26.0", ranges, fixed_versions).is_matched is True

    # Inside interval: affected
    res_mid = matcher.is_affected("2.0.0", ranges, fixed_versions)
    assert res_mid.is_matched is True
    assert res_mid.remediation_version == "2.0.7"

    # Exactly fixed: not affected
    assert matcher.is_affected("2.0.7", ranges, fixed_versions).is_matched is False

    # Above fixed: not affected
    assert matcher.is_affected("2.0.8", ranges, fixed_versions).is_matched is False


def test_python_matcher_osv_last_affected():
    """Verify OSV last_affected boundary."""
    matcher = PythonVersionMatcher()
    ranges = [
        {
            "type": "ECOSYSTEM",
            "events": [
                {"introduced": "0"},
                {"last_affected": "2.2.4"},
            ],
        }
    ]
    assert matcher.is_affected("2.2.4", ranges).is_matched is True
    assert matcher.is_affected("2.2.5", ranges).is_matched is False


def test_python_matcher_invalid_or_missing_version():
    """Verify invalid version strings return indeterminate rather than failing or false matching."""
    matcher = PythonVersionMatcher()
    ranges = ["< 2.0.0"]

    res_none = matcher.is_affected(None, ranges)
    assert res_none.is_indeterminate is True
    assert res_none.is_matched is False

    res_git = matcher.is_affected("git-branch-main", ranges)
    assert res_git.is_indeterminate is True
    assert res_git.is_matched is False


# =========================================================================
# npm Semver Matcher Tests
# =========================================================================

def test_semver_parsing_and_precedence():
    """Verify Semver 2.0.0 parsing, ordering, and prerelease precedence."""
    v1 = Semver.parse("1.2.3")
    v2 = Semver.parse("1.2.4")
    v_pre = Semver.parse("1.2.4-alpha.1")
    v_pre2 = Semver.parse("1.2.4-beta.1")

    assert v1 < v2
    assert v_pre < v2  # Prerelease is lower precedence than normal
    assert v_pre < v_pre2  # alpha < beta


def test_semver_matcher_boundary_fixed_version():
    """Verify strict boundary behavior for fixed versions in npm."""
    matcher = SemverMatcher()
    ranges = ["< 4.17.21"]
    fixed_versions = ["4.17.21"]

    # Below boundary: affected
    res_below = matcher.is_affected("4.17.20", ranges, fixed_versions)
    assert res_below.is_matched is True
    assert res_below.remediation_version == "4.17.21"

    # Exactly at boundary: not affected
    assert matcher.is_affected("4.17.21", ranges, fixed_versions).is_matched is False

    # Above boundary: not affected
    assert matcher.is_affected("4.17.22", ranges, fixed_versions).is_matched is False


def test_npm_range_evaluator_caret_and_tilde():
    """Verify npm caret, tilde, and compound range evaluation."""
    v_target = Semver.parse("1.2.5")
    assert NpmRangeEvaluator.satisfies(v_target, "^1.2.0") is True
    assert NpmRangeEvaluator.satisfies(v_target, "^1.3.0") is False
    assert NpmRangeEvaluator.satisfies(v_target, "~1.2.0") is True
    assert NpmRangeEvaluator.satisfies(v_target, "~1.1.0") is False

    # Zero-based caret
    v_zero = Semver.parse("0.2.4")
    assert NpmRangeEvaluator.satisfies(v_zero, "^0.2.0") is True
    assert NpmRangeEvaluator.satisfies(v_zero, "^0.3.0") is False

    # Compound range with disjunction
    assert NpmRangeEvaluator.satisfies(v_target, "< 1.0.0 || >= 1.2.0 < 2.0.0") is True
    assert NpmRangeEvaluator.satisfies(v_target, "< 1.0.0 || > 2.0.0") is False


def test_semver_matcher_osv_event_intervals():
    """Verify OSV introduced and fixed event intervals in npm."""
    matcher = SemverMatcher()
    ranges = [
        {
            "type": "ECOSYSTEM",
            "events": [
                {"introduced": "0"},
                {"fixed": "1.6.0"},
            ],
        }
    ]
    fixed_versions = ["1.6.0"]

    assert matcher.is_affected("0.9.0", ranges, fixed_versions).is_matched is True
    assert matcher.is_affected("1.5.9", ranges, fixed_versions).is_matched is True
    assert matcher.is_affected("1.6.0", ranges, fixed_versions).is_matched is False
    assert matcher.is_affected("1.6.1", ranges, fixed_versions).is_matched is False


def test_semver_matcher_invalid_or_missing_version():
    """Verify invalid npm semver strings return indeterminate without crashing."""
    matcher = SemverMatcher()
    ranges = ["< 2.0.0"]

    assert matcher.is_affected(None, ranges).is_indeterminate is True
    assert matcher.is_affected("main", ranges).is_indeterminate is True
    assert matcher.is_affected("invalid.version.str", ranges).is_indeterminate is True
