import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/auth";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    // 이메일 중복 체크
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "이미 존재하는 이메일입니다." });
      return;
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 12);

    // 사용자 생성
    const user = new User({
      email,
      password: hashedPassword,
      name,
    });

    await user.save();

    // JWT 토큰 생성
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign({ userId: user._id }, jwtSecret, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "회원가입이 완료되었습니다.",
      user,
      token,
    });
  } catch (error) {
    console.error("회원가입 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 사용자 찾기
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
      return;
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
      return;
    }

    // JWT 토큰 생성
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    const token = jwt.sign({ userId: user._id }, jwtSecret, {
      expiresIn: "7d",
    });

    // 비밀번호 제거 후 응답
    const userResponse = user.toJSON();

    res.json({
      message: "로그인 성공",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("로그인 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({
      user: req.user,
    });
  } catch (error) {
    console.error("사용자 정보 조회 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};
