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
        message: "페이지를 찾을 수 없거나 공유가 중단되었습니다.",
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
        message: "페이지를 찾을 수 없거나 공유가 중단되었습니다.",
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

export const updateSharedPage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { pageId } = req.params;
    const { title, isPublic } = req.body;

    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        isPublic: true,
      },
      {
        ...(title && { title }),
        ...(typeof isPublic === "boolean" && { isPublic }),
      },
      { new: true }
    );

    if (!page) {
      res.status(404).json({ message: "공유 페이지를 찾을 수 없습니다." });
      return;
    }

    res.json({ page });
  } catch (error) {
    console.error("공유 페이지 업데이트 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const createSharedBlock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { pageId } = req.params;
    const { type, content, position } = req.body;

    // 공유 페이지 확인
    const page = await Page.findOne({
      _id: pageId,
      isPublic: true,
    });

    if (!page) {
      res.status(404).json({ message: "공유 페이지를 찾을 수 없습니다." });
      return;
    }

    const block = new Block({
      pageId,
      type,
      content,
      position,
    });

    await block.save();

    res.status(201).json({ block });
  } catch (error) {
    console.error("공유 페이지 블록 생성 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const updateSharedBlock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { pageId, blockId } = req.params;
    const { content, level, url, caption, headers, rows } = req.body;

    // 공유 페이지 확인
    const page = await Page.findOne({
      _id: pageId,
      isPublic: true,
    });

    if (!page) {
      res.status(404).json({ message: "공유 페이지를 찾을 수 없습니다." });
      return;
    }

    const updateData: any = { content };

    // 타입별 메타데이터 처리
    if (level !== undefined) updateData["metadata.level"] = level;
    if (url !== undefined) updateData["metadata.url"] = url;
    if (caption !== undefined) updateData["metadata.caption"] = caption;
    if (headers !== undefined) updateData["metadata.headers"] = headers;
    if (rows !== undefined) updateData["metadata.rows"] = rows;

    const block = await Block.findOneAndUpdate(
      { _id: blockId, pageId },
      updateData,
      { new: true }
    );

    if (!block) {
      res.status(404).json({ message: "블록을 찾을 수 없습니다." });
      return;
    }

    res.json({ block });
  } catch (error) {
    console.error("공유 페이지 블록 업데이트 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const deleteSharedBlock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { pageId, blockId } = req.params;

    // 공유 페이지 확인
    const page = await Page.findOne({
      _id: pageId,
      isPublic: true,
    });

    if (!page) {
      res.status(404).json({ message: "공유 페이지를 찾을 수 없습니다." });
      return;
    }

    const block = await Block.findOneAndDelete({ _id: blockId, pageId });

    if (!block) {
      res.status(404).json({ message: "블록을 찾을 수 없습니다." });
      return;
    }

    res.json({ message: "블록이 삭제되었습니다." });
  } catch (error) {
    console.error("공유 페이지 블록 삭제 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};
