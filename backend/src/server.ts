import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { connectDatabase } from "./utils/database";
import { setupCollaborationSocket } from "./sockets/collaborationSocket";
import { YSocketIO } from "y-socket.io/dist/server";

import authRoutes from "./routes/auth";
import pageRoutes from "./routes/pages";
import sharedRoutes from "./routes/shared";

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const ysocketio = new YSocketIO(io, {
  authenticate: async (auth: any): Promise<boolean> => {
    try {
      // 토큰이 없으면 게스트 사용자로 허용 (SharedPage용)
      if (!auth?.token) {
        console.log("YJS: 게스트 사용자 인증 허용");
        return true;
      }

      const jwt = await import("jsonwebtoken");
      const { User } = await import("./models/User");

      const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
      const decoded = jwt.verify(auth.token, jwtSecret) as { userId: string };
      const user = await User.findById(decoded.userId);

      const isAuthenticated = !!user;
      console.log(`YJS: 사용자 인증 ${isAuthenticated ? "성공" : "실패"}`, {
        userId: decoded.userId,
      });
      return isAuthenticated;
    } catch (error: any) {
      console.log("YJS: 인증 실패, 게스트로 허용", error.message);
      // 인증 실패 시에도 게스트로 허용
      return true;
    }
  },
  gcEnabled: true,
});

ysocketio.initialize();

const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({
    message: "Notion Clone API Server",
    version: "1.0.0",
    status: "running",
  });
});

app.use("/auth", authRoutes);
app.use("/pages", pageRoutes);
app.use("/shared", sharedRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "요청하신 경로를 찾을 수 없습니다.",
    path: req.originalUrl,
  });
});

app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("서버 에러:", error);

    res.status(error.status || 500).json({
      message: error.message || "서버 내부 오류가 발생했습니다.",
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }
);

setupCollaborationSocket(io);

const startServer = async () => {
  try {
    await connectDatabase();

    server.listen(PORT, () => {
      console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(
        `📱 프론트엔드 URL: ${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }`
      );
      console.log(`🔗 API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("서버 시작 실패:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => {
  console.log("SIGTERM 신호를 받았습니다. 서버를 종료합니다...");
  server.close(() => {
    console.log("서버가 종료되었습니다.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT 신호를 받았습니다. 서버를 종료합니다...");
  server.close(() => {
    console.log("서버가 종료되었습니다.");
    process.exit(0);
  });
});

startServer();
