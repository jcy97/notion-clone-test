import { Router } from "express";
import { register, login, getMe } from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import {
  validateRegister,
  validateLogin,
  validateRequest,
} from "../middleware/validation";

const router = Router();

// 회원가입
router.post("/register", validateRegister, validateRequest, register);

// 로그인
router.post("/login", validateLogin, validateRequest, login);

// 현재 사용자 정보 조회
router.get("/me", authenticate, getMe);

export default router;
