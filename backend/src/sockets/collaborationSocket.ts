import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Page } from "../models/Page";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  userAvatar?: string;
}

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

const pageUsers = new Map<string, Map<string, UserInfo>>();
const userPages = new Map<string, Set<string>>();

export const setupCollaborationSocket = (io: Server) => {
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("인증 토큰이 필요합니다."));
      }

      const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
      const decoded = jwt.verify(token, jwtSecret) as { userId: string };

      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error("유효하지 않은 토큰입니다."));
      }

      socket.userId = user.id;
      socket.userName = user.name;
      socket.userAvatar = user.avatar;
      next();
    } catch (error) {
      next(new Error("인증에 실패했습니다."));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`사용자 연결: ${socket.userName} (${socket.userId})`);

    socket.on("join-page", async (pageId: string) => {
      try {
        const page = await Page.findOne({
          _id: pageId,
          $or: [
            { ownerId: socket.userId },
            { collaborators: socket.userId },
            { isPublic: true },
          ],
        });

        if (!page) {
          socket.emit("error", { message: "페이지에 접근할 권한이 없습니다." });
          return;
        }

        socket.join(pageId);

        if (!pageUsers.has(pageId)) {
          pageUsers.set(pageId, new Map());
        }

        if (!userPages.has(socket.userId!)) {
          userPages.set(socket.userId!, new Set());
        }

        const userInfo: UserInfo = {
          userId: socket.userId!,
          userName: socket.userName!,
          userAvatar: socket.userAvatar,
          lastSeen: Date.now(),
        };

        pageUsers.get(pageId)!.set(socket.userId!, userInfo);
        userPages.get(socket.userId!)!.add(pageId);

        const onlineUsers = Array.from(pageUsers.get(pageId)!.values());

        socket.to(pageId).emit("user-joined", userInfo);
        socket.emit("page-users", onlineUsers);
        socket.to(pageId).emit("user-list-updated", onlineUsers);

        console.log(`${socket.userName}이 페이지 ${pageId}에 입장했습니다.`);
      } catch (error) {
        console.error("페이지 입장 오류:", error);
        socket.emit("error", { message: "페이지 입장에 실패했습니다." });
      }
    });

    socket.on("leave-page", (pageId: string) => {
      leavePageInternal(socket, pageId);
    });

    socket.on(
      "cursor-move",
      (data: { pageId: string; blockId: string; position: number }) => {
        if (!pageUsers.has(data.pageId)) return;

        const userInfo = pageUsers.get(data.pageId)!.get(socket.userId!);
        if (userInfo) {
          userInfo.cursor = {
            blockId: data.blockId,
            position: data.position,
          };
          userInfo.lastSeen = Date.now();

          socket.to(data.pageId).emit("user-cursor-moved", {
            userId: socket.userId,
            userName: socket.userName,
            userAvatar: socket.userAvatar,
            cursor: userInfo.cursor,
          });
        }
      }
    );

    socket.on(
      "selection-change",
      (data: {
        pageId: string;
        blockId: string;
        start: number;
        end: number;
      }) => {
        if (!pageUsers.has(data.pageId)) return;

        const userInfo = pageUsers.get(data.pageId)!.get(socket.userId!);
        if (userInfo) {
          userInfo.selection = {
            blockId: data.blockId,
            start: data.start,
            end: data.end,
          };
          userInfo.lastSeen = Date.now();

          socket.to(data.pageId).emit("user-selection-changed", {
            userId: socket.userId,
            userName: socket.userName,
            userAvatar: socket.userAvatar,
            selection: userInfo.selection,
          });
        }
      }
    );

    socket.on("typing-start", (data: { pageId: string; blockId: string }) => {
      socket.to(data.pageId).emit("user-typing-start", {
        userId: socket.userId,
        userName: socket.userName,
        blockId: data.blockId,
      });
    });

    socket.on("typing-stop", (data: { pageId: string; blockId: string }) => {
      socket.to(data.pageId).emit("user-typing-stop", {
        userId: socket.userId,
        blockId: data.blockId,
      });
    });

    socket.on("get-page-users", (pageId: string) => {
      if (pageUsers.has(pageId)) {
        const users = Array.from(pageUsers.get(pageId)!.values());
        socket.emit("page-users", users);
      }
    });

    socket.on("disconnect", () => {
      handleUserDisconnect(socket);
      console.log(`사용자 연결 해제: ${socket.userName} (${socket.userId})`);
    });

    socket.on("error", (error) => {
      console.error("소켓 에러:", error);
    });
  });

  const leavePageInternal = (socket: AuthenticatedSocket, pageId: string) => {
    socket.leave(pageId);

    if (pageUsers.has(pageId)) {
      pageUsers.get(pageId)!.delete(socket.userId!);

      if (pageUsers.get(pageId)!.size === 0) {
        pageUsers.delete(pageId);
      } else {
        const onlineUsers = Array.from(pageUsers.get(pageId)!.values());
        socket.to(pageId).emit("user-list-updated", onlineUsers);
      }
    }

    if (userPages.has(socket.userId!)) {
      userPages.get(socket.userId!)!.delete(pageId);
      if (userPages.get(socket.userId!)!.size === 0) {
        userPages.delete(socket.userId!);
      }
    }

    socket.to(pageId).emit("user-left", {
      userId: socket.userId,
      userName: socket.userName,
    });

    console.log(`${socket.userName}이 페이지 ${pageId}에서 퇴장했습니다.`);
  };

  const handleUserDisconnect = (socket: AuthenticatedSocket) => {
    if (!socket.userId) return;

    const userPageSet = userPages.get(socket.userId);
    if (userPageSet) {
      userPageSet.forEach((pageId) => {
        leavePageInternal(socket, pageId);
      });
    }
  };

  setInterval(() => {
    const now = Date.now();
    const timeout = 30000;

    pageUsers.forEach((users, pageId) => {
      const disconnectedUsers: string[] = [];

      users.forEach((userInfo, userId) => {
        if (now - userInfo.lastSeen > timeout) {
          disconnectedUsers.push(userId);
        }
      });

      disconnectedUsers.forEach((userId) => {
        users.delete(userId);
        io.to(pageId).emit("user-left", { userId });
      });

      if (users.size === 0) {
        pageUsers.delete(pageId);
      } else if (disconnectedUsers.length > 0) {
        const onlineUsers = Array.from(users.values());
        io.to(pageId).emit("user-list-updated", onlineUsers);
      }
    });
  }, 10000);
};
