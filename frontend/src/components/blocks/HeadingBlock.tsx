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
  const [isComposing, setIsComposing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const currentLevel =
    (block as any).level || (block as any).metadata?.level || 1;
  const [level, setLevel] = useState<1 | 2 | 3>(currentLevel as 1 | 2 | 3);
  const inputRef = useRef<HTMLDivElement>(null);
  const lastSavedContentRef = useRef(block.content);
  const lastSavedLevelRef = useRef<1 | 2 | 3>(currentLevel as 1 | 2 | 3);

  const initialContentRef = useRef(block.content);
  const initialLevelRef = useRef<1 | 2 | 3>(currentLevel as 1 | 2 | 3);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  useEffect(() => {
    const newLevel =
      (block as any).level || (block as any).metadata?.level || 1;
    if (
      inputRef.current &&
      !isEditing &&
      (block.content !== lastSavedContentRef.current ||
        newLevel !== lastSavedLevelRef.current)
    ) {
      inputRef.current.textContent = block.content;
      setLevel(newLevel as 1 | 2 | 3);
      lastSavedContentRef.current = block.content;
      lastSavedLevelRef.current = newLevel as 1 | 2 | 3;
      initialContentRef.current = block.content;
      initialLevelRef.current = newLevel as 1 | 2 | 3;
    }
  }, [
    block.content,
    (block as any).level,
    (block as any).metadata?.level,
    isEditing,
  ]);

  const saveContent = (content: string, newLevel?: 1 | 2 | 3) => {
    const levelToSave = newLevel !== undefined ? newLevel : level;
    if (
      content !== lastSavedContentRef.current ||
      levelToSave !== lastSavedLevelRef.current
    ) {
      lastSavedContentRef.current = content;
      lastSavedLevelRef.current = levelToSave;
      onUpdate(block.id, content, levelToSave);
    }
  };

  const startEditing = () => {
    if (!isEditing) {
      setIsEditing(true);
      initialContentRef.current = inputRef.current?.textContent || "";
      initialLevelRef.current = level;
    }
  };

  const finishEditing = () => {
    if (isEditing) {
      setIsEditing(false);
      const content = inputRef.current?.textContent || "";
      saveContent(content);
    }
  };

  const cancelEditing = () => {
    if (isEditing && inputRef.current) {
      inputRef.current.textContent = initialContentRef.current;
      setLevel(initialLevelRef.current);
      setIsEditing(false);
    }
  };

  const handleFocus = () => {
    startEditing();
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
    startEditing();
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleInput = () => {
    startEditing();
  };

  const handleBlur = () => {
    finishEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing) {
      return;
    }

    const currentContent = inputRef.current?.textContent || "";

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      finishEditing();
      onNewBlock(block.id);
    }

    if (e.key === "Backspace" && currentContent === "") {
      e.preventDefault();
      finishEditing();
      onDelete(block.id);
    }

    if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
      inputRef.current?.blur();
    }

    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      finishEditing();
      startEditing();
    }
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLevel = parseInt(e.target.value) as 1 | 2 | 3;
    setLevel(newLevel);
    const content = inputRef.current?.textContent || "";
    saveContent(content, newLevel);
  };

  useEffect(() => {
    return () => {
      if (isEditing && inputRef.current) {
        const content = inputRef.current.textContent || "";
        if (
          content !== lastSavedContentRef.current ||
          level !== lastSavedLevelRef.current
        ) {
          onUpdate(block.id, content, level);
        }
      }
    };
  }, []);

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
      } ${isEditing ? "ring-1 ring-blue-200 bg-blue-25" : ""}`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 mb-1">
        <select
          value={level}
          onChange={handleLevelChange}
          className="text-sm px-2 py-1 border rounded bg-white"
        >
          <option value={1}>헤딩 1</option>
          <option value={2}>헤딩 2</option>
          <option value={3}>헤딩 3</option>
        </select>

        {isEditing && (
          <div className="text-xs text-gray-500 bg-white px-1 rounded">
            편집 중
          </div>
        )}
      </div>

      <div
        ref={inputRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`outline-none min-h-[2rem] text-gray-900 placeholder-gray-400 ${getHeadingClass()}`}
        data-placeholder="헤딩을 입력하세요..."
      >
        {block.content}
      </div>

      <div className="absolute left-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded">
          ⋮⋮
        </button>
      </div>
    </div>
  );
};
