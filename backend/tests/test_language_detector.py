from backend.app.services.language_detector import (
    detect_file_language,
    is_known_binary_extension,
)


def test_standard_source_language_detection():
    """Verify deterministic language mapping for common programming languages."""
    test_cases = [
        ("main.py", "Python", "source", True),
        ("app.ts", "TypeScript", "source", True),
        ("index.js", "JavaScript", "source", True),
        ("server.go", "Go", "source", True),
        ("lib.rs", "Rust", "source", True),
        ("App.java", "Java", "source", True),
        ("native.cpp", "C++", "source", True),
        ("header.h", "C", "source", True),
        ("style.css", "CSS", "source", True),
        ("query.sql", "SQL", "source", True),
        ("script.sh", "Shell", "source", True),
        ("deploy.ps1", "PowerShell", "source", True),
    ]
    for filename, expected_lang, expected_cat, expected_src in test_cases:
        res = detect_file_language(filename)
        assert res.language == expected_lang
        assert res.category == expected_cat
        assert res.is_source_file == expected_src


def test_compound_extension_detection():
    """Verify compound extensions match before general extensions."""
    res_dts = detect_file_language("types.d.ts")
    assert res_dts.language == "TypeScript"
    assert res_dts.is_source_file is True

    res_test = detect_file_language("component.test.tsx")
    assert res_test.language == "TypeScript"
    assert res_test.is_source_file is True

    res_spec = detect_file_language("util.spec.js")
    assert res_spec.language == "JavaScript"
    assert res_spec.is_source_file is True


def test_extensionless_files():
    """Verify known extensionless filenames are accurately identified."""
    assert detect_file_language("Dockerfile").language == "Dockerfile"
    assert detect_file_language("dockerfile").is_source_file is True
    assert detect_file_language("Makefile").language == "Makefile"
    assert detect_file_language("Gemfile").language == "Ruby"


def test_configuration_and_documentation_categorization():
    """Verify configs and docs are categorized correctly and not counted as source code."""
    res_json = detect_file_language("package.json")
    assert res_json.language == "JSON"
    assert res_json.category == "configuration"
    assert res_json.is_source_file is False

    res_yaml = detect_file_language("deploy.yaml")
    assert res_yaml.language == "YAML"
    assert res_yaml.category == "configuration"
    assert res_yaml.is_source_file is False

    res_md = detect_file_language("README.md")
    assert res_md.language == "Markdown"
    assert res_md.category == "documentation"
    assert res_md.is_source_file is False


def test_unknown_and_binary_detection():
    """Verify unknown files and binary extensions are handled properly."""
    res_unknown = detect_file_language("archive.unknownxyz")
    assert res_unknown.language == "Unknown"
    assert res_unknown.category == "other"
    assert res_unknown.is_source_file is False

    assert is_known_binary_extension("image.png") is True
    assert is_known_binary_extension("app.exe") is True
    assert is_known_binary_extension("model.parquet") is True
    assert is_known_binary_extension("source.py") is False
