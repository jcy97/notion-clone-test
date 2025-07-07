import React, { useState, useRef, useEffect } from "react";
import { TextBlock as TextBlockType } from "../../types/block.types";

interface Props {
  block: TextBlockType;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onNewBlock: (afterId: string) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const TextBlock: React.FC<Props> = ({
  block,
  onUpdate,
  onDelete,
  onNewBlock,
  isSelected,
  onSelect,
}) => {
  const [content, setContent] = useState(block.content);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || "";
    setContent(newContent);
    onUpdate(block.id, newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onNewBlock(block.id);
    }

    if (e.key === "Backspace" && content === "") {
      e.preventDefault();
      onDelete(block.id);
    }
  };

  return (
    <div
      className={`group relative py-1 px-3 rounded hover:bg-gray-50 ${
        isSelected ? "bg-blue-50" : ""
      }`}
      onClick={onSelect}
    >
      <div
        ref={inputRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="outline-none min-h-[1.5rem] text-gray-900 placeholder-gray-400"
        data-placeholder="텍스트를 입력하세요..."
        style={{
          wordBreak: "break-word",
        }}
      >
        {content}
      </div>

      {/* 블록 컨트롤 버튼들 */}
      <div className="absolute left-0 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
          onClick={(e) => {
            e.stopPropagation();
            // 드래그 핸들 기능 (추후 구현)
          }}
        >
          ⋮⋮
        </button>
      </div>
    </div>
  );
};
