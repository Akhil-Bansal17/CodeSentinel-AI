"""Standards-compliant PEP 440 version matching engine for Python (PyPI)."""

from typing import Any, List, Optional
from packaging.specifiers import InvalidSpecifier, SpecifierSet
from packaging.version import InvalidVersion, Version

from backend.app.services.dependencies.matcher.base import (
    BaseVersionMatcher,
    MatchResult,
)


class PythonVersionMatcher(BaseVersionMatcher):
    """Evaluates Python package versions against advisory ranges using PEP 440 semantics."""

    ecosystem = "pypi"

    def is_affected(
        self,
        resolved_version: Optional[str],
        affected_ranges: List[Any],
        fixed_versions: Optional[List[str]] = None,
    ) -> MatchResult:
        if not resolved_version or not resolved_version.strip():
            return MatchResult(
                is_matched=False,
                is_indeterminate=True,
                reason="Resolved version is missing or empty",
            )

        clean_ver = resolved_version.strip()
        try:
            target_ver = Version(clean_ver)
        except InvalidVersion:
            return MatchResult(
                is_matched=False,
                is_indeterminate=True,
                reason=f"Version '{clean_ver}' is not a valid PEP 440 version",
            )

        # 1. If explicitly in fixed_versions, confirmed unaffected
        if fixed_versions:
            for fix in fixed_versions:
                try:
                    if target_ver == Version(fix.strip()):
                        return MatchResult(
                            is_matched=False,
                            reason=f"Version matches explicit fixed version {fix}",
                        )
                except InvalidVersion:
                    pass

        # Candidate remediation version: smallest fixed version greater than target_ver, or first fixed version
        remediation: Optional[str] = None
        if fixed_versions:
            valid_fixes = []
            for f in fixed_versions:
                try:
                    valid_fixes.append((Version(f.strip()), f.strip()))
                except InvalidVersion:
                    pass
            valid_fixes.sort(key=lambda x: x[0])
            for f_ver, f_str in valid_fixes:
                if f_ver > target_ver:
                    remediation = f_str
                    break
            if not remediation and valid_fixes:
                remediation = valid_fixes[-1][1]

        # 2. Iterate through affected ranges
        for range_item in affected_ranges:
            # Case A: String specifier (e.g. "< 2.31.0", ">= 1.0.0, < 2.0.0")
            if isinstance(range_item, str):
                try:
                    spec = SpecifierSet(range_item, prereleases=target_ver.is_prerelease)
                    if spec.contains(target_ver, prereleases=target_ver.is_prerelease):
                        return MatchResult(
                            is_matched=True,
                            matched_range=range_item,
                            remediation_version=remediation,
                        )
                except InvalidSpecifier:
                    continue

            # Case B: OSV-style range dictionary (type="ECOSYSTEM", events=[...])
            elif isinstance(range_item, dict):
                events = range_item.get("events", [])
                if isinstance(events, list) and events:
                    osv_result = self._evaluate_osv_events(target_ver, events)
                    if osv_result.is_matched:
                        osv_result.remediation_version = remediation or osv_result.remediation_version
                        return osv_result

        return MatchResult(
            is_matched=False,
            reason="Version does not fall into any affected advisory range",
        )

    def _evaluate_osv_events(self, target_ver: Version, events: List[Dict[str, str]]) -> MatchResult:
        """Evaluate OSV event sequence: introduced, fixed, last_affected, limit."""
        introduced: Optional[Version] = None
        fixed: Optional[Version] = None
        last_affected: Optional[Version] = None
        limit: Optional[Version] = None
        fix_str: Optional[str] = None

        for event in events:
            if not isinstance(event, dict):
                continue

            if "introduced" in event:
                raw = str(event["introduced"]).strip()
                if raw == "0":
                    introduced = Version("0.0.0")
                else:
                    try:
                        introduced = Version(raw)
                    except InvalidVersion:
                        introduced = None

            elif "fixed" in event:
                raw = str(event["fixed"]).strip()
                fix_str = raw
                try:
                    fixed = Version(raw)
                except InvalidVersion:
                    fixed = None

                # Check boundary for this (introduced, fixed) interval
                if self._in_interval(target_ver, introduced, fixed, last_affected, limit):
                    return MatchResult(
                        is_matched=True,
                        matched_range=f">={introduced or '0'}, <{fixed}",
                        remediation_version=fix_str,
                    )
                # Reset bounds for next event interval
                introduced = None
                fixed = None

            elif "last_affected" in event:
                raw = str(event["last_affected"]).strip()
                try:
                    last_affected = Version(raw)
                except InvalidVersion:
                    last_affected = None

            elif "limit" in event:
                raw = str(event["limit"]).strip()
                try:
                    limit = Version(raw)
                except InvalidVersion:
                    limit = None

        # Check final open interval if introduced without fixed
        if introduced is not None or last_affected is not None:
            if self._in_interval(target_ver, introduced, fixed, last_affected, limit):
                matched_desc = f">={introduced or '0'}"
                if last_affected:
                    matched_desc += f", <={last_affected}"
                elif limit:
                    matched_desc += f", <{limit}"
                return MatchResult(
                    is_matched=True,
                    matched_range=matched_desc,
                    remediation_version=fix_str,
                )

        return MatchResult(is_matched=False)

    def _in_interval(
        self,
        target_ver: Version,
        introduced: Optional[Version],
        fixed: Optional[Version],
        last_affected: Optional[Version],
        limit: Optional[Version],
    ) -> bool:
        """Helper to test whether target_ver is within [introduced, fixed/last_affected/limit)."""
        if introduced is not None and target_ver < introduced:
            return False
        if fixed is not None and target_ver >= fixed:
            return False
        if last_affected is not None and target_ver > last_affected:
            return False
        if limit is not None and target_ver >= limit:
            return False
        return True
