import React from "react";

export function formatInlineMarkdown(text: string): React.ReactNode {
  if (!text) return "";
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="text-white font-bold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="font-mono text-[#00e59a] bg-[#00e59a15] px-1 py-0.5 rounded text-[10px]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="italic text-gray-300">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

export function FormattedChatMessage({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let tableRows: string[] = [];
  let inTable = false;

  const flushTable = (key: number) => {
    if (tableRows.length === 0) return;
    const cleanRows = tableRows
      .filter((r) => !r.includes("---") && r.trim().startsWith("|"))
      .map((r) =>
        r
          .split("|")
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1),
      );

    if (cleanRows.length > 0) {
      const header = cleanRows[0];
      const body = cleanRows.slice(1);
      blocks.push(
        <div
          key={`table-${key}`}
          className="my-2.5 overflow-x-auto rounded-xl border border-[#1a5c40] bg-[#020b07] shadow-inner"
        >
          <table className="w-full text-left text-[11px] font-sans">
            <thead>
              <tr className="border-b border-[#1a5c40] bg-[#061e13]">
                {header.map((th, i) => (
                  <th
                    key={i}
                    className="px-3 py-1.5 font-extrabold text-[#00e59a] font-mono text-[10px] uppercase tracking-wider"
                  >
                    {th.replace(/\*\*/g, "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0e3122]">
              {body.map((row, ri) => (
                <tr key={ri} className="hover:bg-[#071b12]/70 transition-colors">
                  {row.map((cell, ci) => {
                    const isProfit =
                      cell.includes("+") ||
                      cell.toLowerCase().includes("profit") ||
                      cell.toLowerCase().includes("upside");
                    const isLoss =
                      (cell.includes("-") &&
                        !cell.includes("---") &&
                        !cell.includes("1D") &&
                        !cell.includes("1W")) ||
                      cell.toLowerCase().includes("loss") ||
                      cell.toLowerCase().includes("stop-loss");
                    return (
                      <td
                        key={ci}
                        className={`px-3 py-1.5 ${
                          ci === 0 ? "font-semibold text-gray-300" : "font-mono"
                        } ${
                          isProfit
                            ? "text-[#00e59a] font-bold"
                            : isLoss
                              ? "text-[#ff6b7a] font-bold"
                              : "text-gray-200"
                        }`}
                      >
                        {formatInlineMarkdown(cell)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    }
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      inTable = true;
      tableRows.push(trimmed);
      return;
    } else if (inTable) {
      flushTable(idx);
    }

    if (!trimmed) {
      blocks.push(<div key={`sp-${idx}`} className="h-1" />);
      return;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h3
          key={`h3-${idx}`}
          className="text-xs font-black text-white uppercase tracking-wider mt-2.5 mb-1 flex items-center gap-1.5"
        >
          {formatInlineMarkdown(trimmed.replace(/^###\s+/, ""))}
        </h3>,
      );
      return;
    }

    if (trimmed.startsWith("#### ")) {
      blocks.push(
        <h4
          key={`h4-${idx}`}
          className="text-[11.5px] font-bold text-[#00e59a] mt-2 mb-0.5 flex items-center gap-1"
        >
          {formatInlineMarkdown(trimmed.replace(/^####\s+/, ""))}
        </h4>,
      );
      return;
    }

    if (trimmed === "---") {
      blocks.push(<hr key={`hr-${idx}`} className="border-t border-[#123124] my-2" />);
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
      blocks.push(
        <div
          key={`li-${idx}`}
          className="flex items-start gap-1.5 my-1 text-[11px] leading-relaxed pl-1 text-gray-200"
        >
          <span className="text-[#00e59a] shrink-0 mt-0.5 text-xs">▸</span>
          <span>{formatInlineMarkdown(trimmed.replace(/^[-•*]\s+/, ""))}</span>
        </div>,
      );
      return;
    }

    blocks.push(
      <p key={`p-${idx}`} className="text-[11.5px] text-gray-200 leading-relaxed my-1">
        {formatInlineMarkdown(trimmed)}
      </p>,
    );
  });

  if (inTable) {
    flushTable(lines.length);
  }

  return <div className="space-y-0.5">{blocks}</div>;
}
