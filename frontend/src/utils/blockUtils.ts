import {
  Block,
  BlockType,
  TextBlock,
  HeadingBlock,
  ImageBlock,
  TableBlock,
} from "../types/block.types";

export const isTextBlock = (block: Block): block is TextBlock =>
  block.type === "text";
export const isHeadingBlock = (block: Block): block is HeadingBlock =>
  block.type === "heading";
export const isImageBlock = (block: Block): block is ImageBlock =>
  block.type === "image";
export const isTableBlock = (block: Block): block is TableBlock =>
  block.type === "table";

const assertNever = (x: never): never => {
  throw new Error(`Unexpected object: ${x}`);
};

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

export const isValidBlockType = (type: string): type is BlockType => {
  return ["text", "heading", "image", "table"].includes(type);
};

export const reorderBlocks = (blocks: Block[]): Block[] => {
  return blocks
    .sort((a, b) => a.position - b.position)
    .map((block, index) => ({
      ...block,
      position: index,
    }));
};

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

export const removeBlock = (blocks: Block[], blockId: string): Block[] => {
  const filteredBlocks = blocks.filter((block) => block.id !== blockId);
  return reorderBlocks(filteredBlocks);
};

export const updateBlock = (
  blocks: Block[],
  blockId: string,
  updates: Partial<Block> & { [key: string]: any }
): Block[] => {
  return blocks.map((block) => {
    if (block.id !== blockId) return block;

    let updatedBlock = {
      ...block,
      ...updates,
      updatedAt: new Date(),
    } as Block;

    if (block.type === "heading") {
      const headingBlock = updatedBlock as HeadingBlock;
      if (updates.level !== undefined) {
        headingBlock.level = updates.level as 1 | 2 | 3;
      }
    }

    if (block.type === "image") {
      const imageBlock = updatedBlock as ImageBlock;
      if (updates.url !== undefined) {
        imageBlock.url = updates.url;
      }
      if (updates.caption !== undefined) {
        imageBlock.caption = updates.caption;
      }
    }

    if (block.type === "table") {
      const tableBlock = updatedBlock as TableBlock;

      if (updates.content && typeof updates.content === "string") {
        try {
          const tableData = JSON.parse(updates.content);
          tableBlock.headers = tableData.headers || [];
          tableBlock.rows = tableData.rows || [[]];
        } catch (error) {
          console.error("테이블 데이터 파싱 오류:", error);
        }
      }

      if (updates.headers || updates.rows) {
        const headers = updates.headers || (tableBlock as any).headers || [];
        const rows = updates.rows || (tableBlock as any).rows || [[]];
        tableBlock.headers = headers;
        tableBlock.rows = rows;
        tableBlock.content = JSON.stringify({ headers, rows });
      }
    }

    return updatedBlock;
  });
};

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
      const level = (block as any).level || (block as any).metadata?.level || 1;
      return `H${level}: ${block.content.slice(0, maxLength)}`;

    case "image":
      const imageBlock = block as ImageBlock;
      return `🖼️ ${imageBlock.caption || "이미지"}`;

    case "table":
      const tableBlock = block as TableBlock;

      if (tableBlock.rows && tableBlock.headers) {
        return `📊 테이블 (${tableBlock.rows.length}행 × ${tableBlock.headers.length}열)`;
      }

      try {
        const tableData = JSON.parse(
          tableBlock.content || '{"headers":["열1","열2"],"rows":[["",""]]}'
        );
        const rows = tableData.rows || [[""]];
        const headers = tableData.headers || ["열1"];
        return `📊 테이블 (${rows.length}행 × ${headers.length}열)`;
      } catch (error) {
        console.error("테이블 데이터 파싱 오류:", error);
        return `📊 테이블`;
      }

    default:
      return assertNever(block);
  }
};

export const duplicateBlock = (block: Block): Block => {
  return {
    ...block,
    id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    position: block.position + 1,
  };
};

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
    const level =
      (blockData as any).level || (blockData as any).metadata?.level;
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

export const blockToMarkdown = (block: Block): string => {
  switch (block.type) {
    case "text":
      return block.content;

    case "heading":
      const level = (block as any).level || (block as any).metadata?.level || 1;
      return "#".repeat(level) + " " + block.content;

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
      return assertNever(block);
  }
};

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

export const handleBlockKeyboard = (
  e: KeyboardEvent,
  blockId: string,
  onCreateBlock: (afterId: string) => void,
  onDeleteBlock: (id: string) => void,
  onMoveUp: (id: string) => void,
  onMoveDown: (id: string) => void
) => {
  const isCmd = e.metaKey || e.ctrlKey;

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onCreateBlock(blockId);
  }

  if (e.key === "Backspace" && (e.target as HTMLElement).textContent === "") {
    e.preventDefault();
    onDeleteBlock(blockId);
  }

  if (isCmd && e.key === "ArrowUp") {
    e.preventDefault();
    onMoveUp(blockId);
  }

  if (isCmd && e.key === "ArrowDown") {
    e.preventDefault();
    onMoveDown(blockId);
  }
};
