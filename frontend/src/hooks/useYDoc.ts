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
  const lastBlocksHashRef = useRef<string>("");

  const stableOnBlocksChange = useCallback(onBlocksChange || (() => {}), []);
  const stableOnUsersChange = useCallback(onUsersChange || (() => {}), []);

  const initializeYDoc = useCallback(() => {
    if (!pageId) return;

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

    provider.on("status", (event: { status: string }) => {
      setIsConnected(event.status === "connected");
    });

    const handleBlocksChange = () => {
      const blocks = Array.from(blocksMap.entries()).map(([id, data]) => ({
        id,
        ...(data as Record<string, any>),
      }));

      console.log("YJS handleBlocksChange:", blocks);

      if (blocks.length === 0) {
        console.log("YJS blocks empty, not triggering change");
        return;
      }

      const blocksHash = JSON.stringify(
        blocks.map((b: any) => ({
          id: b.id,
          content: b.content || "",
          position: b.position || 0,
        }))
      );

      if (blocksHash !== lastBlocksHashRef.current) {
        lastBlocksHashRef.current = blocksHash;
        console.log(
          "YJS triggering onBlocksChange with",
          blocks.length,
          "blocks"
        );
        stableOnBlocksChange(blocks);
      }
    };

    blocksMap.observe(handleBlocksChange);

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

    return () => {
      blocksMap.unobserve(handleBlocksChange);
      provider.destroy();
      ydoc.destroy();
    };
  }, [pageId, stableOnBlocksChange, stableOnUsersChange]);

  useEffect(() => {
    const cleanup = initializeYDoc();
    return cleanup;
  }, [initializeYDoc]);

  const updateBlock = useCallback((blockId: string, content: any) => {
    if (!blocksMapRef.current) return;

    ydocRef.current?.transact(() => {
      const existingBlock = blocksMapRef.current!.get(blockId);
      blocksMapRef.current!.set(blockId, {
        ...existingBlock,
        ...content,
        id: blockId,
        updatedAt: new Date().toISOString(),
      });
    });
  }, []);

  const deleteBlock = useCallback((blockId: string) => {
    if (!blocksMapRef.current) return;

    ydocRef.current?.transact(() => {
      blocksMapRef.current!.delete(blockId);
    });
  }, []);

  const addBlock = useCallback(
    (blockId: string, content: any, position: number) => {
      if (!blocksMapRef.current) return;

      ydocRef.current?.transact(() => {
        blocksMapRef.current!.set(blockId, {
          ...content,
          id: blockId,
          position,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    },
    []
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
      return ytext;
    },
    []
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
