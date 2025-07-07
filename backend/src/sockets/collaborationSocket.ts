import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Page } from "../models/Page";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

export const setupCollaborationSocket = (io: Server) => {
  // 소켓 인증 미들웨어
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

      socket.userId = user._id!.toString();
      socket.userName = user.name;
      next();
    } catch (error) {
      next(new Error("인증에 실패했습니다."));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`사용자 연결: ${socket.userName} (${socket.userId})`);

    // 페이지 입장
    socket.on("join-page", async (pageId: string) => {
      try {
        // 페이지 접근 권한 확인
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

        // 다른 사용자들에게 새 사용자 입장 알림
        socket.to(pageId).emit("user-joined", {
          userId: socket.userId,
          userName: socket.userName,
        });

        console.log(`${socket.userName}이 페이지 ${pageId}에 입장했습니다.`);
      } catch (error) {
        console.error("페이지 입장 오류:", error);
        socket.emit("error", { message: "페이지 입장에 실패했습니다." });
      }
    });

    // 페이지 퇴장
    socket.on("leave-page", (pageId: string) => {
      socket.leave(pageId);
      socket.to(pageId).emit("user-left", {
        userId: socket.userId,
        userName: socket.userName,
      });
      console.log(`${socket.userName}이 페이지 ${pageId}에서 퇴장했습니다.`);
    });

    // 블록 업데이트 브로드캐스트
    socket.on("block-update", (blockData: any) => {
      socket.broadcast.emit("block-updated", blockData);
    });

    // 블록 생성 브로드캐스트
    socket.on("block-create", (blockData: any) => {
      socket.broadcast.emit("block-created", blockData);
    });

    // 블록 삭제 브로드캐스트
    socket.on("block-delete", (blockId: string) => {
      socket.broadcast.emit("block-deleted", blockId);
    });

    // 실시간 타이핑 상태
    socket.on("typing-start", (data: { pageId: string; blockId: string }) => {
      socket.to(data.pageId).emit("user-typing", {
        userId: socket.userId,
        userName: socket.userName,
        blockId: data.blockId,
      });
    });

    socket.on("typing-stop", (data: { pageId: string; blockId: string }) => {
      socket.to(data.pageId).emit("user-stopped-typing", {
        userId: socket.userId,
        blockId: data.blockId,
      });
    });

    // 커서 위치 공유
    socket.on(
      "cursor-position",
      (data: { pageId: string; blockId: string; position: number }) => {
        socket.to(data.pageId).emit("user-cursor", {
          userId: socket.userId,
          userName: socket.userName,
          blockId: data.blockId,
          position: data.position,
        });
      }
    );

    // 연결 해제
    socket.on("disconnect", () => {
      console.log(`사용자 연결 해제: ${socket.userName} (${socket.userId})`);
    });

    // 에러 처리
    socket.on("error", (error) => {
      console.error("소켓 에러:", error);
    });
  });
};
