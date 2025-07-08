import { useEffect, useState, useRef, useCallback } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

interface UserCursor {
  userId: string;
  userName: string;
  userAvatar?: string;
  blockId: string;
  position: number;
}

interface UserSelection {
  userId: string;
  userName: string;
  userAvatar?: string;
  blockId: string;
  start: number;
  end: number;
}

interface UseYDocProps {
  pageId: string;
  onBlocksChange?: (blocks: any[]) => void;
  onUsersChange?: (users: any[]) => void;
}

export const useYDoc = ({
  pageId,
  onBlocksChange,
  onUsersChange,
}: UseYDocProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userCursors, setUserCursors] = useState<Map<string, UserCursor>>(
    new Map()
  );
  const [userSelections, setUserSelections] = useState<
    Map<string, UserSelection>
  >(new Map());
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SocketIOProvider | null>(null);
  const blocksMapRef = useRef<Y.Map<any> | null>(null);
  const awarenessRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const lastBlocksRef = useRef<any[]>([]);

  const stableOnBlocksChange = useCallback(onBlocksChange || (() => {}), []);
  const stableOnUsersChange = useCallback(onUsersChange || (() => {}), []);

  const processBlocksUpdate = useCallback(() => {
    if (!blocksMapRef.current) return;

    const blocks = Array.from(blocksMapRef.current.entries()).map(
      ([id, data]) => {
        const blockData = data as Record<string, any>;

        const block: any = {
          id,
          ...blockData,
        };

        if (blockData.metadata) {
          if (blockData.metadata.level !== undefined) {
            block.level = blockData.metadata.level;
          }
          if (blockData.metadata.url !== undefined) {
            block.url = blockData.metadata.url;
          }
          if (blockData.metadata.caption !== undefined) {
            block.caption = blockData.metadata.caption;
          }
          if (blockData.metadata.headers !== undefined) {
            block.headers = blockData.metadata.headers;
          }
          if (blockData.metadata.rows !== undefined) {
            block.rows = blockData.metadata.rows;
          }
        }

        if (block.type === "table" && block.content) {
          try {
            const tableData = JSON.parse(block.content);
            if (tableData.headers) block.headers = tableData.headers;
            if (tableData.rows) block.rows = tableData.rows;
          } catch (error) {
            console.error("테이블 데이터 파싱 오류:", error);
          }
        }

        return block;
      }
    );

    const sortedBlocks = blocks.sort(
      (a: any, b: any) => (a.position || 0) - (b.position || 0)
    );

    const currentBlocksStr = JSON.stringify(
      sortedBlocks.map((b: any) => ({
        id: b.id,
        content: b.content,
        position: b.position,
        level: b.level,
        url: b.url,
        caption: b.caption,
        headers: b.headers,
        rows: b.rows,
        type: b.type,
      }))
    );
    const lastBlocksStr = JSON.stringify(
      lastBlocksRef.current.map((b) => ({
        id: b.id,
        content: b.content,
        position: b.position,
        level: b.level,
        url: b.url,
        caption: b.caption,
        headers: b.headers,
        rows: b.rows,
        type: b.type,
      }))
    );

    if (
      currentBlocksStr !== lastBlocksStr ||
      lastBlocksRef.current.length === 0
    ) {
      lastBlocksRef.current = sortedBlocks;
      stableOnBlocksChange(sortedBlocks);
    }
  }, [stableOnBlocksChange]);

  const initializeYDoc = useCallback(() => {
    if (!pageId || isInitializedRef.current) return;

    if (providerRef.current) {
      providerRef.current.destroy();
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
    }

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const token = localStorage.getItem("token");
    const wsUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

    const provider = new SocketIOProvider(wsUrl, `page-${pageId}`, ydoc, {
      auth: { token },
      autoConnect: true,
    });
    providerRef.current = provider;

    const blocksMap = ydoc.getMap("blocks");
    blocksMapRef.current = blocksMap;

    awarenessRef.current = provider.awareness;
    isInitializedRef.current = true;

    provider.on("status", (event: { status: string }) => {
      setIsConnected(event.status === "connected");

      if (event.status === "connected") {
        setTimeout(() => {
          processBlocksUpdate();
        }, 100);
      }
    });

    provider.on("connect", () => {
      processBlocksUpdate();
    });

    provider.on("sync", () => {
      processBlocksUpdate();
    });

    const handleBlocksChange = () => {
      processBlocksUpdate();
    };

    blocksMap.observe(handleBlocksChange);

    ydoc.on("update", () => {
      setTimeout(processBlocksUpdate, 10);
    });

    awarenessRef.current.on("change", () => {
      const states = awarenessRef.current.getStates();
      const cursors = new Map<string, UserCursor>();
      const selections = new Map<string, UserSelection>();
      const users: any[] = [];

      states.forEach((state: any, clientId: number) => {
        if (state.user && clientId !== ydoc.clientID) {
          users.push(state.user);

          if (state.cursor) {
            cursors.set(state.user.userId, {
              ...state.user,
              ...state.cursor,
            });
          }

          if (state.selection) {
            selections.set(state.user.userId, {
              ...state.user,
              ...state.selection,
            });
          }
        }
      });

      setUserCursors(cursors);
      setUserSelections(selections);
      setOnlineUsers(users);
      stableOnUsersChange(users);
    });

    setTimeout(() => {
      processBlocksUpdate();
    }, 200);

    return () => {
      blocksMap.unobserve(handleBlocksChange);
      provider.destroy();
      ydoc.destroy();
      isInitializedRef.current = false;
      lastBlocksRef.current = [];
    };
  }, [pageId, processBlocksUpdate, stableOnUsersChange]);

  useEffect(() => {
    const cleanup = initializeYDoc();
    return cleanup;
  }, [initializeYDoc]);

  const updateBlock = useCallback(
    (blockId: string, content: any) => {
      if (!blocksMapRef.current || !ydocRef.current) return;

      ydocRef.current.transact(() => {
        const existingBlock = blocksMapRef.current!.get(blockId) || {};
        const updatedBlock = {
          ...existingBlock,
          ...content,
          id: blockId,
          updatedAt: new Date().toISOString(),
        };

        if (content.level !== undefined) {
          updatedBlock.level = content.level;
          updatedBlock.metadata = {
            ...updatedBlock.metadata,
            level: content.level,
          };
        }

        if (content.url !== undefined) {
          updatedBlock.url = content.url;
          updatedBlock.metadata = {
            ...updatedBlock.metadata,
            url: content.url,
          };
        }

        if (content.caption !== undefined) {
          updatedBlock.caption = content.caption;
          updatedBlock.metadata = {
            ...updatedBlock.metadata,
            caption: content.caption,
          };
        }

        if (content.headers !== undefined) {
          updatedBlock.headers = content.headers;
          updatedBlock.metadata = {
            ...updatedBlock.metadata,
            headers: content.headers,
          };
        }

        if (content.rows !== undefined) {
          updatedBlock.rows = content.rows;
          updatedBlock.metadata = {
            ...updatedBlock.metadata,
            rows: content.rows,
          };
        }

        blocksMapRef.current!.set(blockId, updatedBlock);
      });

      setTimeout(() => {
        processBlocksUpdate();
      }, 10);
    },
    [processBlocksUpdate]
  );

  const deleteBlock = useCallback(
    (blockId: string) => {
      if (!blocksMapRef.current || !ydocRef.current) return;

      ydocRef.current.transact(() => {
        blocksMapRef.current!.delete(blockId);
      });

      setTimeout(() => {
        processBlocksUpdate();
      }, 10);
    },
    [processBlocksUpdate]
  );

  const addBlock = useCallback(
    (blockId: string, content: any, position: number) => {
      if (!blocksMapRef.current || !ydocRef.current) return;

      ydocRef.current.transact(() => {
        const newBlock = {
          ...content,
          id: blockId,
          position,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (content.level !== undefined) {
          newBlock.level = content.level;
          newBlock.metadata = {
            ...newBlock.metadata,
            level: content.level,
          };
        }

        if (content.headers !== undefined && content.rows !== undefined) {
          newBlock.headers = content.headers;
          newBlock.rows = content.rows;
          newBlock.metadata = {
            ...newBlock.metadata,
            headers: content.headers,
            rows: content.rows,
          };
        }

        blocksMapRef.current!.set(blockId, newBlock);
      });

      setTimeout(() => {
        processBlocksUpdate();
      }, 10);
    },
    [processBlocksUpdate]
  );

  const setUserInfo = useCallback((userInfo: any) => {
    if (!awarenessRef.current) return;

    awarenessRef.current.setLocalStateField("user", userInfo);
  }, []);

  const setCursor = useCallback((blockId: string, position: number) => {
    if (!awarenessRef.current) return;

    awarenessRef.current.setLocalStateField("cursor", {
      blockId,
      position,
    });
  }, []);

  const setSelection = useCallback(
    (blockId: string, start: number, end: number) => {
      if (!awarenessRef.current) return;

      awarenessRef.current.setLocalStateField("selection", {
        blockId,
        start,
        end,
      });
    },
    []
  );

  const clearCursor = useCallback(() => {
    if (!awarenessRef.current) return;
    awarenessRef.current.setLocalStateField("cursor", null);
  }, []);

  const clearSelection = useCallback(() => {
    if (!awarenessRef.current) return;
    awarenessRef.current.setLocalStateField("selection", null);
  }, []);

  const getBlockText = useCallback((blockId: string): Y.Text | null => {
    if (!ydocRef.current) return null;
    return ydocRef.current.getText(`block-${blockId}`);
  }, []);

  const createBlockText = useCallback(
    (blockId: string, initialText: string = ""): Y.Text => {
      if (!ydocRef.current) throw new Error("YDoc not initialized");

      const ytext = ydocRef.current.getText(`block-${blockId}`);
      if (ytext.length === 0 && initialText) {
        ytext.insert(0, initialText);
      }

      ytext.observe(() => {
        const content = ytext.toString();
        updateBlock(blockId, { content });
      });

      return ytext;
    },
    [updateBlock]
  );

  const deleteBlockText = useCallback((blockId: string) => {
    if (!ydocRef.current) return;

    const ytext = ydocRef.current.getText(`block-${blockId}`);
    ytext.delete(0, ytext.length);
  }, []);

  return {
    isConnected,
    userCursors,
    userSelections,
    onlineUsers,
    updateBlock,
    deleteBlock,
    addBlock,
    setUserInfo,
    setCursor,
    setSelection,
    clearCursor,
    clearSelection,
    getBlockText,
    createBlockText,
    deleteBlockText,
    ydoc: ydocRef.current,
    provider: providerRef.current,
  };
};
