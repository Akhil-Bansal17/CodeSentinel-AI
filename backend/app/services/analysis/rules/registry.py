"""Deterministic static analysis rule registry for CodeSentinel AI."""

from typing import Dict, List, Optional

from backend.app.services.analysis.rules.base import BaseRule
from backend.app.services.analysis.rules.js_rules import (
    JsComplexityRule,
    JsFunctionLengthRule,
    JsSyntaxRule,
)
from backend.app.services.analysis.rules.python_rules import (
    PyComplexityRule,
    PyFunctionLengthRule,
    PyImportRule,
    PySyntaxRule,
)


class RuleRegistry:
    """Central registry for all active, versioned static analysis rules."""

    def __init__(self):
        self._rules: Dict[str, BaseRule] = {}
        self._register_default_rules()

    def _register_default_rules(self) -> None:
        """Register initial Phase 2 rules."""
        # Python rules
        self.register(PySyntaxRule())
        self.register(PyComplexityRule())
        self.register(PyFunctionLengthRule())
        self.register(PyImportRule())

        # JavaScript / TypeScript rules
        self.register(JsSyntaxRule())
        self.register(JsComplexityRule())
        self.register(JsFunctionLengthRule())

    def register(self, rule: BaseRule) -> None:
        """Register a new deterministic rule."""
        self._rules[rule.rule_id] = rule

    def get_rule(self, rule_id: str) -> Optional[BaseRule]:
        """Fetch a specific rule by ID."""
        return self._rules.get(rule_id)

    def list_rules(self) -> List[BaseRule]:
        """List all registered rules in stable ID order."""
        return sorted(self._rules.values(), key=lambda r: r.rule_id)

    def get_rules_for_language(self, language: str) -> List[BaseRule]:
        """Get all applicable rules for a target language."""
        lang_lower = language.lower()
        applicable = []

        for rule in self._rules.values():
            r_lang = rule.language.lower()
            if r_lang == "all":
                applicable.append(rule)
            elif lang_lower == "python" and r_lang == "python":
                applicable.append(rule)
            elif lang_lower in {"javascript", "typescript", "jsx", "tsx"} and r_lang in {"javascript", "typescript"}:
                applicable.append(rule)

        # Deterministic sorting by rule ID
        return sorted(applicable, key=lambda r: r.rule_id)


# Global default registry instance
default_rule_registry = RuleRegistry()
