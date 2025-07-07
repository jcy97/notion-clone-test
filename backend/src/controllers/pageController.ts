import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { Page } from "../models/Page";
import { Block } from "../models/Block";
import { AuthRequest } from "../middleware/auth";

export const getPages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!._id;

    const pages = await Page.find({
      $or: [{ ownerId: userId }, { collaborators: userId }],
    }).sort({ updatedAt: -1 });

    res.json({ pages });
  } catch (error) {
    console.error("페이지 목록 조회 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const getPage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { pageId } = req.params;
    const userId = req.user!._id;

    const page = await Page.findOne({
      _id: pageId,
      $or: [{ ownerId: userId }, { collaborators: userId }, { isPublic: true }],
    });

    if (!page) {
      res.status(404).json({ message: "페이지를 찾을 수 없습니다." });
      return;
    }

    // 페이지의 블록들 가져오기
    const blocks = await Block.find({ pageId }).sort({ position: 1 });

    const pageWithBlocks = {
      ...page.toJSON(),
      blocks,
    };

    res.json({ page: pageWithBlocks });
  } catch (error) {
    console.error("페이지 조회 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const createPage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, isPublic } = req.body;
    const userId = req.user!._id;

    const page = new Page({
      title: title || "새 페이지",
      ownerId: userId,
      isPublic: isPublic || false,
    });

    await page.save();

    // 기본 텍스트 블록 생성
    const defaultBlock = new Block({
      pageId: page._id,
      type: "text",
      content: "",
      position: 0,
    });

    await defaultBlock.save();

    const pageWithBlocks = {
      ...page.toJSON(),
      blocks: [defaultBlock],
    };

    res.status(201).json({ page: pageWithBlocks });
  } catch (error) {
    console.error("페이지 생성 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const updatePage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { pageId } = req.params;
    const { title, isPublic } = req.body;
    const userId = req.user!._id;

    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        ownerId: userId,
      },
      {
        ...(title && { title }),
        ...(typeof isPublic === "boolean" && { isPublic }),
      },
      { new: true }
    );

    if (!page) {
      res
        .status(404)
        .json({ message: "페이지를 찾을 수 없거나 권한이 없습니다." });
      return;
    }

    res.json({ page });
  } catch (error) {
    console.error("페이지 업데이트 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const deletePage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { pageId } = req.params;
    const userId = req.user!._id;

    const page = await Page.findOneAndDelete({
      _id: pageId,
      ownerId: userId,
    });

    if (!page) {
      res
        .status(404)
        .json({ message: "페이지를 찾을 수 없거나 권한이 없습니다." });
      return;
    }

    // 관련 블록들도 삭제
    await Block.deleteMany({ pageId });

    res.json({ message: "페이지가 삭제되었습니다." });
  } catch (error) {
    console.error("페이지 삭제 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const sharePage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { pageId } = req.params;
    const userId = req.user!._id;

    const page = await Page.findOne({
      _id: pageId,
      ownerId: userId,
    });

    if (!page) {
      res
        .status(404)
        .json({ message: "페이지를 찾을 수 없거나 권한이 없습니다." });
      return;
    }

    // 공유 URL 생성
    const shareUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/shared/${uuidv4()}`;

    page.shareUrl = shareUrl;
    page.isPublic = true;
    await page.save();

    res.json({ shareUrl });
  } catch (error) {
    console.error("페이지 공유 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

// 블록 관련 컨트롤러들
export const createBlock = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { pageId } = req.params;
    const { type, content, position } = req.body;
    const userId = req.user!._id;

    // 페이지 권한 확인
    const page = await Page.findOne({
      _id: pageId,
      $or: [{ ownerId: userId }, { collaborators: userId }],
    });

    if (!page) {
      res
        .status(404)
        .json({ message: "페이지를 찾을 수 없거나 권한이 없습니다." });
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
    console.error("블록 생성 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const updateBlock = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { pageId, blockId } = req.params;
    const { content, level, url, caption, headers, rows } = req.body;
    const userId = req.user!._id;

    // 페이지 권한 확인
    const page = await Page.findOne({
      _id: pageId,
      $or: [{ ownerId: userId }, { collaborators: userId }],
    });

    if (!page) {
      res
        .status(404)
        .json({ message: "페이지를 찾을 수 없거나 권한이 없습니다." });
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
    console.error("블록 업데이트 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};

export const deleteBlock = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { pageId, blockId } = req.params;
    const userId = req.user!._id;

    // 페이지 권한 확인
    const page = await Page.findOne({
      _id: pageId,
      $or: [{ ownerId: userId }, { collaborators: userId }],
    });

    if (!page) {
      res
        .status(404)
        .json({ message: "페이지를 찾을 수 없거나 권한이 없습니다." });
      return;
    }

    const block = await Block.findOneAndDelete({ _id: blockId, pageId });

    if (!block) {
      res.status(404).json({ message: "블록을 찾을 수 없습니다." });
      return;
    }

    res.json({ message: "블록이 삭제되었습니다." });
  } catch (error) {
    console.error("블록 삭제 오류:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
};
