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

      // Extract functions
      const functions = [];

      function traverse(node) {
        if (
          ts.isFunctionDeclaration(node) ||
          ts.isFunctionExpression(node) ||
          ts.isArrowFunction(node) ||
          ts.isMethodDeclaration(node) ||
          ts.isConstructorDeclaration(node)
        ) {
          const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
          const startLine = startPos.line + 1;
          const endLine = endPos.line + 1;
          const lineCount = endLine - startLine + 1;
          const complexity = calculateFunctionComplexity(node, sourceFile);

          functions.push({
            name: getFunctionName(node),
            startLine,
            startColumn: startPos.character + 1,
            endLine,
            endColumn: endPos.character + 1,
            lineCount,
            cyclomaticComplexity: complexity,
          });
        }

        ts.forEachChild(node, traverse);
      }

      traverse(sourceFile);

      functions.sort((a, b) => a.startLine - b.startLine || a.startColumn - b.startColumn);

      process.stdout.write(
        JSON.stringify({
          status: "SUCCESS",
          totalLines,
          diagnostics: [],
          functions,
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
