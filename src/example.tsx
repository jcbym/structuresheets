// Starter scaffold for a structured spreadsheet using TanStack Table and reactive computation

import React, { useState } from "react";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { signal } from "@preact/signals-core";

// --- Data model types ---
type CellValue = string | number | null;

type RowData = {
  id: string;
  inputs: Record<string, CellValue>;
};

// --- Example formula engine ---
const computationGraph = new Map<string, () => CellValue>();
const computedValues = new Map<string, CellValue>();

function evaluateCell(cellId: string): CellValue {
  const formula = computationGraph.get(cellId);
  if (!formula) return null;
  const value = formula();
  computedValues.set(cellId, value);
  return value;
}

// --- React Table setup ---
export default function StructuredSpreadsheet() {
  const [data, setData] = useState<RowData[]>([
    { id: "row1", inputs: { A: 1, B: 2 } },
    { id: "row2", inputs: { A: 3, B: 4 } },
  ]);

  const columns = ["A", "B", "C"].map((col) => ({
    accessorKey: col,
    header: col,
    cell: ({ row, getValue }: any) => {
      const rowId = row.original.id;
      const value = getValue();
      const cellId = `${rowId}.${col}`;
      const isComputed = col === "C";

      if (isComputed) {
        return computedValues.get(cellId) ?? "";
      }

      return (
        <input
          className="border p-1"
          value={value ?? ""}
          onChange={(e) => {
            const newData = data.map((r) =>
              r.id === rowId ? { ...r, inputs: { ...r.inputs, [col]: e.target.value } } : r
            );
            setData(newData);
            triggerRecompute();
          }}
        />
      );
    },
    accessorFn: (row: RowData) => row.inputs[col] ?? null,
  }));

  // Setup formulas for column C
  data.forEach((row) => {
    const cellId = `${row.id}.C`;
    computationGraph.set(cellId, () => {
      const a = Number(row.inputs.A);
      const b = Number(row.inputs.B);
      return a + b;
    });
    evaluateCell(cellId);
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function triggerRecompute() {
    data.forEach((row) => evaluateCell(`${row.id}.C`));
  }

  return (
    <div className="p-4">
      <table className="table-auto border border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th className="border px-2 py-1" key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td className="border px-2 py-1" key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
