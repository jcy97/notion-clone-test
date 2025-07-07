import { Router } from "express";
import {
  getPages,
  getPage,
  createPage,
  updatePage,
  deletePage,
  sharePage,
  createBlock,
  updateBlock,
  deleteBlock,
} from "../controllers/pageController";
import { authenticate } from "../middleware/auth";
import {
  validatePage,
  validateBlock,
  validateRequest,
} from "../middleware/validation";

const router = Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticate);

// 페이지 관련 라우트
router.get("/", getPages);
router.get("/:pageId", getPage);
router.post("/", validatePage, validateRequest, createPage);
router.put("/:pageId", validatePage, validateRequest, updatePage);
router.delete("/:pageId", deletePage);
router.post("/:pageId/share", sharePage);

// 블록 관련 라우트
router.post("/:pageId/blocks", validateBlock, validateRequest, createBlock);
router.put("/:pageId/blocks/:blockId", updateBlock);
router.delete("/:pageId/blocks/:blockId", deleteBlock);

export default router;
