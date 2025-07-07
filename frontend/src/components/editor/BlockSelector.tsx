import React, { useState, useEffect, useRef } from "react";
import { BlockType } from "../../types/block.types";
import { createBlock, isValidBlockType } from "../../utils/blockUtils";

interface Props {
  onSelectBlock: (type: BlockType) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

interface BlockTypeInfo {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
  shortcut?: string;
  keywords: string[];
}

export const BlockSelector: React.FC<Props> = ({
  onSelectBlock,
  onClose,
  position,
}) => {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const blockTypes: BlockTypeInfo[] = [
    {
      type: "text",
      label: "텍스트",
      icon: "📝",
      description: "일반 텍스트를 작성합니다",
      shortcut: "Enter",
      keywords: ["텍스트", "text", "글", "내용"],
    },
    {
      type: "heading",
      label: "헤딩",
      icon: "📰",
      description: "섹션 제목을 작성합니다",
      shortcut: "# + Space",
      keywords: ["제목", "heading", "h1", "h2", "h3", "헤딩", "타이틀"],
    },
    {
      type: "image",
      label: "이미지",
      icon: "🖼️",
      description: "이미지를 업로드하거나 링크합니다",
      keywords: ["이미지", "image", "사진", "photo", "그림"],
    },
    {
      type: "table",
      label: "테이블",
      icon: "📊",
      description: "표를 생성합니다",
      keywords: ["테이블", "table", "표", "데이터", "차트"],
    },
  ];

  const filteredBlocks = blockTypes.filter(
    (block) =>
      block.label.toLowerCase().includes(search.toLowerCase()) ||
      block.description.toLowerCase().includes(search.toLowerCase()) ||
      block.keywords.some((keyword) =>
        keyword.toLowerCase().includes(search.toLowerCase())
      )
  );

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleSelectBlock = (type: BlockType) => {
    if (isValidBlockType(type)) {
      onSelectBlock(type);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        if (filteredBlocks[selectedIndex]) {
          handleSelectBlock(filteredBlocks[selectedIndex].type);
        }
        break;

      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredBlocks.length - 1 ? prev + 1 : 0
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredBlocks.length - 1
        );
        break;

      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  // 검색어로 자동 선택
  useEffect(() => {
    if (search) {
      const exactMatch = filteredBlocks.find((block) =>
        block.keywords.some(
          (keyword) => keyword.toLowerCase() === search.toLowerCase()
        )
      );
      if (exactMatch) {
        const index = filteredBlocks.indexOf(exactMatch);
        setSelectedIndex(index);
      }
    }
  }, [search, filteredBlocks]);

  return (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 w-80 max-h-80 overflow-hidden"
      style={{
        top: Math.min(position.y, window.innerHeight - 320),
        left: Math.min(position.x, window.innerWidth - 320),
      }}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="블록 유형 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="max-h-60 overflow-y-auto">
        {filteredBlocks.map((block, index) => (
          <button
            key={block.type}
            onClick={() => handleSelectBlock(block.type)}
            className={`w-full p-3 text-left rounded-md transition-colors flex items-start gap-3 ${
              index === selectedIndex
                ? "bg-blue-50 border border-blue-200"
                : "hover:bg-gray-50 border border-transparent"
            }`}
          >
            <span className="text-lg flex-shrink-0">{block.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{block.label}</span>
                {block.shortcut && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {block.shortcut}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {block.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {filteredBlocks.length === 0 && (
        <div className="p-3 text-center text-gray-500 text-sm">
          <div className="mb-2">검색 결과가 없습니다</div>
          <div className="text-xs">
            사용 가능한 블록: 텍스트, 헤딩, 이미지, 테이블
          </div>
        </div>
      )}

      {/* 키보드 단축키 안내 */}
      <div className="border-t border-gray-100 mt-2 pt-2 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>↑↓ 탐색</span>
          <span>Enter 선택</span>
          <span>Esc 취소</span>
        </div>
      </div>
    </div>
  );
};
