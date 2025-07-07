import { useEffect, useState, useRef, useCallback } from "react";
import { Socket, io } from "socket.io-client";

interface UserInfo {
  userId: string;
  userName: string;
  userAvatar?: string;
  cursor?: {
    blockId: string;
    position: number;
  };
  selection?: {
    blockId: string;
    start: number;
    end: number;
  };
  lastSeen: number;
}

interface UserCursor {
  userId: string;
  userName: string;
  userAvatar?: string;
  cursor: {
    blockId: string;
    position: number;
  };
}

interface UserSelection {
  userId: string;
  userName: string;
  userAvatar?: string;
  selection: {
    blockId: string;
    start: number;
    end: number;
  };
}

interface TypingUser {
  userId: string;
  userName: string;
  blockId: string;
}

export const useCollaboration = (pageId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<UserInfo[]>([]);
  const [userCursors, setUserCursors] = useState<Map<string, UserCursor>>(
    new Map()
  );
  const [userSelections, setUserSelections] = useState<
    Map<string, UserSelection>
  >(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(
    new Map()
  );

  const socketRef = useRef<Socket | null>(null);
  const typingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!pageId) return;

    const token = localStorage.getItem("token");
    const socket = io(
      process.env.REACT_APP_API_URL || "http://localhost:3001",
      {
        auth: { token },
      }
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join-page", pageId);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("page-users", (users: UserInfo[]) => {
      setOnlineUsers(users);
    });

    socket.on("user-list-updated", (users: UserInfo[]) => {
      setOnlineUsers(users);
    });

    socket.on("user-joined", (user: UserInfo) => {
      setOnlineUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== user.userId);
        return [...filtered, user];
      });
    });

    socket.on("user-left", ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== userId));
      setUserCursors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
      setUserSelections((prev) => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    });

    socket.on("user-cursor-moved", (data: UserCursor) => {
      setUserCursors((prev) => new Map(prev.set(data.userId, data)));
    });

    socket.on("user-selection-changed", (data: UserSelection) => {
      setUserSelections((prev) => new Map(prev.set(data.userId, data)));
    });

    socket.on("user-typing-start", (data: TypingUser) => {
      setTypingUsers((prev) => new Map(prev.set(data.userId, data)));

      const timer = typingTimersRef.current.get(data.userId);
      if (timer) clearTimeout(timer);

      const newTimer = setTimeout(() => {
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(data.userId);
          return newMap;
        });
        typingTimersRef.current.delete(data.userId);
      }, 3000);

      typingTimersRef.current.set(data.userId, newTimer);
    });

    socket.on("user-typing-stop", ({ userId }: { userId: string }) => {
      const timer = typingTimersRef.current.get(userId);
      if (timer) {
        clearTimeout(timer);
        typingTimersRef.current.delete(userId);
      }
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    });

    socket.on("error", (error: { message: string }) => {
      console.error("Collaboration error:", error.message);
    });

    return () => {
      socket.emit("leave-page", pageId);
      socket.disconnect();

      typingTimersRef.current.forEach((timer) => clearTimeout(timer));
      typingTimersRef.current.clear();
    };
  }, [pageId]);

  const emitCursorMove = useCallback(
    (blockId: string, position: number) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("cursor-move", {
          pageId,
          blockId,
          position,
        });
      }
    },
    [pageId, isConnected]
  );

  const emitSelectionChange = useCallback(
    (blockId: string, start: number, end: number) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("selection-change", {
          pageId,
          blockId,
          start,
          end,
        });
      }
    },
    [pageId, isConnected]
  );

  const emitTypingStart = useCallback(
    (blockId: string) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("typing-start", {
          pageId,
          blockId,
        });
      }
    },
    [pageId, isConnected]
  );

  const emitTypingStop = useCallback(
    (blockId: string) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("typing-stop", {
          pageId,
          blockId,
        });
      }
    },
    [pageId, isConnected]
  );

  const getUsersInBlock = useCallback(
    (blockId: string) => {
      const typingInBlock = Array.from(typingUsers.values()).filter(
        (user) => user.blockId === blockId
      );
      const cursorsInBlock = Array.from(userCursors.values()).filter(
        (user) => user.cursor.blockId === blockId
      );

      return {
        typing: typingInBlock,
        cursors: cursorsInBlock,
      };
    },
    [typingUsers, userCursors]
  );

  return {
    isConnected,
    onlineUsers,
    userCursors,
    userSelections,
    typingUsers,
    emitCursorMove,
    emitSelectionChange,
    emitTypingStart,
    emitTypingStop,
    getUsersInBlock,
  };
};
