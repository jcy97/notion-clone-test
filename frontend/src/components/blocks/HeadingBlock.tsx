import React, { useState, useRef, useEffect } from "react";
import { HeadingBlock as HeadingBlockType } from "../../types/block.types";

interface Props {
  block: HeadingBlockType;
  onUpdate: (id: string, content: string, level?: number) => void;
  onDelete: (id: string) => void;
  onNewBlock: (afterId: string) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const HeadingBlock: React.FC<Props> = ({
  block,
  onUpdate,
  onDelete,
  onNewBlock,
  isSelected,
  onSelect,
}) => {
  const [content, setContent] = useState(block.content);
  const [level, setLevel] = useState(block.level);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || "";
    setContent(newContent);
    onUpdate(block.id, newContent, level);
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

  const getHeadingClass = () => {
    switch (level) {
      case 1:
        return "text-3xl font-bold";
      case 2:
        return "text-2xl font-semibold";
      case 3:
        return "text-xl font-medium";
      default:
        return "text-xl font-medium";
    }
  };

  return (
    <div
      className={`group relative py-2 px-3 rounded hover:bg-gray-50 ${
        isSelected ? "bg-blue-50" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 mb-1">
        <select
          value={level}
          onChange={(e) => {
            const newLevel = parseInt(e.target.value) as 1 | 2 | 3;
            setLevel(newLevel);
            onUpdate(block.id, content, newLevel);
          }}
          className="text-sm px-2 py-1 border rounded bg-white"
        >
          <option value={1}>헤딩 1</option>
          <option value={2}>헤딩 2</option>
          <option value={3}>헤딩 3</option>
        </select>
      </div>

      <div
        ref={inputRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className={`outline-none min-h-[2rem] text-gray-900 placeholder-gray-400 ${getHeadingClass()}`}
        data-placeholder="헤딩을 입력하세요..."
      >
        {content}
      </div>

      <div className="absolute left-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded">
          ⋮⋮
        </button>
      </div>
    </div>
  );
};
