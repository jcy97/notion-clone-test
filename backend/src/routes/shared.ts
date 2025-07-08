import { Router } from "express";
import {
  getSharedPage,
  getPageByShareUrl,
  updateSharedPage,
  createSharedBlock,
  updateSharedBlock,
  deleteSharedBlock,
} from "../controllers/sharedController";

const router = Router();

router.get("/:shareId", getSharedPage);
router.post("/lookup", getPageByShareUrl);

// SharedPage 편집 라우트 (인증 불필요)
router.put("/:pageId", updateSharedPage);
router.post("/:pageId/blocks", createSharedBlock);
router.put("/:pageId/blocks/:blockId", updateSharedBlock);
router.delete("/:pageId/blocks/:blockId", deleteSharedBlock);

export default router;
