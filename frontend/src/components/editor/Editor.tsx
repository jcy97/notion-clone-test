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
  getBlockPreview,
} from "../../utils/blockUtils";

interface Props {
  page: Page;
  onPageUpdate: (page: Page) => void;
}

export const Editor: React.FC<Props> = ({ page, onPageUpdate }) => {
  const [blocks, setBlocks] = useState<Block[]>(page.blocks || []);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [blockSelectorPosition, setBlockSelectorPosition] = useState({
    x: 0,
    y: 0,
  });
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState(page.title);

  const socket = useWebSocket(page.id);

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
      if (content.blocks) {
        const yBlocks = Object.values(content.blocks);
        setBlocks(reorderBlocks(yBlocks as Block[]));
      }
    },
  });

  useEffect(() => {
    setBlocks(reorderBlocks(page.blocks || []));
    setPageTitle(page.title);
  }, [page]);

  useEffect(() => {
    const createFirstBlock = async () => {
      if (blocks && blocks.length === 0) {
        try {
          const response = await api.post(`/pages/${page.id}/blocks`, {
            type: "text",
            content: "",
            position: 0,
          });

          const newBlock = response.data.block;
          setBlocks([newBlock]);
          setSelectedBlockId(newBlock.id);
        } catch (error) {
          console.error("첫 블록 생성 실패:", error);
        }
      }
    };

    createFirstBlock();
  }, [blocks?.length, page.id]);

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

  const updateBlock = useCallback(
    async (blockId: string, content: string, extra?: any) => {
      try {
        const updateData = { content, ...extra };
        const response = await api.put(
          `/pages/${page.id}/blocks/${blockId}`,
          updateData
        );

        const updatedBlock = response.data.block;

        setBlocks((prev) =>
          updateBlockUtil(prev, blockId, {
            ...updateData,
            updatedAt: new Date(),
          })
        );

        updateYBlock(blockId, updatedBlock);

        if (socket) {
          socket.emit("block-update", updatedBlock);
        }
      } catch (error) {
        console.error("블록 업데이트 실패:", error);
      }
    },
    [page.id, socket, updateYBlock]
  );

  const createNewBlock = useCallback(
    async (type: BlockType = "text", afterBlockId?: string) => {
      try {
        const afterBlock = afterBlockId
          ? blocks.find((b) => b.id === afterBlockId)
          : null;
        const position = afterBlock ? afterBlock.position + 1 : blocks.length;

        const tempBlock = createBlock(type, "", position, page.id);
        setBlocks((prev) =>
          insertBlockAtPosition(prev, tempBlock, afterBlockId)
        );
        setSelectedBlockId(tempBlock.id);

        const response = await api.post(`/pages/${page.id}/blocks`, {
          type,
          content: "",
          position,
        });

        const newBlock = response.data.block;

        setBlocks((prev) => updateBlockUtil(prev, tempBlock.id, newBlock));
        setSelectedBlockId(newBlock.id);

        addYBlock(newBlock.id, newBlock, position);

        if (socket) {
          socket.emit("block-create", newBlock);
        }

        return newBlock;
      } catch (error) {
        console.error("블록 생성 실패:", error);
      }
    },
    [page.id, blocks, socket, addYBlock]
  );

  const deleteBlock = useCallback(
    async (blockId: string) => {
      try {
        await api.delete(`/pages/${page.id}/blocks/${blockId}`);

        setBlocks((prev) => removeBlock(prev, blockId));

        deleteYBlock(blockId);

        if (socket) {
          socket.emit("block-delete", blockId);
        }

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

  const handleNewBlock = useCallback(
    (afterBlockId: string) => {
      createNewBlock("text", afterBlockId);
    },
    [createNewBlock]
  );

  const handleShowBlockSelector = useCallback(
    (afterBlockId: string, position: { x: number; y: number }) => {
      setPendingBlockId(afterBlockId);
      setBlockSelectorPosition(position);
      setShowBlockSelector(true);
    },
    []
  );

  const handleBlockSelect = useCallback(
    (type: BlockType) => {
      createNewBlock(type, pendingBlockId || undefined);
      setShowBlockSelector(false);
      setPendingBlockId(null);
    },
    [createNewBlock, pendingBlockId]
  );

  const handleCursorChange = useCallback(
    (blockId: string, position: number) => {
      setUserCursor(blockId, position);
    },
    [setUserCursor]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          handleShowBlockSelector("", {
            x: rect.left,
            y: rect.bottom + 5,
          });
        }
      }

      if (e.key === "Escape") {
        setShowBlockSelector(false);
        setPendingBlockId(null);
      }
    },
    [handleShowBlockSelector]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
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

        <div className="text-sm text-gray-500">
          {blocks.length}개 블록 • 마지막 수정:{" "}
          {new Date(page.updatedAt).toLocaleString()}
        </div>
      </div>

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

      <div className="space-y-1">
        {reorderBlocks(blocks).map(renderBlock)}

        <button
          onClick={() => {
            const lastBlockId = blocks[blocks.length - 1]?.id || "";
            const rect = document
              .querySelector(`[data-block-id="${lastBlockId}"]`)
              ?.getBoundingClientRect();
            handleShowBlockSelector(lastBlockId, {
              x: rect?.left || 0,
              y: (rect?.bottom || 0) + 5,
            });
          }}
          className="w-full py-4 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span>새 블록 추가하려면 클릭하거나 '/'를
          입력하세요
        </button>
      </div>

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
