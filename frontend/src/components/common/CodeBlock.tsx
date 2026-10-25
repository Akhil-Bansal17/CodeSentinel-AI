import React, { useState } from "react";
import { Check, Copy, FileCode } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CodeBlockProps {
  code: string;
  language?: string;
  fileName?: string;
  showLineNumbers?: boolean;
  allowCopy?: boolean;
  maxHeight?: string;
  isDiff?: boolean;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  fileName,
  showLineNumbers = false,
  allowCopy = true,
  maxHeight = "400px",
  isDiff = false,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = code.split("\n");

  return (
    <div
      className={cn(
        "rounded-lg border border-border-default bg-[#0d0d11] overflow-hidden text-xs sm:text-sm shadow-xs",
        className
      )}
    >
      {/* Optional Header */}
      {(fileName || language || allowCopy) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-default bg-surface-elevated text-text-muted">
          <div className="flex items-center gap-2 font-mono text-xs text-text-secondary truncate">
            {fileName ? (
              <>
                <FileCode className="w-3.5 h-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                <span className="truncate">{fileName}</span>
              </>
            ) : language ? (
              <span className="uppercase text-[11px] font-semibold text-text-muted">{language}</span>
            ) : null}
          </div>

          {allowCopy && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer shrink-0 ml-2"
              aria-label={copied ? "Code copied to clipboard" : "Copy code"}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-status-success" aria-hidden="true" />
                  <span className="text-status-success font-mono text-[11px]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="font-mono text-[11px]">Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Code Area */}
      <div
        className="overflow-x-auto p-4 font-mono leading-relaxed select-text"
        style={{ maxHeight }}
      >
        <pre className="m-0 p-0">
          <code>
            {lines.map((line, index) => {
              let diffClass = "";
              if (isDiff) {
                if (line.startsWith("+") && !line.startsWith("+++")) {
                  diffClass = "bg-status-success-bg text-status-success-text -mx-4 px-4 block";
                } else if (line.startsWith("-") && !line.startsWith("---")) {
                  diffClass = "bg-status-danger-bg text-status-danger-text -mx-4 px-4 block";
                } else if (line.startsWith("@@")) {
                  diffClass = "text-sky-400 font-semibold -mx-4 px-4 block bg-sky-950/20";
                }
              }

              return (
                <div key={index} className={cn("table-row", diffClass)}>
                  {showLineNumbers && (
                    <span
                      className="table-cell select-none pr-4 text-right text-text-disabled font-mono text-xs w-10"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                  )}
                  <span className="table-cell whitespace-pre text-text-primary">{line || "\n"}</span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
};
