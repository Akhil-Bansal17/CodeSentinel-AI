"""Deterministic Semver 2.0.0 and npm range matching engine."""

from dataclasses import dataclass
import re
from typing import Any, List, Optional, Tuple

from backend.app.services.dependencies.matcher.base import (
    BaseVersionMatcher,
    MatchResult,
)


@dataclass
class Semver:
    """Represents a parsed Semantic Version 2.0.0."""

    major: int
    minor: int
    patch: int
    prerelease: Tuple[str, ...] = ()
    build: Optional[str] = None
    raw: str = ""

    @classmethod
    def parse(cls, version_str: str) -> Optional["Semver"]:
        if not version_str or not isinstance(version_str, str):
            return None
        v = version_str.strip().lstrip("v=").strip()
        # Regex matching Semver 2.0.0
        pattern = r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$"
        m = re.match(pattern, v)
        if not m:
            # Handle loose version like "1.2" by padding ".0"
            loose_m = re.match(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)$", v)
            if loose_m:
                return cls(
                    major=int(loose_m.group(1)),
                    minor=int(loose_m.group(2)),
                    patch=0,
                    prerelease=(),
                    raw=v,
                )
            loose_single = re.match(r"^(0|[1-9]\d*)$", v)
            if loose_single:
                return cls(
                    major=int(loose_single.group(1)),
                    minor=0,
                    patch=0,
                    prerelease=(),
                    raw=v,
                )
            return None

        major = int(m.group(1))
        minor = int(m.group(2))
        patch = int(m.group(3))
        pre_str = m.group(4)
        prerelease = tuple(pre_str.split(".")) if pre_str else ()
        build = m.group(5)
        return cls(major=major, minor=minor, patch=patch, prerelease=prerelease, build=build, raw=v)

    def __eq__(self, other: Any) -> bool:
        if not isinstance(other, Semver):
            return False
        return (
            self.major == other.major
            and self.minor == other.minor
            and self.patch == other.patch
            and self.prerelease == other.prerelease
        )

    def __lt__(self, other: "Semver") -> bool:
        if not isinstance(other, Semver):
            return NotImplemented

        if (self.major, self.minor, self.patch) != (other.major, other.minor, other.patch):
            return (self.major, self.minor, self.patch) < (other.major, other.minor, other.patch)

        # Non-prerelease has higher precedence than prerelease
        if not self.prerelease and other.prerelease:
            return False
        if self.prerelease and not other.prerelease:
            return True
        if not self.prerelease and not other.prerelease:
            return False

        # Compare prerelease identifiers
        for a, b in zip(self.prerelease, other.prerelease):
            if a == b:
                continue
            a_is_int = a.isdigit()
            b_is_int = b.isdigit()
            if a_is_int and b_is_int:
                return int(a) < int(b)
            if a_is_int and not b_is_int:
                return True  # Numeric identifiers have lower precedence than alphanumeric
            if not a_is_int and b_is_int:
                return False
            return a < b

        return len(self.prerelease) < len(other.prerelease)

    def __le__(self, other: "Semver") -> bool:
        return self == other or self < other

    def __gt__(self, other: "Semver") -> bool:
        return not self <= other

    def __ge__(self, other: "Semver") -> bool:
        return not self < other

    def __str__(self) -> str:
        res = f"{self.major}.{self.minor}.{self.patch}"
        if self.prerelease:
            res += f"-{'.'.join(self.prerelease)}"
        return res


class NpmRangeEvaluator:
    """Evaluates Semver versions against npm range expressions."""

    @staticmethod
    def satisfies(target: Semver, range_str: str) -> bool:
        """Check if target satisfies range_str (supporting '||' and compound comparators)."""
        clean = range_str.strip()
        if not clean or clean == "*" or clean == "x" or clean == "X":
            # Wildcard matches any non-prerelease
            return not target.prerelease

        # Split into OR sets: 'range1 || range2'
        or_branches = clean.split("||")
        for branch in or_branches:
            if NpmRangeEvaluator._satisfies_branch(target, branch.strip()):
                return True
        return False

    @staticmethod
    def _satisfies_branch(target: Semver, branch_str: str) -> bool:
        """Evaluate a single AND-conjunction branch of comparators."""
        if not branch_str:
            return True

        # Handle hyphen ranges: '1.2.3 - 2.3.4'
        hyphen_m = re.match(r"^([^\s]+)\s+-\s+([^\s]+)$", branch_str)
        if hyphen_m:
            low = Semver.parse(hyphen_m.group(1))
            high = Semver.parse(hyphen_m.group(2))
            if low and high:
                return low <= target <= high
            return False

        # Normalize comparators into standard tokens
        comparators = NpmRangeEvaluator._parse_comparators(branch_str)
        if not comparators:
            return False

        # If target has a prerelease, it only satisfies if at least one comparator mentions
        # the same major.minor.patch tuple with a prerelease
        if target.prerelease:
            allows_prerelease = any(
                comp_ver.prerelease and (comp_ver.major, comp_ver.minor, comp_ver.patch) == (target.major, target.minor, target.patch)
                for _, comp_ver in comparators
            )
            if not allows_prerelease:
                return False

        for op, comp_ver in comparators:
            if op == "=" and not (target == comp_ver):
                return False
            elif op == ">" and not (target > comp_ver):
                return False
            elif op == ">=" and not (target >= comp_ver):
                return False
            elif op == "<" and not (target < comp_ver):
                return False
            elif op == "<=" and not (target <= comp_ver):
                return False

        return True

    @staticmethod
    def _parse_comparators(branch_str: str) -> List[Tuple[str, Semver]]:
        """Deconstruct branch into a list of (op, Semver) comparators."""
        # Normalize operator spacing: join operator with version e.g. ">= 1.2.0" -> ">=1.2.0"
        normalized = re.sub(r"(>=|<=|>|<|=|~|\^)\s+", r"\1", branch_str.strip())
        tokens = normalized.split()
        results: List[Tuple[str, Semver]] = []

        for token in tokens:
            t = token.strip()
            if not t:
                continue

            # 1. Caret range ^1.2.3
            if t.startswith("^"):
                raw_v = t[1:].strip()
                v = Semver.parse(raw_v)
                if v:
                    results.append((">=", v))
                    # Next breaking upper bound
                    if v.major > 0:
                        upper = Semver(major=v.major + 1, minor=0, patch=0)
                    elif v.minor > 0:
                        upper = Semver(major=0, minor=v.minor + 1, patch=0)
                    else:
                        upper = Semver(major=0, minor=0, patch=v.patch + 1)
                    results.append(("<", upper))
                continue

            # 2. Tilde range ~1.2.3
            if t.startswith("~"):
                raw_v = t[1:].strip()
                v = Semver.parse(raw_v)
                if v:
                    results.append((">=", v))
                    upper = Semver(major=v.major, minor=v.minor + 1, patch=0)
                    results.append(("<", upper))
                continue

            # 3. Standard comparison operators: >=, <=, >, <, =
            op_m = re.match(r"^(>=|<=|>|<|=)?\s*([0-9a-zA-Z\.\-]+)$", t)
            if op_m:
                op = op_m.group(1) or "="
                raw_v = op_m.group(2)
                v = Semver.parse(raw_v)
                if v:
                    results.append((op, v))
                continue

        return results


class SemverMatcher(BaseVersionMatcher):
    """Evaluates Node.js (npm) package versions against advisory ranges using Semver."""

    ecosystem = "npm"

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
        target_semver = Semver.parse(clean_ver)
        if not target_semver:
            return MatchResult(
                is_matched=False,
                is_indeterminate=True,
                reason=f"Version '{clean_ver}' is not a valid semver version",
            )

        # 1. Check explicit fixed versions
        if fixed_versions:
            for fix in fixed_versions:
                fix_sv = Semver.parse(fix.strip())
                if fix_sv and target_semver == fix_sv:
                    return MatchResult(
                        is_matched=False,
                        reason=f"Version matches explicit fixed version {fix}",
                    )

        # Candidate remediation version: smallest fixed version greater than target_ver
        remediation: Optional[str] = None
        if fixed_versions:
            valid_fixes = []
            for f in fixed_versions:
                f_sv = Semver.parse(f.strip())
                if f_sv:
                    valid_fixes.append((f_sv, f.strip()))
            valid_fixes.sort(key=lambda x: x[0])
            for f_sv, f_str in valid_fixes:
                if f_sv > target_semver:
                    remediation = f_str
                    break
            if not remediation and valid_fixes:
                remediation = valid_fixes[-1][1]

        # 2. Iterate through affected ranges
        for range_item in affected_ranges:
            # Case A: String range (e.g. "< 4.17.21", ">= 1.0.0 < 2.3.0", "^1.0.0")
            if isinstance(range_item, str):
                if NpmRangeEvaluator.satisfies(target_semver, range_item):
                    return MatchResult(
                        is_matched=True,
                        matched_range=range_item,
                        remediation_version=remediation,
                    )

            # Case B: OSV event format
            elif isinstance(range_item, dict):
                events = range_item.get("events", [])
                if isinstance(events, list) and events:
                    osv_result = self._evaluate_osv_events(target_semver, events)
                    if osv_result.is_matched:
                        osv_result.remediation_version = remediation or osv_result.remediation_version
                        return osv_result

        return MatchResult(
            is_matched=False,
            reason="Version does not fall into any affected advisory range",
        )

    def _evaluate_osv_events(self, target_ver: Semver, events: List[Any]) -> MatchResult:
        introduced: Optional[Semver] = None
        fixed: Optional[Semver] = None
        last_affected: Optional[Semver] = None
        limit: Optional[Semver] = None
        fix_str: Optional[str] = None

        for event in events:
            if not isinstance(event, dict):
                continue

            if "introduced" in event:
                raw = str(event["introduced"]).strip()
                if raw == "0":
                    introduced = Semver(0, 0, 0)
                else:
                    introduced = Semver.parse(raw)

            elif "fixed" in event:
                raw = str(event["fixed"]).strip()
                fix_str = raw
                fixed = Semver.parse(raw)

                if self._in_interval(target_ver, introduced, fixed, last_affected, limit):
                    return MatchResult(
                        is_matched=True,
                        matched_range=f">={introduced or '0.0.0'}, <{fixed}",
                        remediation_version=fix_str,
                    )
                introduced = None
                fixed = None

            elif "last_affected" in event:
                last_affected = Semver.parse(str(event["last_affected"]).strip())

            elif "limit" in event:
                limit = Semver.parse(str(event["limit"]).strip())

        if introduced is not None or last_affected is not None:
            if self._in_interval(target_ver, introduced, fixed, last_affected, limit):
                matched_desc = f">={introduced or '0.0.0'}"
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
        target_ver: Semver,
        introduced: Optional[Semver],
        fixed: Optional[Semver],
        last_affected: Optional[Semver],
        limit: Optional[Semver],
    ) -> bool:
        if introduced is not None and target_ver < introduced:
            return False
        if fixed is not None and target_ver >= fixed:
            return False
        if last_affected is not None and target_ver > last_affected:
            return False
        if limit is not None and target_ver >= limit:
            return False
        return True
