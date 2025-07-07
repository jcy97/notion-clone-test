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
  headers: string[];
  rows: string[][];
  content: string; // JSON.stringify된 테이블 데이터
}

export type BlockType = "text" | "heading" | "image" | "table";

export type Block = TextBlock | HeadingBlock | ImageBlock | TableBlock;

// 블록 생성용 타입
export interface CreateBlockData {
  type: BlockType;
  content?: string;
  position?: number;
  pageId?: string;
  // 각 블록 타입별 추가 데이터
  level?: 1 | 2 | 3; // heading용
  url?: string; // image용
  caption?: string; // image용
  headers?: string[]; // table용
  rows?: string[][]; // table용
}
