"""Tests for Phase 5 Module Dependency Graph Builder and Coupling Metrics."""

import pytest
from backend.app.services.analysis.parsers.base import (
    ParsedClass,
    ParsedFunction,
    ParsedImport,
    ParserStatus,
    ParseResult,
    SourceCoordinates,
)
from backend.app.services.architecture.graph_builder import (
    DependencyGraphBuilder,
    _tarjan_scc,
)


def test_python_absolute_and_relative_imports():
    """Verify Python absolute and relative imports resolve correctly to internal vs external."""
    parsed_files = [
        ParseResult(
            relative_path="pkg/core.py",
            language="python",
            status=ParserStatus.SUCCESS,
            total_lines=30,
            imports=[
                # Internal relative import
                ParsedImport(name="utils", module=None, is_from=True, coordinates=SourceCoordinates(start_line=1), level=1),
                # Internal absolute import
                ParsedImport(name="models", module="pkg", is_from=True, coordinates=SourceCoordinates(start_line=2), level=0),
                # External standard library
                ParsedImport(name="math", module=None, is_from=False, coordinates=SourceCoordinates(start_line=3), level=0),
                # External 3rd party package
                ParsedImport(name="pydantic", module=None, is_from=False, coordinates=SourceCoordinates(start_line=4), level=0),
                # Unresolved internal import
                ParsedImport(name="nonexistent", module="pkg", is_from=True, coordinates=SourceCoordinates(start_line=5), level=0),
            ],
            classes=[
                ParsedClass(name="CoreService", is_abstract=True, coordinates=SourceCoordinates(start_line=10)),
                ParsedClass(name="ConcreteCore", is_abstract=False, coordinates=SourceCoordinates(start_line=20)),
            ],
        ),
        ParseResult(
            relative_path="pkg/utils.py",
            language="python",
            status=ParserStatus.SUCCESS,
            total_lines=15,
            imports=[],
            classes=[],
        ),
        ParseResult(
            relative_path="pkg/models.py",
            language="python",
            status=ParserStatus.SUCCESS,
            total_lines=25,
            imports=[
                # Circular dependency back to pkg/core.py
                ParsedImport(name="core", module="pkg", is_from=True, coordinates=SourceCoordinates(start_line=1), level=0),
            ],
            classes=[
                ParsedClass(name="Model", is_abstract=False, coordinates=SourceCoordinates(start_line=5)),
            ],
        ),
    ]

    all_files = {"pkg/core.py", "pkg/utils.py", "pkg/models.py"}
    graph = DependencyGraphBuilder.build_graph(parsed_files, all_files)

    assert len(graph.modules) == 3
    assert "pkg/core.py" in graph.modules
    assert "pkg/utils.py" in graph.modules
    assert "pkg/models.py" in graph.modules

    # Check internal edges
    internal_pairs = {(e.source_path, e.target_path) for e in graph.internal_edges}
    assert ("pkg/core.py", "pkg/utils.py") in internal_pairs
    assert ("pkg/core.py", "pkg/models.py") in internal_pairs
    assert ("pkg/models.py", "pkg/core.py") in internal_pairs

    # Check external edges
    external_targets = {e.target_path for e in graph.external_edges}
    assert "math" in external_targets
    assert "pydantic" in external_targets

    # Check unresolved edges
    unresolved_sources = [e.source_path for e in graph.unresolved_edges]
    assert "pkg/core.py" in unresolved_sources


def test_js_ts_imports_and_extensions():
    """Verify JavaScript/TypeScript relative, index, and package imports."""
    parsed_files = [
        ParseResult(
            relative_path="src/components/App.tsx",
            language="typescript",
            status=ParserStatus.SUCCESS,
            total_lines=40,
            imports=[
                # Relative with extension omission
                ParsedImport(name="./Button", is_from=False, coordinates=SourceCoordinates(start_line=1)),
                # Index file resolution
                ParsedImport(name="../services", is_from=False, coordinates=SourceCoordinates(start_line=2)),
                # External package
                ParsedImport(name="react", is_from=False, coordinates=SourceCoordinates(start_line=3)),
                # Unresolved
                ParsedImport(name="./MissingComponent", is_from=False, coordinates=SourceCoordinates(start_line=4)),
            ],
            classes=[],
        ),
        ParseResult(
            relative_path="src/components/Button.tsx",
            language="typescript",
            status=ParserStatus.SUCCESS,
            total_lines=20,
            imports=[],
            classes=[],
        ),
        ParseResult(
            relative_path="src/services/index.ts",
            language="typescript",
            status=ParserStatus.SUCCESS,
            total_lines=10,
            imports=[],
            classes=[
                ParsedClass(name="AuthService", is_abstract=True, coordinates=SourceCoordinates(start_line=2)),
            ],
        ),
    ]

    all_files = {"src/components/App.tsx", "src/components/Button.tsx", "src/services/index.ts"}
    graph = DependencyGraphBuilder.build_graph(parsed_files, all_files)

    internal_pairs = {(e.source_path, e.target_path) for e in graph.internal_edges}
    assert ("src/components/App.tsx", "src/components/Button.tsx") in internal_pairs
    assert ("src/components/App.tsx", "src/services/index.ts") in internal_pairs

    external_targets = {e.target_path for e in graph.external_edges}
    assert "react" in external_targets

    unresolved_targets = {e.specifier for e in graph.unresolved_edges}
    assert "./MissingComponent" in unresolved_targets


def test_coupling_metrics_calculation():
    """Verify Ca, Ce, Instability, Abstractness, and Main Sequence Distance."""
    # Module A depends on B and C. (Ce = 2, Ca = 0)
    # Module B has no outgoing internal dependencies. (Ce = 0, Ca = 1)
    # Module C has no outgoing internal dependencies. (Ce = 0, Ca = 1)
    # Module D is isolated. (Ce = 0, Ca = 0)
    parsed_files = [
        ParseResult(
            relative_path="mod_a.py",
            language="python",
            status=ParserStatus.SUCCESS,
            total_lines=10,
            imports=[
                ParsedImport(name="mod_b", is_from=False, coordinates=SourceCoordinates(start_line=1)),
                ParsedImport(name="mod_c", is_from=False, coordinates=SourceCoordinates(start_line=2)),
            ],
            classes=[
                ParsedClass(name="AbstractBase", is_abstract=True),
                ParsedClass(name="Concrete1", is_abstract=False),
            ],
        ),
        ParseResult(
            relative_path="mod_b.py",
            language="python",
            status=ParserStatus.SUCCESS,
            total_lines=10,
            imports=[],
            classes=[
                ParsedClass(name="ConcreteB", is_abstract=False),
            ],
        ),
        ParseResult(
            relative_path="mod_c.py",
            language="python",
            status=ParserStatus.SUCCESS,
            total_lines=10,
            imports=[],
            classes=[],  # 0 classes
        ),
        ParseResult(
            relative_path="mod_isolated.py",
            language="python",
            status=ParserStatus.SUCCESS,
            total_lines=10,
            imports=[],
            classes=[],
        ),
    ]

    all_files = {"mod_a.py", "mod_b.py", "mod_c.py", "mod_isolated.py"}
    graph = DependencyGraphBuilder.build_graph(parsed_files, all_files)

    mod_a = graph.modules["mod_a.py"]
    assert mod_a.afferent_coupling == 0
    assert mod_a.efferent_coupling == 2
    # I = 2 / (0 + 2) = 1.0
    assert mod_a.instability == 1.0
    # Abstractness = 1 abstract / 2 classes = 0.5
    assert mod_a.abstractness == 0.5
    # D = |0.5 + 1.0 - 1| = 0.5
    assert mod_a.main_sequence_distance == 0.5

    mod_b = graph.modules["mod_b.py"]
    assert mod_b.afferent_coupling == 1
    assert mod_b.efferent_coupling == 0
    # I = 0 / (1 + 0) = 0.0
    assert mod_b.instability == 0.0
    # Abstractness = 0 / 1 = 0.0
    assert mod_b.abstractness == 0.0
    # D = |0.0 + 0.0 - 1| = 1.0
    assert mod_b.main_sequence_distance == 1.0

    mod_c = graph.modules["mod_c.py"]
    assert mod_c.afferent_coupling == 1
    assert mod_c.efferent_coupling == 0
    assert mod_c.instability == 0.0
    # Abstractness is None because classes_count == 0
    assert mod_c.abstractness is None
    # Main sequence distance is None because Abstractness is unavailable
    assert mod_c.main_sequence_distance is None

    mod_iso = graph.modules["mod_isolated.py"]
    assert mod_iso.afferent_coupling == 0
    assert mod_iso.efferent_coupling == 0
    # Undefined instability when Ca + Ce == 0
    assert mod_iso.instability is None
    assert mod_iso.abstractness is None
    assert mod_iso.main_sequence_distance is None


def test_tarjan_strongly_connected_components_cycle_detection():
    """Verify Tarjan's SCC algorithm accurately detects circular dependency components."""
    # Graph: A -> B -> C -> A (cycle of 3)
    # D -> E (no cycle)
    # F -> F (self-loop)
    adj = {
        "A": {"B"},
        "B": {"C"},
        "C": {"A"},
        "D": {"E"},
        "E": set(),
        "F": {"F"},
    }
    nodes = ["A", "B", "C", "D", "E", "F"]
    sccs = _tarjan_scc(nodes, adj)

    assert len(sccs) == 2
    # Longest SCC first
    assert set(sccs[0]) == {"A", "B", "C"}
    assert sccs[1] == ["F"]


def test_resource_limits_boundary():
    """Verify builder respects MAX_EDGES_LIMIT safely and flags partial analysis."""
    class CustomBuilder(DependencyGraphBuilder):
        MAX_EDGES_LIMIT = 3

    parsed_files = [
        ParseResult(
            relative_path="source.py",
            language="python",
            status=ParserStatus.SUCCESS,
            total_lines=10,
            imports=[
                ParsedImport(name=f"dep_{i}", is_from=False, coordinates=SourceCoordinates(start_line=i + 1))
                for i in range(10)
            ],
            classes=[],
        )
    ]
    graph = CustomBuilder.build_graph(parsed_files, {"source.py"})
    assert graph.is_partial is True
    assert len(graph.external_edges) <= 3
