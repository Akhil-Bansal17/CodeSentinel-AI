/**
 * Deterministic JavaScript / TypeScript AST Parser for CodeSentinel AI.
 * Uses TypeScript compiler API (ts.createSourceFile) for safe AST parsing
 * without executing target code.
 */

const fs = require("fs");
const path = require("path");

// Resolve typescript compiler package
let ts;
try {
  ts = require("typescript");
} catch {
  try {
    const localTs = path.resolve(__dirname, "../../../../../frontend/node_modules/typescript");
    ts = require(localTs);
  } catch (err) {
    process.stdout.write(
      JSON.stringify({
        status: "UNAVAILABLE",
        errorMessage: "TypeScript parser library is unavailable: " + err.message,
      })
    );
    process.exit(0);
  }
}

function getScriptKind(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".js":
    case ".mjs":
    case ".cjs":
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

function calculateFunctionComplexity(node, sourceFile) {
  let complexity = 1;

  function visitChild(child) {
    // Do not count nested function bodies in outer function complexity
    if (
      child !== node &&
      (ts.isFunctionDeclaration(child) ||
        ts.isFunctionExpression(child) ||
        ts.isArrowFunction(child) ||
        ts.isMethodDeclaration(child) ||
        ts.isConstructorDeclaration(child) ||
        ts.isGetAccessor(child) ||
        ts.isSetAccessor(child))
    ) {
      return;
    }

    if (
      ts.isIfStatement(child) ||
      ts.isForStatement(child) ||
      ts.isForInStatement(child) ||
      ts.isForOfStatement(child) ||
      ts.isWhileStatement(child) ||
      ts.isDoStatement(child) ||
      ts.isCatchClause(child) ||
      ts.isConditionalExpression(child) ||
      ts.isCaseClause(child)
    ) {
      complexity++;
    } else if (ts.isBinaryExpression(child)) {
      const op = child.operatorToken.kind;
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      ) {
        complexity++;
      }
    }

    ts.forEachChild(child, visitChild);
  }

  const body = node.body;
  if (body) {
    ts.forEachChild(body, visitChild);
  }
  return complexity;
}

function getFunctionName(node) {
  if (node.name && node.name.text) {
    return node.name.text;
  }
  if (node.parent) {
    if (ts.isVariableDeclaration(node.parent) && node.parent.name && node.parent.name.text) {
      return node.parent.name.text;
    }
    if (ts.isPropertyAssignment(node.parent) && node.parent.name && node.parent.name.text) {
      return node.parent.name.text;
    }
  }
  return "anonymous";
}

function runParser() {
  let inputData = "";
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", (chunk) => {
    inputData += chunk;
  });

  process.stdin.on("end", () => {
    try {
      const payload = JSON.parse(inputData);
      const relativePath = payload.relativePath || "unknown.ts";
      const sourceCode = payload.sourceCode || "";
      const scriptKind = getScriptKind(relativePath);

      const sourceFile = ts.createSourceFile(
        relativePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
      );

      const lines = sourceCode.split("\n");
      const totalLines = lines.length;

      // Check parse diagnostics (syntax errors)
      const parseDiagnostics = sourceFile.parseDiagnostics || [];
      if (parseDiagnostics.length > 0) {
        const diagnostics = parseDiagnostics.map((d) => {
          const start = d.start !== undefined ? d.start : 0;
          const pos = sourceFile.getLineAndCharacterOfPosition(start);
          const endPos =
            d.length !== undefined
              ? sourceFile.getLineAndCharacterOfPosition(start + d.length)
              : pos;

          const msg = ts.flattenDiagnosticMessageText(d.messageText, " ");
          return {
            message: msg,
            startLine: Math.min(pos.line + 1, totalLines || 1),
            startColumn: pos.character + 1,
            endLine: Math.min(endPos.line + 1, totalLines || 1),
            endColumn: endPos.character + 1,
            code: String(d.code),
          };
        });

        process.stdout.write(
          JSON.stringify({
            status: "SYNTAX_ERROR",
            totalLines,
            diagnostics,
            functions: [],
            errorMessage: diagnostics[0]?.message || "Syntax error detected",
          })
        );
        return;
      }

      // Extract functions and security sites
      const functions = [];
      const securitySites = [];

      function getSnippet(node) {
        try {
          const raw = node.getText(sourceFile).trim().replace(/[\r\n\t]+/g, " ");
          return raw.length > 160 ? raw.slice(0, 157) + "..." : raw;
        } catch {
          return "";
        }
      }

      function getCoords(node) {
        const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        return {
          startLine: startPos.line + 1,
          startColumn: startPos.character + 1,
          endLine: endPos.line + 1,
          endColumn: endPos.character + 1,
        };
      }

      function traverse(node) {
        if (
          ts.isFunctionDeclaration(node) ||
          ts.isFunctionExpression(node) ||
          ts.isArrowFunction(node) ||
          ts.isMethodDeclaration(node) ||
          ts.isConstructorDeclaration(node)
        ) {
          const coords = getCoords(node);
          const lineCount = coords.endLine - coords.startLine + 1;
          const complexity = calculateFunctionComplexity(node, sourceFile);

          functions.push({
            name: getFunctionName(node),
            startLine: coords.startLine,
            startColumn: coords.startColumn,
            endLine: coords.endLine,
            endColumn: coords.endColumn,
            lineCount,
            cyclomaticComplexity: complexity,
          });
        }

        // 1. JSSEC001: Dynamic Code Execution (eval, Function, new Function)
        if (ts.isCallExpression(node)) {
          if (ts.isIdentifier(node.expression) && (node.expression.text === "eval" || node.expression.text === "Function")) {
            const coords = getCoords(node);
            const isLiteral = node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0]);
            securitySites.push({
              ruleId: "JSSEC001",
              name: "Dynamic Code Execution",
              severity: isLiteral ? "MEDIUM" : "CRITICAL",
              confidence: isLiteral ? "MEDIUM" : "HIGH",
              startLine: coords.startLine,
              startColumn: coords.startColumn,
              endLine: coords.endLine,
              endColumn: coords.endColumn,
              evidence: getSnippet(node),
              description: `Call to ${node.expression.text}() dynamic code evaluation primitive`,
              metadata: { is_literal: isLiteral, primitive: node.expression.text },
            });
          }
        } else if (ts.isNewExpression(node)) {
          if (ts.isIdentifier(node.expression) && node.expression.text === "Function") {
            const coords = getCoords(node);
            const isLiteral = node.arguments && node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0]);
            securitySites.push({
              ruleId: "JSSEC001",
              name: "Dynamic Code Execution",
              severity: isLiteral ? "MEDIUM" : "CRITICAL",
              confidence: isLiteral ? "MEDIUM" : "HIGH",
              startLine: coords.startLine,
              startColumn: coords.startColumn,
              endLine: coords.endLine,
              endColumn: coords.endColumn,
              evidence: getSnippet(node),
              description: "Call to new Function() dynamic code execution primitive",
              metadata: { is_literal: isLiteral, primitive: "new Function" },
            });
          }
        }

        // 2. JSSEC002: Dangerous HTML Injection (innerHTML, outerHTML, dangerouslySetInnerHTML)
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          if (ts.isPropertyAccessExpression(node.left)) {
            const propName = node.left.name.text;
            if (propName === "innerHTML" || propName === "outerHTML") {
              const coords = getCoords(node);
              securitySites.push({
                ruleId: "JSSEC002",
                name: "Dangerous HTML Injection",
                severity: "HIGH",
                confidence: "MEDIUM",
                startLine: coords.startLine,
                startColumn: coords.startColumn,
                endLine: coords.endLine,
                endColumn: coords.endColumn,
                evidence: getSnippet(node),
                description: `Assignment to ${propName} browser HTML injection sink`,
                metadata: { sink: propName },
              });
            }
          }
        } else if (ts.isJsxAttribute(node)) {
          if (node.name && node.name.text === "dangerouslySetInnerHTML") {
            const coords = getCoords(node);
            securitySites.push({
              ruleId: "JSSEC002",
              name: "Dangerous HTML Injection",
              severity: "HIGH",
              confidence: "MEDIUM",
              startLine: coords.startLine,
              startColumn: coords.startColumn,
              endLine: coords.endLine,
              endColumn: coords.endColumn,
              evidence: getSnippet(node),
              description: "Use of dangerouslySetInnerHTML raw HTML sink in JSX element",
              metadata: { sink: "dangerouslySetInnerHTML" },
            });
          }
        }

        // 3. JSSEC003: Shell Execution Risk (exec, execSync, spawn with shell: true)
        if (ts.isCallExpression(node)) {
          let callName = "";
          if (ts.isPropertyAccessExpression(node.expression)) {
            callName = node.expression.name.text;
          } else if (ts.isIdentifier(node.expression)) {
            callName = node.expression.text;
          }

          if (callName === "exec" || callName === "execSync") {
            const coords = getCoords(node);
            const firstArg = node.arguments[0];
            const isDynamic = firstArg && (ts.isTemplateExpression(firstArg) || ts.isBinaryExpression(firstArg) || ts.isIdentifier(firstArg));
            securitySites.push({
              ruleId: "JSSEC003",
              name: "Shell Command Execution Risk",
              severity: isDynamic ? "HIGH" : "MEDIUM",
              confidence: isDynamic ? "HIGH" : "MEDIUM",
              startLine: coords.startLine,
              startColumn: coords.startColumn,
              endLine: coords.endLine,
              endColumn: coords.endColumn,
              evidence: getSnippet(node),
              description: `Call to child_process.${callName}() shell command execution API`,
              metadata: { api: callName, is_dynamic: isDynamic },
            });
          } else if (callName === "spawn" || callName === "spawnSync") {
            // Check for { shell: true } option
            let hasShellTrue = false;
            for (const arg of node.arguments) {
              if (ts.isObjectLiteralExpression(arg)) {
                for (const prop of arg.properties) {
                  if (ts.isPropertyAssignment(prop) && prop.name && prop.name.text === "shell") {
                    if (prop.initializer && prop.initializer.kind === ts.SyntaxKind.TrueKeyword) {
                      hasShellTrue = true;
                    }
                  }
                }
              }
            }
            if (hasShellTrue) {
              const coords = getCoords(node);
              securitySites.push({
                ruleId: "JSSEC003",
                name: "Shell Command Execution Risk",
                severity: "HIGH",
                confidence: "HIGH",
                startLine: coords.startLine,
                startColumn: coords.startColumn,
                endLine: coords.endLine,
                endColumn: coords.endColumn,
                evidence: getSnippet(node),
                description: `Call to ${callName}() with { shell: true } option`,
                metadata: { api: callName, shell_option: true },
              });
            }
          }

          // 4. JSSEC004: SQL Query Construction Risk
          if (callName === "query" || callName === "execute" || callName === "raw") {
            const firstArg = node.arguments[0];
            if (firstArg) {
              const isTemplate = ts.isTemplateExpression(firstArg);
              const isConcat = ts.isBinaryExpression(firstArg) && firstArg.operatorToken.kind === ts.SyntaxKind.PlusToken;
              if (isTemplate || isConcat) {
                const snippet = getSnippet(firstArg).toUpperCase();
                const sqlKeywords = ["SELECT", "INSERT", "UPDATE", "DELETE", "DROP", "FROM", "WHERE"];
                const hasSql = sqlKeywords.some((k) => snippet.includes(k));
                if (hasSql) {
                  const coords = getCoords(node);
                  securitySites.push({
                    ruleId: "JSSEC004",
                    name: "SQL Query Construction Risk",
                    severity: "HIGH",
                    confidence: "HIGH",
                    startLine: coords.startLine,
                    startColumn: coords.startColumn,
                    endLine: coords.endLine,
                    endColumn: coords.endColumn,
                    evidence: getSnippet(node),
                    description: `SQL query constructed via string interpolation/concatenation in ${callName}()`,
                    metadata: { api: callName, is_template: isTemplate, is_concat: isConcat },
                  });
                }
              }
            }
          }
        }

        ts.forEachChild(node, traverse);
      }

      traverse(sourceFile);

      functions.sort((a, b) => a.startLine - b.startLine || a.startColumn - b.startColumn);
      securitySites.sort((a, b) => a.startLine - b.startLine || a.startColumn - b.startColumn);

      process.stdout.write(
        JSON.stringify({
          status: "SUCCESS",
          totalLines,
          diagnostics: [],
          functions,
          securitySites,
        })
      );
    } catch (err) {
      process.stdout.write(
        JSON.stringify({
          status: "INTERNAL_ERROR",
          errorMessage: err.message,
        })
      );
    }
  });
}

runParser();
