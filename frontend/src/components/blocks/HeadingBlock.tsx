import React, { useState, useRef, useEffect, useCallback } from "react";
import * as Y from "yjs";
import { HeadingBlock as HeadingBlockType } from "../../types/block.types";
import { UserCursor } from "../collaboration/UserCursor";
import { TypingIndicator } from "../collaboration/TypingIndicator";

interface Props {
  block: HeadingBlockType;
  onUpdate: (id: string, content: string, level?: number) => void;
  onDelete: (id: string) => void;
  onNewBlock: (afterId: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  ytext?: Y.Text;
  onCursorMove?: (blockId: string, position: number) => void;
  onSelectionChange?: (blockId: string, start: number, end: number) => void;
  onTypingStart?: (blockId: string) => void;
  onTypingStop?: (blockId: string) => void;
  userCursors?: Map<string, any>;
  typingUsers?: Map<string, any>;
}

export const HeadingBlock: React.FC<Props> = ({
  block,
  onUpdate,
  onDelete,
  onNewBlock,
  isSelected,
  onSelect,
  ytext,
  onCursorMove,
  onSelectionChange,
  onTypingStart,
  onTypingStop,
  userCursors = new Map(),
  typingUsers = new Map(),
}) => {
  const [isComposing, setIsComposing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const currentLevel =
    (block as any).level || (block as any).metadata?.level || 1;
  const [level, setLevel] = useState<1 | 2 | 3>(currentLevel as 1 | 2 | 3);
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromYjs = useRef(false);
  const isUpdatingToYjs = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cursorUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
  ];
  const getUserColor = useCallback((userId: string) => {
    const hash = userId.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }, []);

  const syncWithYText = useCallback(() => {
    if (!ytext || !editorRef.current || isUpdatingToYjs.current) return;

    isUpdatingFromYjs.current = true;
    const ytextContent = ytext.toString();

    if (editorRef.current.textContent !== ytextContent) {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      const startOffset = range?.startOffset || 0;

      editorRef.current.textContent = ytextContent;

      if (isSelected && selection && range) {
        const newRange = document.createRange();
        const textNode = editorRef.current.firstChild;
        if (textNode) {
          newRange.setStart(
            textNode,
            Math.min(startOffset, ytextContent.length)
          );
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    }

    setTimeout(() => {
      isUpdatingFromYjs.current = false;
    }, 0);
  }, [ytext, isSelected]);

  useEffect(() => {
    if (!ytext) return;

    const handleYTextChange = () => {
      if (!isUpdatingToYjs.current) {
        syncWithYText();
      }
    };

    ytext.observe(handleYTextChange);

    if (
      editorRef.current &&
      !editorRef.current.textContent &&
      ytext.length > 0
    ) {
      syncWithYText();
    }

    return () => {
      ytext.unobserve(handleYTextChange);
    };
  }, [ytext, syncWithYText]);

  useEffect(() => {
    if (!ytext || !editorRef.current?.textContent || isUpdatingFromYjs.current)
      return;

    const currentContent = editorRef.current.textContent;
    const ytextContent = ytext.toString();

    if (
      currentContent &&
      ytextContent !== currentContent &&
      !isUpdatingToYjs.current
    ) {
      isUpdatingToYjs.current = true;
      ytext.delete(0, ytext.length);
      ytext.insert(0, currentContent);
      setTimeout(() => {
        isUpdatingToYjs.current = false;
      }, 0);
    }
  }, [block.content, ytext]);

  const updateCursorPosition = useCallback(() => {
    if (!isSelected || !onCursorMove || !editorRef.current) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const position = range.startOffset;

      if (cursorUpdateTimeoutRef.current) {
        clearTimeout(cursorUpdateTimeoutRef.current);
      }

      cursorUpdateTimeoutRef.current = setTimeout(() => {
        onCursorMove(block.id, position);
      }, 100);
    }
  }, [isSelected, onCursorMove, block.id]);

  const handleInput = useCallback(
    (e: React.FormEvent) => {
      if (isUpdatingFromYjs.current) return;

      const target = e.target as HTMLDivElement;
      const newContent = target.textContent || "";

      onUpdate(block.id, newContent, level);

      if (ytext && !isUpdatingToYjs.current) {
        isUpdatingToYjs.current = true;
        setTimeout(() => {
          ytext.delete(0, ytext.length);
          if (newContent) {
            ytext.insert(0, newContent);
          }
          isUpdatingToYjs.current = false;
        }, 0);
      }

      if (!isTyping && onTypingStart) {
        setIsTyping(true);
        onTypingStart(block.id);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (onTypingStop) {
          setIsTyping(false);
          onTypingStop(block.id);
        }
      }, 1000);

      setTimeout(() => {
        updateCursorPosition();
      }, 0);
    },
    [
      ytext,
      onUpdate,
      block.id,
      level,
      onTypingStart,
      onTypingStop,
      isTyping,
      updateCursorPosition,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isComposing) return;

      const currentContent = editorRef.current?.textContent || "";

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (onTypingStop && isTyping) {
          onTypingStop(block.id);
          setIsTyping(false);
        }
        onNewBlock(block.id);
      }

      if (e.key === "Backspace" && currentContent === "") {
        e.preventDefault();
        if (onTypingStop && isTyping) {
          onTypingStop(block.id);
          setIsTyping(false);
        }
        onDelete(block.id);
      }
    },
    [isComposing, onNewBlock, onDelete, block.id, onTypingStop, isTyping]
  );

  const handleLevelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLevel = parseInt(e.target.value) as 1 | 2 | 3;
      setLevel(newLevel);
      const content = editorRef.current?.textContent || "";
      onUpdate(block.id, content, newLevel);
    },
    [onUpdate, block.id]
  );

  const handleSelectionChange = useCallback(() => {
    if (!isSelected || !onSelectionChange || !editorRef.current) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        const start = range.startOffset;
        const end = range.endOffset;

        if (start !== end) {
          onSelectionChange(block.id, start, end);
        }
      }
    }
  }, [isSelected, onSelectionChange, block.id]);

  const handleFocus = useCallback(() => {
    onSelect();
    updateCursorPosition();
  }, [onSelect, updateCursorPosition]);

  const handleBlur = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (onTypingStop && isTyping) {
      onTypingStop(block.id);
      setIsTyping(false);
    }
  }, [onTypingStop, isTyping, block.id]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (cursorUpdateTimeoutRef.current) {
        clearTimeout(cursorUpdateTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      !isUpdatingFromYjs.current &&
      editorRef.current &&
      block.content !== editorRef.current.textContent
    ) {
      editorRef.current.textContent = block.content;
    }
  }, [block.content]);

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

  const blockTypingUsers = Array.from(typingUsers.values()).filter(
    (user) => user.blockId === block.id
  );

  const blockCursors = Array.from(userCursors.values()).filter(
    (cursor) => cursor.cursor?.blockId === block.id
  );

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
          onChange={handleLevelChange}
          className="text-sm px-2 py-1 border rounded bg-white"
        >
          <option value={1}>헤딩 1</option>
          <option value={2}>헤딩 2</option>
          <option value={3}>헤딩 3</option>
        </select>

        {isTyping && (
          <div className="text-xs text-gray-500 bg-white px-1 rounded">
            편집 중
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`outline-none min-h-[2rem] text-gray-900 placeholder-gray-400 relative ${getHeadingClass()}`}
          data-placeholder="헤딩을 입력하세요..."
        />

        {blockCursors.map((cursor) => {
          const element = editorRef.current;
          if (!element || !element.firstChild) return null;

          const textNode = element.firstChild as Text;
          const range = document.createRange();
          const position = Math.min(
            cursor.cursor.position,
            textNode.textContent?.length || 0
          );

          try {
            range.setStart(textNode, position);
            range.setEnd(textNode, position);
            const rect = range.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();

            return (
              <UserCursor
                key={cursor.userId}
                userId={cursor.userId}
                userName={cursor.userName}
                userAvatar={cursor.userAvatar}
                position={{
                  top: rect.top - elementRect.top,
                  left: rect.left - elementRect.left,
                }}
                color={getUserColor(cursor.userId)}
              />
            );
          } catch {
            return null;
          }
        })}
      </div>

      {blockTypingUsers.length > 0 && (
        <TypingIndicator users={blockTypingUsers} />
      )}

      <div className="absolute left-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded">
          ⋮⋮
        </button>
      </div>
    </div>
  );
};
