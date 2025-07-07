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
  const [isComposing, setIsComposing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);
  const lastSavedContentRef = useRef(block.content);

  // 편집 시작 시 초기 내용 저장
  const initialContentRef = useRef(block.content);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  // 외부에서 block.content가 변경될 때 DOM 업데이트 (편집 중이 아닐 때만)
  useEffect(() => {
    if (
      inputRef.current &&
      !isEditing && // 편집 중이 아닐 때만 외부 변경사항 반영
      block.content !== lastSavedContentRef.current
    ) {
      inputRef.current.textContent = block.content;
      lastSavedContentRef.current = block.content;
      initialContentRef.current = block.content;
    }
  }, [block.content, isEditing]);

  // 즉시 저장 함수 (편집 완료 시에만 호출)
  const saveContent = (content: string) => {
    if (content !== lastSavedContentRef.current) {
      lastSavedContentRef.current = content;
      onUpdate(block.id, content);
    }
  };

  // 편집 시작
  const startEditing = () => {
    if (!isEditing) {
      setIsEditing(true);
      initialContentRef.current = inputRef.current?.textContent || "";
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

  // 컴포넌트 언마운트 시 저장
  useEffect(() => {
    return () => {
      if (isEditing && inputRef.current) {
        const content = inputRef.current.textContent || "";
        if (content !== lastSavedContentRef.current) {
          onUpdate(block.id, content);
        }
      }
    };
  }, []);

  return (
    <div
      className={`group relative py-1 px-3 rounded hover:bg-gray-50 ${
        isSelected ? "bg-blue-50" : ""
      } ${isEditing ? "ring-1 ring-blue-200 bg-blue-25" : ""}`}
      onClick={onSelect}
    >
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
        className="outline-none min-h-[1.5rem] text-gray-900 placeholder-gray-400"
        data-placeholder="텍스트를 입력하세요..."
        style={{
          wordBreak: "break-word",
        }}
      >
        {block.content}
      </div>

      {/* 편집 상태 표시 */}
      {isEditing && (
        <div className="absolute right-2 top-1 text-xs text-gray-500 bg-white px-1 rounded">
          편집 중
        </div>
      )}

      {/* 블록 컨트롤 버튼들 */}
      <div className="absolute left-0 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          ⋮⋮
        </button>
      </div>
    </div>
  );
};
