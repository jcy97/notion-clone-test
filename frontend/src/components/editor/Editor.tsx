import React, { useState, useEffect, useCallback } from "react";
import { Block, BlockType } from "../../types/block.types";
import { Page } from "../../types/page.types";
import { TextBlock } from "../blocks/TextBlock";
import { HeadingBlock } from "../blocks/HeadingBlock";
import { ImageBlock } from "../blocks/ImageBlock";
import { TableBlock } from "../blocks/TableBlock";
import { BlockSelector } from "./BlockSelector";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useYDoc } from "../../hooks/useYDoc";
import { api } from "../../utils/api";
import {
  createBlock,
  reorderBlocks,
  insertBlockAtPosition,
  removeBlock,
  updateBlock as updateBlockUtil,
  handleBlockKeyboard,
  getBlockPreview,
} from "../../utils/blockUtils";

interface Props {
  page: Page;
  onPageUpdate: (page: Page) => void;
}

export const Editor: React.FC<Props> = ({ page, onPageUpdate }) => {
  const [blocks, setBlocks] = useState<Block[]>(page.blocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [blockSelectorPosition, setBlockSelectorPosition] = useState({
    x: 0,
    y: 0,
  });
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState(page.title);

  const socket = useWebSocket(page.id);

  // YJS 실시간 협업 훅 사용
  const {
    isConnected,
    updateBlock: updateYBlock,
    addBlock: addYBlock,
    deleteBlock: deleteYBlock,
    setUserCursor,
    setUserSelection,
  } = useYDoc({
    pageId: page.id,
    onUpdate: (content) => {
      // YJS 문서 업데이트 시 로컬 상태 동기화
      if (content.blocks) {
        const yBlocks = Object.values(content.blocks);
        setBlocks(reorderBlocks(yBlocks as Block[]));
      }
    },
  });

  useEffect(() => {
    setBlocks(reorderBlocks(page.blocks));
    setPageTitle(page.title);
  }, [page]);

  useEffect(() => {
    if (socket) {
      socket.on("block-updated", (updatedBlock: Block) => {
        setBlocks((prev) =>
          updateBlockUtil(prev, updatedBlock.id, updatedBlock)
        );
      });

      socket.on("block-created", (newBlock: Block) => {
        setBlocks((prev) => insertBlockAtPosition(prev, newBlock));
      });

      socket.on("block-deleted", (deletedBlockId: string) => {
        setBlocks((prev) => removeBlock(prev, deletedBlockId));
      });

      // 실시간 사용자 활동 표시
      socket.on(
        "user-typing",
        (data: { userId: string; userName: string; blockId: string }) => {
          console.log(
            `${data.userName}이 ${data.blockId} 블록을 편집 중입니다.`
          );
        }
      );

      socket.on(
        "user-cursor",
        (data: {
          userId: string;
          userName: string;
          blockId: string;
          position: number;
        }) => {
          // 다른 사용자의 커서 위치 표시 로직
          console.log(`${data.userName}의 커서 위치:`, data);
        }
      );
    }

    return () => {
      if (socket) {
        socket.off("block-updated");
        socket.off("block-created");
        socket.off("block-deleted");
        socket.off("user-typing");
        socket.off("user-cursor");
      }
    };
  }, [socket]);

  // 페이지 제목 업데이트
  const handleTitleUpdate = useCallback(
    async (newTitle: string) => {
      setPageTitle(newTitle);

      try {
        await api.put(`/pages/${page.id}`, { title: newTitle });
        onPageUpdate({ ...page, title: newTitle });
      } catch (error) {
        console.error("제목 업데이트 실패:", error);
      }
    },
    [page, onPageUpdate]
  );

  // 블록 업데이트
  // updateBlock 호출 시 정확한 타입 전달
  const updateBlock = useCallback(
    async (blockId: string, content: string, extra?: any) => {
      try {
        const response = await api.put(`/pages/${page.id}/blocks/${blockId}`, {
          content,
          ...extra,
        });

        const updatedBlock = response.data.block;

        // blockUtils의 updateBlock 사용 시 올바른 타입 전달
        setBlocks((prev) =>
          updateBlockUtil(prev, blockId, {
            content,
            ...extra,
            updatedAt: new Date(),
          })
        );

        // YJS 동기화
        updateYBlock(blockId, updatedBlock);

        // Socket.io 브로드캐스트
        if (socket) {
          socket.emit("block-update", updatedBlock);
        }
      } catch (error) {
        console.error("블록 업데이트 실패:", error);
      }
    },
    [page.id, socket, updateYBlock]
  );
  // 새 블록 생성
  const createNewBlock = useCallback(
    async (type: BlockType, afterBlockId?: string) => {
      try {
        const afterBlock = afterBlockId
          ? blocks.find((b) => b.id === afterBlockId)
          : null;
        const position = afterBlock ? afterBlock.position + 1 : blocks.length;

        // 로컬에서 임시 블록 생성 (타입 안전성 보장)
        const tempBlock = createBlock(type, "", position, page.id);
        setBlocks((prev) =>
          insertBlockAtPosition(prev, tempBlock, afterBlockId)
        );
        setSelectedBlockId(tempBlock.id);

        // 서버에 실제 블록 생성 요청
        const response = await api.post(`/pages/${page.id}/blocks`, {
          type,
          content: "",
          position,
        });

        const newBlock = response.data.block;

        // 실제 서버 응답으로 교체
        setBlocks((prev) => updateBlockUtil(prev, tempBlock.id, newBlock));
        setSelectedBlockId(newBlock.id);

        // YJS 동기화
        addYBlock(newBlock.id, newBlock, position);

        // Socket.io 브로드캐스트
        if (socket) {
          socket.emit("block-create", newBlock);
        }

        return newBlock;
      } catch (error) {
        console.error("블록 생성 실패:", error);
        // 에러 시 임시 블록 제거 (tempBlock이 정의된 경우에만)
      }
    },
    [page.id, blocks, socket, addYBlock]
  );
  // 블록 삭제
  const deleteBlock = useCallback(
    async (blockId: string) => {
      try {
        await api.delete(`/pages/${page.id}/blocks/${blockId}`);

        setBlocks((prev) => removeBlock(prev, blockId));

        // YJS 동기화
        deleteYBlock(blockId);

        // Socket.io 브로드캐스트
        if (socket) {
          socket.emit("block-delete", blockId);
        }

        // 이전 블록으로 포커스 이동
        const blockIndex = blocks.findIndex((b) => b.id === blockId);
        if (blockIndex > 0) {
          setSelectedBlockId(blocks[blockIndex - 1].id);
        } else if (blocks.length > 1) {
          setSelectedBlockId(blocks[1]?.id);
        }
      } catch (error) {
        console.error("블록 삭제 실패:", error);
      }
    },
    [page.id, blocks, socket, deleteYBlock]
  );

  // 새 블록 추가 트리거
  const handleNewBlock = useCallback((afterBlockId: string) => {
    setPendingBlockId(afterBlockId);

    // 블록 선택기 위치 계산
    const afterBlock = document.querySelector(
      `[data-block-id="${afterBlockId}"]`
    );
    if (afterBlock) {
      const rect = afterBlock.getBoundingClientRect();
      setBlockSelectorPosition({
        x: rect.left,
        y: rect.bottom + 5,
      });
    }

    setShowBlockSelector(true);
  }, []);

  // 블록 타입 선택 처리
  const handleBlockSelect = useCallback(
    (type: BlockType) => {
      createNewBlock(type, pendingBlockId || undefined);
      setShowBlockSelector(false);
      setPendingBlockId(null);
    },
    [createNewBlock, pendingBlockId]
  );

  // 커서 위치 추적 (실시간 협업용)
  const handleCursorChange = useCallback(
    (blockId: string, position: number) => {
      setUserCursor(blockId, position);
    },
    [setUserCursor]
  );

  // 키보드 이벤트 처리
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // / 키로 블록 선택기 열기
      if (e.key === "/") {
        e.preventDefault();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setBlockSelectorPosition({
            x: rect.left,
            y: rect.bottom + 5,
          });
          setShowBlockSelector(true);
        }
      }

      // Escape로 블록 선택기 닫기
      if (e.key === "Escape") {
        setShowBlockSelector(false);
        setPendingBlockId(null);
      }

      // 선택된 블록이 있을 때 키보드 단축키 처리
      if (selectedBlockId) {
        handleBlockKeyboard(
          e,
          selectedBlockId,
          handleNewBlock,
          deleteBlock,
          (id) => {
            // 블록 위로 이동 로직
            const currentIndex = blocks.findIndex((b) => b.id === id);
            if (currentIndex > 0) {
              setSelectedBlockId(blocks[currentIndex - 1].id);
            }
          },
          (id) => {
            // 블록 아래로 이동 로직
            const currentIndex = blocks.findIndex((b) => b.id === id);
            if (currentIndex < blocks.length - 1) {
              setSelectedBlockId(blocks[currentIndex + 1].id);
            }
          }
        );
      }
    },
    [selectedBlockId, blocks, handleNewBlock, deleteBlock]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // 블록 렌더링
  const renderBlock = (block: Block) => {
    const baseProps = {
      key: block.id,
      block,
      isSelected: selectedBlockId === block.id,
      onSelect: () => setSelectedBlockId(block.id),
      onDelete: deleteBlock,
    };

    switch (block.type) {
      case "text":
        return (
          <div data-block-id={block.id}>
            <TextBlock
              {...baseProps}
              block={block}
              onUpdate={updateBlock}
              onNewBlock={handleNewBlock}
            />
          </div>
        );
      case "heading":
        return (
          <div data-block-id={block.id}>
            <HeadingBlock
              {...baseProps}
              block={block}
              onUpdate={(id, content, level) =>
                updateBlock(id, content, { level })
              }
              onNewBlock={handleNewBlock}
            />
          </div>
        );
      case "image":
        return (
          <div data-block-id={block.id}>
            <ImageBlock
              {...baseProps}
              block={block}
              onUpdate={(id, url, caption) =>
                updateBlock(id, caption || "", { url, caption })
              }
            />
          </div>
        );
      case "table":
        return (
          <div data-block-id={block.id}>
            <TableBlock
              {...baseProps}
              block={block}
              onUpdate={(id, headers, rows) =>
                updateBlock(id, JSON.stringify({ headers, rows }))
              }
            />
          </div>
        );
      default:
        return null;
    }
  };

  // 빈 페이지 처리
  if (blocks.length === 0) {
    createNewBlock("text");
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* 연결 상태 표시 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {isConnected ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              실시간 동기화 연결됨
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              연결 중...
            </span>
          )}
        </div>

        {/* 페이지 정보 */}
        <div className="text-sm text-gray-500">
          {blocks.length}개 블록 • 마지막 수정:{" "}
          {new Date(page.updatedAt).toLocaleString()}
        </div>
      </div>

      {/* 페이지 제목 */}
      <input
        type="text"
        value={pageTitle}
        onChange={(e) => setPageTitle(e.target.value)}
        onBlur={(e) => handleTitleUpdate(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="w-full text-4xl font-bold mb-8 outline-none placeholder-gray-400 border-none bg-transparent"
        placeholder="제목 없음"
      />

      {/* 블록들 */}
      <div className="space-y-1">
        {reorderBlocks(blocks).map(renderBlock)}

        {/* 새 블록 추가 버튼 */}
        <button
          onClick={() => handleNewBlock(blocks[blocks.length - 1]?.id || "")}
          className="w-full py-4 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span>새 블록 추가하려면 클릭하거나 '/'를
          입력하세요
        </button>
      </div>

      {/* 블록 선택기 */}
      {showBlockSelector && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowBlockSelector(false)}
          />
          <BlockSelector
            onSelectBlock={handleBlockSelect}
            onClose={() => setShowBlockSelector(false)}
            position={blockSelectorPosition}
          />
        </>
      )}

      {/* 페이지 요약 정보 (디버깅용) */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-sm">
          <h4 className="font-semibold mb-2">개발 정보:</h4>
          <div>페이지 ID: {page.id}</div>
          <div>블록 수: {blocks.length}</div>
          <div>선택된 블록: {selectedBlockId || "없음"}</div>
          <div>YJS 연결: {isConnected ? "연결됨" : "연결 안됨"}</div>

          <details className="mt-2">
            <summary className="cursor-pointer">블록 미리보기</summary>
            <div className="mt-2 space-y-1">
              {blocks.map((block) => (
                <div key={block.id} className="text-xs">
                  {block.type}: {getBlockPreview(block, 50)}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
