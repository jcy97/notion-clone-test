import { Request, Response } from "express";
import { Page } from "../models/Page";
import { Block } from "../models/Block";

export const getSharedPage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { shareId } = req.params;

    const shareUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/shared/${shareId}`;

    const page = await Page.findOne({
      shareUrl,
      isPublic: true,
    });

    if (!page) {
      res.status(404).json({ 
        message: "페이지를 찾을 수 없거나 공유가 중단되었습니다." 
      });
      return;
    }

    const blocks = await Block.find({ pageId: page._id }).sort({ position: 1 });

    const pageWithBlocks = {
      ...page.toJSON(),
      blocks,
    };

    res.json({ page: pageWithBlocks });
  } catch (error) {
    console.error("공유 페이지 조회 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const getPageByShareUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { shareUrl } = req.body;

    if (!shareUrl) {
      res.status(400).json({ message: "공유 URL이 필요합니다." });
      return;
    }

    const page = await Page.findOne({
      shareUrl,
      isPublic: true,
    });

    if (!page) {
      res.status(404).json({ 
        message: "페이지를 찾을 수 없거나 공유가 중단되었습니다." 
      });
      return;
    }

    const blocks = await Block.find({ pageId: page._id }).sort({ position: 1 });

    const pageWithBlocks = {
      ...page.toJSON(),
      blocks,
    };

    res.json({ page: pageWithBlocks });
  } catch (error) {
    console.error("공유 페이지 조회 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};