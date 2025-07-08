import React, { useState, useEffect, useCallback, useRef } from "react";
import { Block, BlockType } from "../../types/block.types";
import { Page } from "../../types/page.types";
import { TextBlock } from "../blocks/TextBlock";
import { HeadingBlock } from "../blocks/HeadingBlock";
import { ImageBlock } from "../blocks/ImageBlock";
import { TableBlock } from "../blocks/TableBlock";
import { BlockSelector } from "./BlockSelector";
import { OnlineUsers, CollaborationStatus } from "../collaboration";
import { useYDoc } from "../../hooks/useYDoc";
import { useCollaboration } from "../../hooks/useCollaboration";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../utils/api";
import {
  createBlock,
  reorderBlocks,
  insertBlockAtPosition,
  removeBlock,
  updateBlock as updateBlockUtil,
} from "../../utils/blockUtils";

interface Props {
  page: Page;
  onPageUpdate: (page: Page) => void;
  isSharedPage?: boolean;
}

export const Editor: React.FC<Props> = ({
  page,
  onPageUpdate,
  isSharedPage = false,
}) => {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>(page.blocks || []);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [blockSelectorPosition, setBlockSelectorPosition] = useState({
    x: 0,
    y: 0,
  });
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState(page.title);

  const isUpdatingFromYjs = useRef(false);
  const isLocalUpdate = useRef(false);

  const getApiEndpoint = useCallback(
    (endpoint: string) => {
      if (isSharedPage) {
        return endpoint.replace(`/pages/${page.id}`, `/shared/${page.id}`);
      }
      return endpoint;
    },
    [isSharedPage, page.id]
  );

  const {
    isConnected: yIsConnected,
    userCursors: yCursors,
    userSelections: ySelections,
    onlineUsers: yUsers,
    setUserInfo,
    setCursor,
    setSelection,
    getBlockText,
    createBlockText,
    deleteBlockText,
    updateBlock: updateYjsBlock,
    addBlock: addYjsBlock,
    deleteBlock: deleteYjsBlock,
  } = useYDoc({
    pageId: page.id,
    onBlocksChange: useCallback((yBlocks: any) => {
      console.log("YJS blocks change received:", yBlocks);

      if (yBlocks && yBlocks.length >= 0 && !isLocalUpdate.current) {
        isUpdatingFromYjs.current = true;

        const sortedBlocks = yBlocks.sort(
          (a: any, b: any) => (a.position || 0) - (b.position || 0)
        );

        console.log("Setting blocks from YJS:", sortedBlocks);
        setBlocks(sortedBlocks);

        setTimeout(() => {
          isUpdatingFromYjs.current = false;
        }, 50);
      }
    }, []),
    onUsersChange: useCallback((users: any) => {
      console.log("YJS users change:", users);
    }, []),
  });

  const {
    isConnected: socketConnected,
    onlineUsers: socketUsers,
    userCursors: socketCursors,
    userSelections: socketSelections,
    typingUsers,
    emitCursorMove,
    emitSelectionChange,
    emitTypingStart,
    emitTypingStop,
  } = useCollaboration(page.id);

  const isConnected = yIsConnected && socketConnected;
  const onlineUsers = socketUsers.length > 0 ? socketUsers : yUsers;
  const userCursors = socketCursors.size > 0 ? socketCursors : yCursors;
  const userSelections =
    socketSelections.size > 0 ? socketSelections : ySelections;

  useEffect(() => {
    if (user && setUserInfo) {
      setUserInfo({
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
      });
    }
  }, [user, setUserInfo]);

  useEffect(() => {
    if (!isUpdatingFromYjs.current && !isLocalUpdate.current) {
      const sortedBlocks = reorderBlocks(page.blocks || []);
      setBlocks(sortedBlocks);

      // YJS에 초기 블록들 동기화
      sortedBlocks.forEach((block) => {
        if (updateYjsBlock) {
          updateYjsBlock(block.id, block);
        }
      });
    }
    setPageTitle(page.title);
  }, [page, updateYjsBlock]);

  const handleYTextChange = useCallback(
    (blockId: string, content: string) => {
      if (isUpdatingFromYjs.current) return;

      console.log("YText changed:", blockId, content);

      // 즉시 로컬 상태 업데이트
      setBlocks((prev) =>
        updateBlockUtil(prev, blockId, {
          content,
          updatedAt: new Date(),
        })
      );

      // YJS 블록 Map에도 업데이트
      if (updateYjsBlock) {
        updateYjsBlock(blockId, {
          content,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [updateYjsBlock]
  );

  useEffect(() => {
    const createFirstBlock = async () => {
      if (blocks && blocks.length === 0) {
        try {
          const endpoint = getApiEndpoint(`/pages/${page.id}/blocks`);
          const response = await api.post(endpoint, {
            type: "text",
            content: "",
            position: 0,
          });

          const newBlock = response.data.block;

          if (createBlockText) {
            createBlockText(newBlock.id, "");
          }

          if (addYjsBlock) {
            addYjsBlock(newBlock.id, newBlock, 0);
          }

          setBlocks([newBlock]);
          setSelectedBlockId(newBlock.id);
        } catch (error) {
          console.error("첫 블록 생성 실패:", error);
        }
      }
    };

    createFirstBlock();
  }, [blocks?.length, page.id, createBlockText, addYjsBlock, getApiEndpoint]);

  const handleTitleUpdate = useCallback(
    async (newTitle: string) => {
      setPageTitle(newTitle);

      try {
        const endpoint = getApiEndpoint(`/pages/${page.id}`);
        await api.put(endpoint, { title: newTitle });
        onPageUpdate({ ...page, title: newTitle });
      } catch (error) {
        console.error("제목 업데이트 실패:", error);
      }
    },
    [page, onPageUpdate, getApiEndpoint]
  );

  const updateBlock = useCallback(
    async (blockId: string, content: string, extra?: any) => {
      if (isUpdatingFromYjs.current) return;

      isLocalUpdate.current = true;

      try {
        const updateData = { content, ...extra };

        // 즉시 로컬 상태 업데이트
        setBlocks((prev) =>
          updateBlockUtil(prev, blockId, {
            ...updateData,
            updatedAt: new Date(),
          })
        );

        // YJS 업데이트
        if (updateYjsBlock) {
          updateYjsBlock(blockId, {
            content,
            ...extra,
            updatedAt: new Date().toISOString(),
          });
        }

        // API 호출
        const endpoint = getApiEndpoint(`/pages/${page.id}/blocks/${blockId}`);
        await api.put(endpoint, updateData);
      } catch (error) {
        console.error("블록 업데이트 실패:", error);

        setBlocks((prev) =>
          updateBlockUtil(prev, blockId, {
            content: prev.find((b) => b.id === blockId)?.content || "",
            updatedAt: new Date(),
          })
        );
      } finally {
        setTimeout(() => {
          isLocalUpdate.current = false;
        }, 50);
      }
    },
    [page.id, updateYjsBlock, getApiEndpoint]
  );

  const createNewBlock = useCallback(
    async (type: BlockType = "text", afterBlockId?: string) => {
      try {
        const afterBlock = afterBlockId
          ? blocks.find((b) => b.id === afterBlockId)
          : null;
        const position = afterBlock ? afterBlock.position + 1 : blocks.length;

        const endpoint = getApiEndpoint(`/pages/${page.id}/blocks`);
        const response = await api.post(endpoint, {
          type,
          content: "",
          position,
        });

        const newBlock = response.data.block;

        isLocalUpdate.current = true;

        setBlocks((prev) =>
          insertBlockAtPosition(prev, newBlock, afterBlockId)
        );
        setSelectedBlockId(newBlock.id);

        if (type === "text" && createBlockText) {
          createBlockText(newBlock.id, "");
        }

        if (addYjsBlock) {
          addYjsBlock(newBlock.id, newBlock, position);
        }

        setTimeout(() => {
          isLocalUpdate.current = false;
        }, 50);

        return newBlock;
      } catch (error) {
        console.error("블록 생성 실패:", error);
      }
    },
    [page.id, blocks, createBlockText, addYjsBlock, getApiEndpoint]
  );

  const deleteBlock = useCallback(
    async (blockId: string) => {
      try {
        const endpoint = getApiEndpoint(`/pages/${page.id}/blocks/${blockId}`);
        await api.delete(endpoint);

        isLocalUpdate.current = true;

        setBlocks((prev) => removeBlock(prev, blockId));

        if (deleteBlockText) {
          deleteBlockText(blockId);
        }

        if (deleteYjsBlock) {
          deleteYjsBlock(blockId);
        }

        const blockIndex = blocks.findIndex((b) => b.id === blockId);
        if (blockIndex > 0) {
          setSelectedBlockId(blocks[blockIndex - 1].id);
        } else if (blocks.length > 1) {
          setSelectedBlockId(blocks[1]?.id);
        }

        setTimeout(() => {
          isLocalUpdate.current = false;
        }, 50);
      } catch (error) {
        console.error("블록 삭제 실패:", error);
      }
    },
    [page.id, blocks, deleteBlockText, deleteYjsBlock, getApiEndpoint]
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

  const handleCursorMove = useCallback(
    (blockId: string, position: number) => {
      if (setCursor) {
        setCursor(blockId, position);
      }
      emitCursorMove(blockId, position);
    },
    [setCursor, emitCursorMove]
  );

  const handleSelectionChange = useCallback(
    (blockId: string, start: number, end: number) => {
      if (setSelection) {
        setSelection(blockId, start, end);
      }
      emitSelectionChange(blockId, start, end);
    },
    [setSelection, emitSelectionChange]
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

    const collaborationProps = {
      onCursorMove: handleCursorMove,
      onSelectionChange: handleSelectionChange,
      onTypingStart: emitTypingStart,
      onTypingStop: emitTypingStop,
      userCursors,
      typingUsers,
    };

    switch (block.type) {
      case "text":
        return (
          <div data-block-id={block.id}>
            <TextBlock
              {...baseProps}
              {...collaborationProps}
              block={block}
              onUpdate={updateBlock}
              onNewBlock={handleNewBlock}
              onYTextChange={handleYTextChange}
              ytext={
                getBlockText ? getBlockText(block.id) || undefined : undefined
              }
            />
          </div>
        );
      case "heading":
        return (
          <div data-block-id={block.id}>
            <HeadingBlock
              {...baseProps}
              {...collaborationProps}
              block={block}
              onUpdate={(id, content, level) =>
                updateBlock(id, content, { level })
              }
              onNewBlock={handleNewBlock}
              onYTextChange={handleYTextChange}
              ytext={
                getBlockText ? getBlockText(block.id) || undefined : undefined
              }
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
        <CollaborationStatus
          isConnected={isConnected}
          onlineCount={onlineUsers.length + 1}
        />

        <div className="flex items-center gap-4">
          <OnlineUsers users={onlineUsers} currentUserId={user?.id} />
          <div className="text-sm text-gray-500">
            {blocks.length}개 블록 • 마지막 수정:{" "}
            {new Date(page.updatedAt).toLocaleString()}
          </div>
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
          <div>YJS 연결: {yIsConnected ? "연결됨" : "연결 안됨"}</div>
          <div>Socket 연결: {socketConnected ? "연결됨" : "연결 안됨"}</div>
          <div>온라인 사용자: {onlineUsers.length}명</div>
          <div>활성 커서: {userCursors.size}개</div>
          <div>입력 중: {typingUsers.size}명</div>
          <div>
            YJS 업데이트 중: {isUpdatingFromYjs.current ? "예" : "아니오"}
          </div>
          <div>로컬 업데이트 중: {isLocalUpdate.current ? "예" : "아니오"}</div>
          <div>공유 페이지: {isSharedPage ? "예" : "아니오"}</div>
        </div>
      )}
    </div>
  );
};
