import { Router } from "express";
import {
  getSharedPage,
  getPageByShareUrl,
} from "../controllers/sharedController";

const router = Router();

router.get("/:shareId", getSharedPage);
router.post("/lookup", getPageByShareUrl);

export default router;
