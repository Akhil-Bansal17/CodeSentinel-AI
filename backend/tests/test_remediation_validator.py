"""Unit tests for Phase 7 In-Memory Patch Validation Pipeline."""

import pytest

from backend.app.services.remediation.patch_engine import (
    apply_replacement_to_source,
    compute_content_hash,
)
from backend.app.services.remediation.validator import (
    PatchValidator,
    default_patch_validator,
)


class TestPatchValidator:
    def test_all_five_checks_pass_for_valid_python_patch(self):
        original = "import ast\n\ndef parse(val):\n    return eval(val)\n"
        snippet = "    return eval(val)\n"
        proposed = "    return ast.literal_eval(val)\n"

        orig_hash = compute_content_hash(original)
        modified, target_hash = apply_replacement_to_source(
            original_content=original,
            start_line=4,
            end_line=4,
            expected_original_snippet=snippet,
            proposed_snippet=proposed,
        )

        all_passed, outcomes, patched_content = default_patch_validator.validate(
            file_path="src/utils.py",
            original_content=original,
            original_hash=orig_hash,
            target_hash=target_hash,
            start_line=4,
            end_line=4,
            original_snippet=snippet,
            proposed_snippet=proposed,
            target_rule_id="PYSEC001",
            remediation_rule_id="FIX-PYSEC001-LITERAL-EVAL",
        )

        assert all_passed
        assert len(outcomes) == 5
        check_ids = [o.check_id for o in outcomes]
        assert check_ids == [
            "CHK-01-INTEGRITY",
            "CHK-02-STRUCTURE",
            "CHK-03-SYNTAX",
            "CHK-04-RULE-RECHECK",
            "CHK-05-REGRESSION-RISK",
        ]
        assert all(o.status == "PASSED" for o in outcomes)

    def test_check_1_fails_on_drifted_hash(self):
        original = "def foo(): pass\n"
        wrong_hash = "0" * 64

        all_passed, outcomes, _ = default_patch_validator.validate(
            file_path="src/foo.py",
            original_content=original,
            original_hash=wrong_hash,
            target_hash="any",
            start_line=1,
            end_line=1,
            original_snippet="def foo(): pass\n",
            proposed_snippet="def foo(): return 1\n",
            target_rule_id="PYSEC001",
            remediation_rule_id="FIX-PYSEC001-LITERAL-EVAL",
        )

        assert not all_passed
        assert outcomes[0].check_id == "CHK-01-INTEGRITY"
        assert outcomes[0].status == "FAILED"
        assert "drift" in outcomes[0].explanation.lower()

    def test_check_3_fails_on_syntax_error(self):
        original = "def foo():\n    pass\n"
        snippet = "    pass\n"
        proposed = "    def syntax error (\n"  # Invalid syntax

        orig_hash = compute_content_hash(original)
        modified, target_hash = apply_replacement_to_source(
            original_content=original,
            start_line=2,
            end_line=2,
            expected_original_snippet=snippet,
            proposed_snippet=proposed,
        )

        all_passed, outcomes, _ = default_patch_validator.validate(
            file_path="src/foo.py",
            original_content=original,
            original_hash=orig_hash,
            target_hash=target_hash,
            start_line=2,
            end_line=2,
            original_snippet=snippet,
            proposed_snippet=proposed,
            target_rule_id="PYSEC001",
            remediation_rule_id="FIX-PYSEC001-LITERAL-EVAL",
        )

        assert not all_passed
        syntax_check = [o for o in outcomes if o.check_id == "CHK-03-SYNTAX"][0]
        assert syntax_check.status == "FAILED"
        assert "SyntaxError" in syntax_check.explanation

    def test_check_4_fails_if_unsafe_token_still_remains(self):
        original = "def foo():\n    eval(a)\n"
        snippet = "    eval(a)\n"
        # Dummy proposal that doesn't fix the eval
        proposed = "    eval(a) # still eval\n"

        orig_hash = compute_content_hash(original)
        modified, target_hash = apply_replacement_to_source(
            original_content=original,
            start_line=2,
            end_line=2,
            expected_original_snippet=snippet,
            proposed_snippet=proposed,
        )

        all_passed, outcomes, _ = default_patch_validator.validate(
            file_path="src/foo.py",
            original_content=original,
            original_hash=orig_hash,
            target_hash=target_hash,
            start_line=2,
            end_line=2,
            original_snippet=snippet,
            proposed_snippet=proposed,
            target_rule_id="PYSEC001",
            remediation_rule_id="FIX-PYSEC001-LITERAL-EVAL",
        )

        assert not all_passed
        recheck = [o for o in outcomes if o.check_id == "CHK-04-RULE-RECHECK"][0]
        assert recheck.status == "FAILED"
