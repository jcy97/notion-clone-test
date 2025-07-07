import {
  Block,
  BlockType,
  TextBlock,
  HeadingBlock,
  ImageBlock,
  TableBlock,
} from "../types/block.types";

// 타입 가드 함수들
export const isTextBlock = (block: Block): block is TextBlock =>
  block.type === "text";
export const isHeadingBlock = (block: Block): block is HeadingBlock =>
  block.type === "heading";
export const isImageBlock = (block: Block): block is ImageBlock =>
  block.type === "image";
export const isTableBlock = (block: Block): block is TableBlock =>
  block.type === "table";

// Exhaustive check를 위한 함수
const assertNever = (x: never): never => {
  throw new Error(`Unexpected object: ${x}`);
};

// 블록 생성 유틸리티 - 단순화된 버전
export const createBlock = (
  type: BlockType,
  content: string = "",
  position: number = 0,
  pageId: string = ""
): Block => {
  const baseId = `block_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const baseTime = new Date();

  switch (type) {
    case "text":
      return {
        id: baseId,
        type: "text",
        content,
        position,
        pageId,
        createdAt: baseTime,
        updatedAt: baseTime,
      } as TextBlock;

    case "heading":
      return {
        id: baseId,
        type: "heading",
        level: 1,
        content,
        position,
        pageId,
        createdAt: baseTime,
        updatedAt: baseTime,
      } as HeadingBlock;

    case "image":
      return {
        id: baseId,
        type: "image",
        url: "",
        caption: content,
        content,
        position,
        pageId,
        createdAt: baseTime,
        updatedAt: baseTime,
      } as ImageBlock;

    case "table":
      const defaultTableData = {
        headers: ["열1", "열2"],
        rows: [["", ""]],
      };
      return {
        id: baseId,
        type: "table",
        headers: defaultTableData.headers,
        rows: defaultTableData.rows,
        content: JSON.stringify(defaultTableData),
        position,
        pageId,
        createdAt: baseTime,
        updatedAt: baseTime,
      } as TableBlock;

    default:
      throw new Error(`지원하지 않는 블록 타입: ${type}`);
  }
};

// 블록 타입 검증
export const isValidBlockType = (type: string): type is BlockType => {
  return ["text", "heading", "image", "table"].includes(type);
};

// 블록 위치 재정렬
export const reorderBlocks = (blocks: Block[]): Block[] => {
  return blocks
    .sort((a, b) => a.position - b.position)
    .map((block, index) => ({
      ...block,
      position: index,
    }));
};

// 블록 이동 (드래그 앤 드롭용)
export const moveBlock = (
  blocks: Block[],
  sourceIndex: number,
  destinationIndex: number
): Block[] => {
  const reorderedBlocks = [...blocks];
  const [movedBlock] = reorderedBlocks.splice(sourceIndex, 1);
  reorderedBlocks.splice(destinationIndex, 0, movedBlock);

  return reorderBlocks(reorderedBlocks);
};

// 블록 삽입 (특정 위치에)
export const insertBlockAtPosition = (
  blocks: Block[],
  newBlock: Block,
  afterBlockId?: string
): Block[] => {
  if (!afterBlockId) {
    return [...blocks, { ...newBlock, position: blocks.length }];
  }

  const afterIndex = blocks.findIndex((block) => block.id === afterBlockId);
  if (afterIndex === -1) {
    return [...blocks, { ...newBlock, position: blocks.length }];
  }

  const newBlocks = [...blocks];
  newBlocks.splice(afterIndex + 1, 0, newBlock);

  return reorderBlocks(newBlocks);
};

// 블록 삭제
export const removeBlock = (blocks: Block[], blockId: string): Block[] => {
  const filteredBlocks = blocks.filter((block) => block.id !== blockId);
  return reorderBlocks(filteredBlocks);
};

// 블록 업데이트 - 안전한 타입 처리
export const updateBlock = (
  blocks: Block[],
  blockId: string,
  updates: Partial<Block> & { [key: string]: any }
): Block[] => {
  return blocks.map((block) => {
    if (block.id !== blockId) return block;

    return {
      ...block,
      ...updates,
      updatedAt: new Date(),
    } as Block;
  });
};

// 블록 검색
export const searchBlocks = (blocks: Block[], searchTerm: string): Block[] => {
  if (!searchTerm.trim()) return blocks;

  const term = searchTerm.toLowerCase();
  return blocks.filter((block) => {
    switch (block.type) {
      case "text":
        return block.content.toLowerCase().includes(term);

      case "heading":
        return block.content.toLowerCase().includes(term);

      case "image":
        return (
          block.content.toLowerCase().includes(term) ||
          (block.caption && block.caption.toLowerCase().includes(term))
        );

      case "table":
        const allText = [...block.headers, ...block.rows.flat()]
          .join(" ")
          .toLowerCase();
        return allText.includes(term);

      default:
        return false;
    }
  });
};

// 블록 내용 요약 (미리보기용)
export const getBlockPreview = (
  block: Block,
  maxLength: number = 100
): string => {
  switch (block.type) {
    case "text":
      return (
        block.content.slice(0, maxLength) +
        (block.content.length > maxLength ? "..." : "")
      );

    case "heading":
      return `H${(block as HeadingBlock).level}: ${block.content.slice(
        0,
        maxLength
      )}`;

    case "image":
      return `🖼️ ${(block as ImageBlock).caption || "이미지"}`;

    case "table":
      const tableBlock = block as TableBlock;
      return `📊 테이블 (${tableBlock.rows.length}행 × ${tableBlock.headers.length}열)`;

    default:
      // assertNever 함수를 사용하여 exhaustive check
      return assertNever(block);
  }
};
// 블록 복제
export const duplicateBlock = (block: Block): Block => {
  return {
    ...block,
    id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    position: block.position + 1,
  };
};

// 블록 데이터 검증
export const validateBlockData = (blockData: Partial<Block>): string[] => {
  const errors: string[] = [];

  if (!blockData.type) {
    errors.push("블록 타입이 필요합니다.");
  } else if (!isValidBlockType(blockData.type)) {
    errors.push("유효하지 않은 블록 타입입니다.");
  }

  if (typeof blockData.position !== "number" || blockData.position < 0) {
    errors.push("유효한 위치 값이 필요합니다.");
  }

  if (blockData.type === "heading") {
    const level = (blockData as any).level;
    if (level && ![1, 2, 3].includes(level)) {
      errors.push("헤딩 레벨은 1, 2, 3 중 하나여야 합니다.");
    }
  }

  if (blockData.type === "image") {
    const url = (blockData as any).url;
    if (url) {
      try {
        new URL(url);
      } catch {
        errors.push("유효한 이미지 URL이 필요합니다.");
      }
    }
  }

  return errors;
};

// 블록을 마크다운으로 변환
export const blockToMarkdown = (block: Block): string => {
  switch (block.type) {
    case "text":
      return block.content;

    case "heading":
      const headingBlock = block as HeadingBlock;
      return "#".repeat(headingBlock.level) + " " + block.content;

    case "image":
      const imageBlock = block as ImageBlock;
      return `![${imageBlock.caption || ""}](${imageBlock.url || ""})`;

    case "table":
      const tableBlock = block as TableBlock;
      const headerRow = "| " + tableBlock.headers.join(" | ") + " |";
      const separatorRow =
        "| " + tableBlock.headers.map(() => "---").join(" | ") + " |";
      const dataRows = tableBlock.rows.map(
        (row) => "| " + row.join(" | ") + " |"
      );

      return [headerRow, separatorRow, ...dataRows].join("\n");

    default:
      // assertNever 함수를 사용하여 exhaustive check
      return assertNever(block);
  }
};

// 페이지의 모든 블록을 마크다운으로 변환
export const blocksToMarkdown = (
  blocks: Block[],
  pageTitle: string = ""
): string => {
  const sortedBlocks = blocks.sort((a, b) => a.position - b.position);
  const markdownBlocks = sortedBlocks.map(blockToMarkdown);

  const content = markdownBlocks.join("\n\n");

  if (pageTitle) {
    return `# ${pageTitle}\n\n${content}`;
  }

  return content;
};

// 키보드 단축키 처리
export const handleBlockKeyboard = (
  e: KeyboardEvent,
  blockId: string,
  onCreateBlock: (afterId: string) => void,
  onDeleteBlock: (id: string) => void,
  onMoveUp: (id: string) => void,
  onMoveDown: (id: string) => void
) => {
  const isCmd = e.metaKey || e.ctrlKey;

  // Enter: 새 블록 생성
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onCreateBlock(blockId);
  }

  // Backspace: 빈 블록 삭제
  if (e.key === "Backspace" && (e.target as HTMLElement).textContent === "") {
    e.preventDefault();
    onDeleteBlock(blockId);
  }

  // Cmd/Ctrl + 화살표: 블록 이동
  if (isCmd && e.key === "ArrowUp") {
    e.preventDefault();
    onMoveUp(blockId);
  }

  if (isCmd && e.key === "ArrowDown") {
    e.preventDefault();
    onMoveDown(blockId);
  }
};
