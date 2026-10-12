"""Tests for Phase 3 Dependency Manifest and Lockfile Parsers."""

import pytest

from backend.app.services.dependencies.parsers.package_json_parser import PackageJsonParser
from backend.app.services.dependencies.parsers.package_lock_parser import PackageLockJsonParser
from backend.app.services.dependencies.parsers.pipfile_lock_parser import PipfileLockParser
from backend.app.services.dependencies.parsers.pnpm_lock_parser import PnpmLockParser
from backend.app.services.dependencies.parsers.poetry_lock_parser import PoetryLockParser
from backend.app.services.dependencies.parsers.pyproject_parser import PyprojectTomlParser
from backend.app.services.dependencies.parsers.requirements_parser import (
    MAX_REQUIREMENTS_BYTES,
    RequirementsTxtParser,
)
from backend.app.services.dependencies.parsers.yarn_lock_parser import YarnLockParser


# =========================================================================
# Python Parsers
# =========================================================================

def test_requirements_parser_standard_specifiers():
    """Verify requirements.txt parsing with various version specifiers."""
    parser = RequirementsTxtParser()
    content = (
        "requests==2.31.0\n"
        "flask>=2.0.0,<3.0.0\n"
        "pytest~=8.0.0\n"
        "cryptography!=39.0.0\n"
        "urllib3\n"
    )
    res = parser.parse("requirements.txt", content)
    assert res.status == "success"
    assert len(res.dependencies) == 5

    by_name = {d.package_name: d for d in res.dependencies}
    assert by_name["requests"].resolved_version == "2.31.0"
    assert by_name["requests"].version_constraint == "==2.31.0"

    assert by_name["flask"].resolved_version is None
    assert "<3.0.0" in str(by_name["flask"].version_constraint)
    assert ">=2.0.0" in str(by_name["flask"].version_constraint)

    assert by_name["pytest"].resolved_version is None
    assert by_name["pytest"].version_constraint == "~=8.0.0"

    assert by_name["urllib3"].resolved_version is None
    assert by_name["urllib3"].version_constraint is None


def test_requirements_parser_extras_and_markers():
    """Verify requirements.txt parsing with extras, environment markers, and line continuations."""
    parser = RequirementsTxtParser()
    content = (
        "celery[redis,auth]>=5.2.0  # async task queue\n"
        "pywin32>=300; sys_platform == 'win32'\n"
        "importlib-metadata>=4.0 ; python_version < '3.8'\n"
        "multiline-pkg \\\n    == 1.2.3\n"
    )
    res = parser.parse("requirements.txt", content)
    assert res.status == "success"
    assert len(res.dependencies) == 4

    by_name = {d.package_name: d for d in res.dependencies}
    assert set(by_name["celery"].metadata.get("extras", [])) == {"redis", "auth"}
    assert "win32" in str(by_name["pywin32"].scope)
    assert by_name["multiline-pkg"].resolved_version == "1.2.3"


def test_requirements_parser_recursive_inclusion_and_cycle_prevention():
    """Verify safe recursive -r inclusion and cyclic inclusion prevention."""
    parser = RequirementsTxtParser()
    files_map = {
        "requirements/base.txt": "urllib3==1.26.18\n-r common.txt\n",
        "requirements/common.txt": "certifi==2024.2.2\n-r base.txt\n",  # cycle!
    }

    res = parser.parse("requirements/base.txt", files_map["requirements/base.txt"], all_files_content=files_map)
    # Cycle should be detected and reported without crashing or infinite recursion
    assert any("Cyclic" in err for err in res.errors)
    pkgs = {d.package_name for d in res.dependencies}
    assert "urllib3" in pkgs
    assert "certifi" in pkgs


def test_requirements_parser_editable_and_urls():
    """Verify editable -e references and direct git/http URLs."""
    parser = RequirementsTxtParser()
    content = (
        "-e git+https://github.com/my-org/custom-lib.git#egg=custom-lib\n"
        "https://example.com/wheels/binary_pkg-1.0-py3-none-any.whl\n"
        "--extra-index-url https://pypi.org/simple\n"
    )
    res = parser.parse("requirements.txt", content)
    by_name = {d.package_name: d for d in res.dependencies}
    assert "custom-lib" in by_name
    assert by_name["custom-lib"].status == "unsupported_editable"


def test_requirements_parser_oversized_file():
    """Verify oversized requirements.txt is rejected safely."""
    parser = RequirementsTxtParser()
    content = "a==1.0\n" * (MAX_REQUIREMENTS_BYTES // 4)
    res = parser.parse("requirements.txt", content)
    assert res.status == "error"
    assert "exceeds" in res.errors[0]


def test_pyproject_toml_pep621_and_poetry():
    """Verify PEP 621 dependencies and Poetry sections in pyproject.toml."""
    parser = PyprojectTomlParser()
    content = """
[project]
name = "demo-app"
version = "0.1.0"
dependencies = [
    "fastapi>=0.110.0",
    "uvicorn[standard]==0.28.0",
    "sqlalchemy>=2.0.0",
]

[project.optional-dependencies]
test = [
    "pytest>=8.0.0",
    "coverage==7.4.0",
]

[tool.poetry.dependencies]
python = "^3.11"
requests = "^2.31.0"
pydantic = { version = "==2.6.4", optional = true }
"""
    res = parser.parse("pyproject.toml", content)
    assert res.status == "success"

    by_name = {d.package_name: d for d in res.dependencies}
    assert by_name["fastapi"].dependency_type == "direct"
    assert by_name["uvicorn"].resolved_version == "0.28.0"
    assert by_name["coverage"].dependency_type == "optional"
    assert by_name["coverage"].resolved_version == "7.4.0"
    assert by_name["requests"].version_constraint == "^2.31.0"
    assert by_name["pydantic"].resolved_version == "2.6.4"
    assert by_name["pydantic"].dependency_type == "optional"


def test_poetry_lock_parser():
    """Verify poetry.lock parsing with packages, categories, and resolved versions."""
    parser = PoetryLockParser()
    content = """
[[package]]
name = "certifi"
version = "2024.2.2"
description = "Python package for providing Mozilla's CA Bundle."
optional = false
python-versions = ">=3.6"
files = [
    {file = "certifi-2024.2.2-py3-none-any.whl", hash = "sha256:1234"},
]

[[package]]
name = "urllib3"
version = "2.2.1"
description = "HTTP library with thread-safe connection pooling."
optional = false
python-versions = ">=3.8"
files = []

[package.dependencies]
certifi = ">=2024.2.2"
"""
    res = parser.parse("poetry.lock", content)
    assert res.status == "success"
    assert len(res.dependencies) == 2

    by_name = {d.package_name: d for d in res.dependencies}
    assert by_name["certifi"].resolved_version == "2024.2.2"
    assert by_name["urllib3"].resolved_version == "2.2.1"
    assert "certifi" in by_name["urllib3"].metadata.get("sub_dependencies", [])


def test_pipfile_lock_parser():
    """Verify Pipfile.lock parsing default and develop sections."""
    parser = PipfileLockParser()
    content = """{
        "_meta": {"hash": {"sha256": "abcdef"}},
        "default": {
            "requests": {"version": "==2.31.0", "hashes": ["sha256:1111"]}
        },
        "develop": {
            "pytest": {"version": "==8.1.1", "hashes": ["sha256:2222"]}
        }
    }"""
    res = parser.parse("Pipfile.lock", content)
    assert res.status == "success"
    assert len(res.dependencies) == 2

    by_name = {d.package_name: d for d in res.dependencies}
    assert by_name["requests"].resolved_version == "2.31.0"
    assert by_name["requests"].dependency_type == "direct"
    assert by_name["pytest"].resolved_version == "8.1.1"
    assert by_name["pytest"].dependency_type == "dev"


# =========================================================================
# JavaScript / TypeScript (npm) Parsers
# =========================================================================

def test_package_json_parser_sections():
    """Verify package.json extracts direct, dev, peer, and optional dependencies with declared constraints."""
    parser = PackageJsonParser()
    content = """{
        "name": "codesentinel-ui",
        "version": "1.0.0",
        "dependencies": {
            "react": "^18.2.0",
            "lodash": "4.17.21"
        },
        "devDependencies": {
            "typescript": "~5.3.3",
            "vite": "^5.1.0"
        },
        "peerDependencies": {
            "react-dom": ">=18.0.0"
        },
        "optionalDependencies": {
            "fsevents": "^2.3.2"
        }
    }"""
    res = parser.parse("package.json", content)
    assert res.status == "success"
    assert len(res.dependencies) == 6

    by_name = {d.package_name: d for d in res.dependencies}
    assert by_name["react"].dependency_type == "direct"
    assert by_name["react"].version_constraint == "^18.2.0"
    assert by_name["react"].resolved_version is None  # Never fabricated from package.json!

    assert by_name["typescript"].dependency_type == "dev"
    assert by_name["typescript"].version_constraint == "~5.3.3"

    assert by_name["react-dom"].dependency_type == "peer"
    assert by_name["fsevents"].dependency_type == "optional"


def test_package_lock_json_v2_v3_packages():
    """Verify package-lock.json v2/v3 with packages mapping and direct vs transitive detection."""
    parser = PackageLockJsonParser()
    content = """{
        "name": "web-project",
        "version": "1.0.0",
        "lockfileVersion": 3,
        "packages": {
            "": {
                "name": "web-project",
                "dependencies": {
                    "axios": "^1.6.0"
                },
                "devDependencies": {
                    "vitest": "^1.3.0"
                }
            },
            "node_modules/axios": {
                "version": "1.6.2",
                "resolved": "https://registry.npmjs.org/axios/-/axios-1.6.2.tgz",
                "dependencies": {
                    "follow-redirects": "^1.15.0"
                }
            },
            "node_modules/follow-redirects": {
                "version": "1.15.4",
                "resolved": "https://registry.npmjs.org/follow-redirects/-/follow-redirects-1.15.4.tgz"
            },
            "node_modules/vitest": {
                "version": "1.3.1",
                "dev": true,
                "resolved": "https://registry.npmjs.org/vitest/-/vitest-1.3.1.tgz"
            }
        }
    }"""
    res = parser.parse("package-lock.json", content)
    assert res.status == "success"
    assert len(res.dependencies) == 3

    by_name = {d.package_name: d for d in res.dependencies}
    assert by_name["axios"].resolved_version == "1.6.2"
    assert by_name["axios"].is_direct is True
    assert by_name["axios"].dependency_type == "direct"

    assert by_name["follow-redirects"].resolved_version == "1.15.4"
    assert by_name["follow-redirects"].is_direct is False
    assert by_name["follow-redirects"].dependency_type == "transitive"

    assert by_name["vitest"].resolved_version == "1.3.1"
    assert by_name["vitest"].is_direct is True
    assert by_name["vitest"].dependency_type == "dev"


def test_package_lock_json_v1_legacy():
    """Verify package-lock.json v1 legacy dependencies tree."""
    parser = PackageLockJsonParser()
    content = """{
        "name": "legacy-project",
        "version": "1.0.0",
        "lockfileVersion": 1,
        "dependencies": {
            "express": {
                "version": "4.18.2",
                "resolved": "https://registry.npmjs.org/express/-/express-4.18.2.tgz",
                "dependencies": {
                    "qs": {
                        "version": "6.11.0"
                    }
                }
            }
        }
    }"""
    res = parser.parse("package-lock.json", content)
    assert res.status == "success"
    assert len(res.dependencies) == 2

    by_name = {d.package_name: d for d in res.dependencies}
    assert by_name["express"].resolved_version == "4.18.2"
    assert by_name["express"].is_direct is True

    assert by_name["qs"].resolved_version == "6.11.0"
    assert by_name["qs"].is_direct is False
    assert by_name["qs"].dependency_type == "transitive"


def test_pnpm_lock_yaml_parser():
    """Verify pnpm-lock.yaml parser extracts packages and resolved versions."""
    parser = PnpmLockParser()
    content = """lockfileVersion: '6.0'
importers:
  .:
    dependencies:
      lodash:
        specifier: ^4.17.21
        version: 4.17.21
    devDependencies:
      typescript:
        specifier: ^5.0.0
        version: 5.3.3
packages:
  /lodash@4.17.21:
    resolution: {integrity: sha512-xxx}
    dev: false
  /typescript@5.3.3:
    resolution: {integrity: sha512-yyy}
    dev: true
  /@babel/core@7.23.9:
    resolution: {integrity: sha512-zzz}
    dev: true
"""
    res = parser.parse("pnpm-lock.yaml", content)
    assert res.status == "success"
    assert len(res.dependencies) == 3

    by_name = {d.package_name: d for d in res.dependencies}
    assert by_name["lodash"].resolved_version == "4.17.21"
    assert by_name["lodash"].is_direct is True

    assert by_name["typescript"].resolved_version == "5.3.3"
    assert by_name["typescript"].dependency_type == "dev"

    assert by_name["@babel/core"].resolved_version == "7.23.9"
    assert by_name["@babel/core"].dependency_type == "transitive"


def test_yarn_lock_parser_classic_and_berry_detection():
    """Verify yarn.lock Classic v1 parsing and Yarn Berry v2+ detection."""
    parser = YarnLockParser()
    v1_content = """# THIS IS AN AUTOGENERATED FILE. DO NOT EDIT DIRECTLY.
# yarn lockfile v1

"lodash@^4.17.0", "lodash@^4.17.21":
  version "4.17.21"
  resolved "https://registry.yarnpkg.com/lodash/-/lodash-4.17.21.tgz#679591c564c3bffaae8454cf0b3df370c3d6911c"
  integrity sha512-v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==

"@babel/code-frame@^7.0.0":
  version "7.12.13"
  resolved "https://registry.yarnpkg.com/@babel/code-frame/-/code-frame-7.12.13.tgz#dcfc826ebd5647ac802047a0a9d61c477edc73fe"
"""
    res_v1 = parser.parse("yarn.lock", v1_content)
    assert res_v1.status == "success"
    assert len(res_v1.dependencies) == 2
    by_name = {d.package_name: d for d in res_v1.dependencies}
    assert by_name["lodash"].resolved_version == "4.17.21"
    assert by_name["@babel/code-frame"].resolved_version == "7.12.13"

    # Yarn Berry format
    berry_content = """__metadata:
  version: 6
  cacheKey: 8
"""
    res_berry = parser.parse("yarn.lock", berry_content)
    assert res_berry.status == "unsupported"
    assert "Berry" in res_berry.errors[0]
