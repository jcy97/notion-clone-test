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

  const initialContentRef = useRef(block.content);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  useEffect(() => {
    if (
      inputRef.current &&
      !isEditing &&
      block.content !== lastSavedContentRef.current
    ) {
      inputRef.current.textContent = block.content;
      lastSavedContentRef.current = block.content;
      initialContentRef.current = block.content;
    }
  }, [block.content, isEditing]);

  const saveContent = (content: string) => {
    if (content !== lastSavedContentRef.current) {
      lastSavedContentRef.current = content;
      onUpdate(block.id, content);
    }
  };

  const startEditing = () => {
    if (!isEditing) {
      setIsEditing(true);
      initialContentRef.current = inputRef.current?.textContent || "";
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

      {isEditing && (
        <div className="absolute right-2 top-1 text-xs text-gray-500 bg-white px-1 rounded">
          편집 중
        </div>
      )}

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
