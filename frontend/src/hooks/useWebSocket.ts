import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export const useWebSocket = (pageId: string) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    socketRef.current = io(
      process.env.REACT_APP_API_URL || "http://localhost:3001",
      {
        auth: { token },
        query: { pageId },
      }
    );

    socketRef.current.emit("join-page", pageId);

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave-page", pageId);
        socketRef.current.disconnect();
      }
    };
  }, [pageId]);

  return socketRef.current;
};
