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
  const [level, setLevel] = useState(block.level);
  const inputRef = useRef<HTMLDivElement>(null);
  const lastSavedContentRef = useRef(block.content);
  const lastSavedLevelRef = useRef<1 | 2 | 3>(block.level as 1 | 2 | 3);

  // 편집 시작 시 초기 내용 저장
  const initialContentRef = useRef(block.content);
  const initialLevelRef = useRef<1 | 2 | 3>(block.level as 1 | 2 | 3);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  // 외부에서 block이 변경될 때 DOM 업데이트 (편집 중이 아닐 때만)
  useEffect(() => {
    if (
      inputRef.current &&
      !isEditing && // 편집 중이 아닐 때만 외부 변경사항 반영
      (block.content !== lastSavedContentRef.current ||
        block.level !== lastSavedLevelRef.current)
    ) {
      inputRef.current.textContent = block.content;
      setLevel(block.level as 1 | 2 | 3);
      lastSavedContentRef.current = block.content;
      lastSavedLevelRef.current = block.level;
      initialContentRef.current = block.content;
      initialLevelRef.current = block.level as 1 | 2 | 3;
    }
  }, [block.content, block.level, isEditing]);

  // 즉시 저장 함수 (편집 완료 시에만 호출)
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

  // 편집 시작
  const startEditing = () => {
    if (!isEditing) {
      setIsEditing(true);
      initialContentRef.current = inputRef.current?.textContent || "";
      initialLevelRef.current = level;
    }
  };

  // 편집 완료
  const finishEditing = () => {
    if (isEditing) {
      setIsEditing(false);
      const content = inputRef.current?.textContent || "";
      saveContent(content);
    }
  };

  // 편집 취소
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
    // 조합 완료 시에도 저장하지 않음, 계속 편집 상태 유지
  };

  const handleInput = () => {
    // 입력 중에는 아무것도 하지 않음 (로컬 DOM 상태만 변경됨)
    // API 호출 절대 없음!
    startEditing();
  };

  const handleBlur = () => {
    // 포커스 해제 시에만 저장
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

    // Ctrl+S로 수동 저장
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      finishEditing();
      startEditing(); // 저장 후 계속 편집
    }
  };

  // 레벨 변경 시 즉시 저장
  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLevel = parseInt(e.target.value) as 1 | 2 | 3;
    setLevel(newLevel);
    const content = inputRef.current?.textContent || "";
    saveContent(content, newLevel);
  };

  // 컴포넌트 언마운트 시 저장
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

        {/* 편집 상태 표시 */}
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
