import mongoose from "mongoose";

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/notion-clone";

    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB 연결 성공");
  } catch (error) {
    console.error("❌ MongoDB 연결 실패:", error);
    process.exit(1);
  }
};

mongoose.connection.on("error", (error) => {
  console.error("MongoDB 연결 오류:", error);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB 연결 해제됨");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB 연결 종료됨");
  process.exit(0);
});
