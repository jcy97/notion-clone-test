import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const isUpdatingFromProps = useRef(false);
  const isUserTyping = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedData = useRef("");

  useEffect(() => {
    try {
      const newTableData = JSON.parse(
        block.content || '{"headers":["열1","열2"],"rows":[["",""]]}'
      );

      const newHeaders = newTableData.headers || ["열1", "열2"];
      const newRows = newTableData.rows || [["", ""]];

      const currentDataStr = JSON.stringify({ headers, rows });
      const newDataStr = JSON.stringify({ headers: newHeaders, rows: newRows });

      if (
        newDataStr !== currentDataStr &&
        lastSyncedData.current !== newDataStr &&
        !isUserTyping.current
      ) {
        isUpdatingFromProps.current = true;
        lastSyncedData.current = newDataStr;
        setHeaders(newHeaders);
        setRows(newRows);
        setTimeout(() => {
          isUpdatingFromProps.current = false;
        }, 0);
      }
    } catch (error) {
      console.error("테이블 데이터 파싱 오류:", error);
    }
  }, [block.content, headers, rows]);

  const updateTable = useCallback(
    (newHeaders: string[], newRows: string[][]) => {
      if (isUpdatingFromProps.current) return;

      isUserTyping.current = true;
      const newDataStr = JSON.stringify({ headers: newHeaders, rows: newRows });
      lastSyncedData.current = newDataStr;

      setHeaders(newHeaders);
      setRows(newRows);
      onUpdate(block.id, newHeaders, newRows);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        isUserTyping.current = false;
      }, 1500);
    },
    [onUpdate, block.id]
  );

  const addColumn = useCallback(() => {
    const newHeaders = [...headers, `열${headers.length + 1}`];
    const newRows = rows.map((row) => [...row, ""]);
    updateTable(newHeaders, newRows);
  }, [headers, rows, updateTable]);

  const addRow = useCallback(() => {
    const newRows = [...rows, new Array(headers.length).fill("")];
    updateTable(headers, newRows);
  }, [headers, rows, updateTable]);

  const updateCell = useCallback(
    (rowIndex: number, colIndex: number, value: string) => {
      const newRows = [...rows];
      newRows[rowIndex] = [...newRows[rowIndex]];
      newRows[rowIndex][colIndex] = value;
      updateTable(headers, newRows);
    },
    [headers, rows, updateTable]
  );

  const updateHeader = useCallback(
    (index: number, value: string) => {
      const newHeaders = [...headers];
      newHeaders[index] = value;
      updateTable(newHeaders, rows);
    },
    [headers, rows, updateTable]
  );

  const removeColumn = useCallback(
    (colIndex: number) => {
      if (headers.length <= 1) return;

      const newHeaders = headers.filter((_, index) => index !== colIndex);
      const newRows = rows.map((row) =>
        row.filter((_, index) => index !== colIndex)
      );
      updateTable(newHeaders, newRows);
    },
    [headers, rows, updateTable]
  );

  const removeRow = useCallback(
    (rowIndex: number) => {
      if (rows.length <= 1) return;

      const newRows = rows.filter((_, index) => index !== rowIndex);
      updateTable(headers, newRows);
    },
    [headers, rows, updateTable]
  );

  const handleInputFocus = useCallback(() => {
    isUserTyping.current = true;
  }, []);

  const handleInputBlur = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isUserTyping.current = false;
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

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
                  className="border border-gray-300 p-2 bg-gray-50 relative group"
                >
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => updateHeader(index, e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="w-full bg-transparent outline-none font-semibold text-center"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {headers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeColumn(index);
                      }}
                      className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title="열 삭제"
                    >
                      ×
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="group">
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className="border border-gray-300 p-2 relative"
                  >
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) =>
                        updateCell(rowIndex, colIndex, e.target.value)
                      }
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      className="w-full bg-transparent outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                ))}
                {rows.length > 1 && (
                  <td className="border border-gray-300 p-1 w-8">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRow(rowIndex);
                      }}
                      className="w-full h-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title="행 삭제"
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            addColumn();
          }}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          열 추가
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            addRow();
          }}
          className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
        >
          행 추가
        </button>
        <div className="text-sm text-gray-500 flex items-center">
          {rows.length}행 × {headers.length}열
        </div>
      </div>

      <div className="absolute left-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded">
          ⋮⋮
        </button>
      </div>
    </div>
  );
};
