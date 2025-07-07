import React, { useState } from "react";
import { TableBlock as TableBlockType } from "../../types/block.types";

interface Props {
  block: TableBlockType;
  onUpdate: (id: string, headers: string[], rows: string[][]) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const TableBlock: React.FC<Props> = ({
  block,
  onUpdate,
  onDelete,
  isSelected,
  onSelect,
}) => {
  const tableData = JSON.parse(
    block.content || '{"headers":["열1","열2"],"rows":[["",""]]}'
  );
  const [headers, setHeaders] = useState<string[]>(
    tableData.headers || ["열1", "열2"]
  );
  const [rows, setRows] = useState<string[][]>(tableData.rows || [["", ""]]);

  const updateTable = (newHeaders: string[], newRows: string[][]) => {
    setHeaders(newHeaders);
    setRows(newRows);
    onUpdate(block.id, newHeaders, newRows);
  };

  const addColumn = () => {
    const newHeaders = [...headers, `열${headers.length + 1}`];
    const newRows = rows.map((row) => [...row, ""]);
    updateTable(newHeaders, newRows);
  };

  const addRow = () => {
    const newRows = [...rows, new Array(headers.length).fill("")];
    updateTable(headers, newRows);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex] = [...newRows[rowIndex]];
    newRows[rowIndex][colIndex] = value;
    updateTable(headers, newRows);
  };

  const updateHeader = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    updateTable(newHeaders, rows);
  };

  return (
    <div
      className={`group relative py-2 px-3 rounded hover:bg-gray-50 ${
        isSelected ? "bg-blue-50" : ""
      }`}
      onClick={onSelect}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="border border-gray-300 p-2 bg-gray-50"
                >
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => updateHeader(index, e.target.value)}
                    className="w-full bg-transparent outline-none font-semibold text-center"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-gray-300 p-2">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) =>
                        updateCell(rowIndex, colIndex, e.target.value)
                      }
                      className="w-full bg-transparent outline-none"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={addColumn}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          열 추가
        </button>
        <button
          onClick={addRow}
          className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
        >
          행 추가
        </button>
      </div>

      <div className="absolute left-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded">
          ⋮⋮
        </button>
      </div>
    </div>
  );
};
