export interface BaseBlock {
  id: string;
  type: BlockType;
  content: string;
  position: number;
  pageId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TextBlock extends BaseBlock {
  type: "text";
  content: string;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: 1 | 2 | 3;
  content: string;
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  url: string;
  caption?: string;
  content: string; // caption을 content로 사용
}

export interface TableBlock extends BaseBlock {
  type: "table";
  rows: string[][];
  headers: string[];
  content: string; // JSON.stringify된 테이블 데이터
}

export type BlockType = "text" | "heading" | "image" | "table";

export type Block = TextBlock | HeadingBlock | ImageBlock | TableBlock;
