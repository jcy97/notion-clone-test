import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { connectDatabase } from "./utils/database";
import { setupCollaborationSocket } from "./sockets/collaborationSocket";
import { YSocketIO } from "y-socket.io/dist/server";

// 라우트 임포트
import authRoutes from "./routes/auth";
import pageRoutes from "./routes/pages";
// 환경변수 로드
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

const ysocketio = new YSocketIO(io);
ysocketio.initialize();

const PORT = process.env.PORT || 3001;

// 미들웨어 설정
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 기본 라우트
app.get("/", (req, res) => {
  res.json({
    message: "Notion Clone API Server",
    version: "1.0.0",
    status: "running",
  });
});

// API 라우트
app.use("/auth", authRoutes);
app.use("/pages", pageRoutes);

// 404 에러 핸들러
app.use((req, res) => {
  res.status(404).json({
    message: "요청하신 경로를 찾을 수 없습니다.",
    path: req.originalUrl,
  });
});

// 글로벌 에러 핸들러
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

// 소켓 설정
setupCollaborationSocket(io);

// 서버 시작
const startServer = async () => {
  try {
    // 데이터베이스 연결
    await connectDatabase();

    // 서버 시작
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

// 프로세스 종료 핸들링
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
