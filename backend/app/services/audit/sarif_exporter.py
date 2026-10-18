"""RFC-compliant SARIF 2.1.0 exporter for CodeSentinel AI audit results."""

from typing import Any, Dict, List, Optional


SEVERITY_TO_SARIF_LEVEL = {
    "CRITICAL": "error",
    "HIGH": "error",
    "MEDIUM": "warning",
    "LOW": "note",
    "INFO": "note",
}


class SarifExporter:
    """Exports normalized CodeSentinel findings to standard OASIS SARIF 2.1.0 JSON format."""

    SCHEMA_URI = "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json"
    TOOL_NAME = "CodeSentinel AI"
    TOOL_VERSION = "0.1.0"
    TOOL_URI = "https://github.com/Akhil-Bansal17/CodeSentinel-AI"

    @classmethod
    def export(cls, findings: List[Dict[str, Any]], repository_name: str = "repository") -> Dict[str, Any]:
        """Convert findings into a valid SARIF 2.1.0 log document."""
        rules_map: Dict[str, Dict[str, Any]] = {}
        results: List[Dict[str, Any]] = []
        artifacts_set: set[str] = set()

        for f in findings:
            rule_id = f.get("rule_id", "CODESENTINEL-FINDING")
            rule_name = f.get("rule_name", rule_id)
            severity = str(f.get("severity", "MEDIUM")).upper()
            level = SEVERITY_TO_SARIF_LEVEL.get(severity, "warning")
            file_path = f.get("file_path", "unknown")
            artifacts_set.add(file_path)

            start_line = max(1, int(f.get("start_line") or 1))
            start_column = max(1, int(f.get("start_column") or 1))
            end_line = max(start_line, int(f.get("end_line") or start_line))
            end_column = max(start_column, int(f.get("end_column") or start_column + 1))

            message_text = f.get("evidence_summary") or f.get("description") or f"Finding emitted for rule {rule_id}"

            # Register rule if not already present
            if rule_id not in rules_map:
                rules_map[rule_id] = {
                    "id": rule_id,
                    "name": rule_name,
                    "shortDescription": {"text": rule_name},
                    "fullDescription": {"text": message_text},
                    "defaultConfiguration": {"level": level},
                    "properties": {
                        "category": f.get("category", "SECURITY"),
                        "severity": severity,
                        "confidence": f.get("confidence", "HIGH"),
                    },
                }

            # Create SARIF result item
            result_item = {
                "ruleId": rule_id,
                "ruleIndex": list(rules_map.keys()).index(rule_id),
                "level": level,
                "message": {"text": message_text},
                "locations": [
                    {
                        "physicalLocation": {
                            "artifactLocation": {
                                "uri": file_path.replace("\\", "/"),
                                "uriBaseId": "%SRCROOT%",
                            },
                            "region": {
                                "startLine": start_line,
                                "startColumn": start_column,
                                "endLine": end_line,
                                "endColumn": end_column,
                            },
                        }
                    }
                ],
                "properties": {
                    "fingerprint": f.get("fingerprint"),
                    "remediationGuidance": f.get("remediation_guidance"),
                },
            }
            results.append(result_item)

        rules_list = list(rules_map.values())
        artifacts_list = [{"location": {"uri": p.replace("\\", "/"), "uriBaseId": "%SRCROOT%"}} for p in sorted(artifacts_set)]

        return {
            "$schema": cls.SCHEMA_URI,
            "version": "2.1.0",
            "runs": [
                {
                    "tool": {
                        "driver": {
                            "name": cls.TOOL_NAME,
                            "semanticVersion": cls.TOOL_VERSION,
                            "informationUri": cls.TOOL_URI,
                            "rules": rules_list,
                        }
                    },
                    "artifacts": artifacts_list,
                    "results": results,
                }
            ],
        }
