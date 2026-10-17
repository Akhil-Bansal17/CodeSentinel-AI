"""Unit tests for Phase 7 Deterministic Patch and Unified Diff Engine."""

import pytest

from backend.app.services.remediation.patch_engine import (
    PatchBoundsError,
    PatchConflictError,
    ProtectedPathError,
    apply_replacement_to_source,
    compute_content_hash,
    generate_unified_diff,
    is_protected_path,
    validate_path_safety,
)


class TestPatchEngine:
    def test_compute_content_hash_deterministic(self):
        h1 = compute_content_hash("def foo():\n    return 42\n")
        h2 = compute_content_hash("def foo():\n    return 42\n")
        assert h1 == h2
        assert len(h1) == 64

    def test_apply_replacement_exact_match(self):
        original = "line 1\nline 2\nline 3\n"
        snippet = "line 2\n"
        proposed = "line 2 modified\n"
        modified, new_hash = apply_replacement_to_source(
            original_content=original,
            start_line=2,
            end_line=2,
            expected_original_snippet=snippet,
            proposed_snippet=proposed,
        )
        assert modified == "line 1\nline 2 modified\nline 3\n"
        assert new_hash == compute_content_hash(modified)

    def test_apply_replacement_diverged_snippet_raises_conflict(self):
        original = "line 1\nactual content\nline 3\n"
        snippet = "expected content\n"
        with pytest.raises(PatchConflictError) as exc:
            apply_replacement_to_source(
                original_content=original,
                start_line=2,
                end_line=2,
                expected_original_snippet=snippet,
                proposed_snippet="new content\n",
            )
        assert "does not match expected snippet" in str(exc.value)

    def test_apply_replacement_invalid_coordinates_raises_conflict(self):
        original = "single line\n"
        with pytest.raises(PatchConflictError):
            apply_replacement_to_source(
                original_content=original,
                start_line=10,
                end_line=12,
                expected_original_snippet="foo",
                proposed_snippet="bar",
            )

    def test_binary_file_rejected(self):
        original = "some text\x00with null byte"
        with pytest.raises(PatchBoundsError) as exc:
            apply_replacement_to_source(
                original_content=original,
                start_line=1,
                end_line=1,
                expected_original_snippet="some",
                proposed_snippet="other",
            )
        assert "null byte" in str(exc.value).lower()

    def test_generate_unified_diff_format(self):
        orig = "def old():\n    pass\n"
        mod = "def old():\n    return True\n"
        diff = generate_unified_diff("src/app.py", orig, mod)
        assert "--- a/src/app.py" in diff
        assert "+++ b/src/app.py" in diff
        assert "-    pass" in diff
        assert "+    return True" in diff

    def test_protected_paths_detection(self):
        assert is_protected_path(".env")
        assert is_protected_path("config/.env.production")
        assert is_protected_path(".git/config")
        assert is_protected_path("keys/server.key")
        assert is_protected_path("certs/cert.pem")
        assert is_protected_path(".ssh/id_rsa")
        assert not is_protected_path("src/app.py")
        assert not is_protected_path("package.json")

    def test_validate_path_safety_traversal_rejection(self):
        with pytest.raises(ProtectedPathError):
            validate_path_safety("../../etc/passwd")
        with pytest.raises(ProtectedPathError):
            validate_path_safety("/root/secret.txt")
        with pytest.raises(ProtectedPathError):
            validate_path_safety(".env")
