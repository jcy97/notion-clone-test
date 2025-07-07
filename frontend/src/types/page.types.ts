import { Block } from "./block.types";

export interface Page {
  id: string;
  title: string;
  blocks: Block[];
  ownerId: string;
  collaborators: string[];
  isPublic: boolean;
  shareUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePageRequest {
  title: string;
  isPublic?: boolean;
}

export interface UpdatePageRequest {
  title?: string;
  isPublic?: boolean;
}
