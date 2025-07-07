import { useEffect, useState, useRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

interface UseYDocProps {
  pageId: string;
  onUpdate?: (content: any) => void;
}

export const useYDoc = ({ pageId, onUpdate }: UseYDocProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!pageId) return;

    // YJS Document 생성
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // WebSocket Provider 설정
    const wsUrl = process.env.REACT_APP_WS_URL || "ws://localhost:3001";
    const provider = new WebsocketProvider(wsUrl, `page-${pageId}`, ydoc);
    providerRef.current = provider;

    // 연결 상태 모니터링
    provider.on("status", (event: { status: string }) => {
      setIsConnected(event.status === "connected");
    });

    // 문서 업데이트 감지
    const ymap = ydoc.getMap("page-content");
    const updateHandler = () => {
      if (onUpdate) {
        const content = ymap.toJSON();
        onUpdate(content);
      }
    };

    ymap.observe(updateHandler);

    // 정리
    return () => {
      ymap.unobserve(updateHandler);
      provider.destroy();
      ydoc.destroy();
    };
  }, [pageId, onUpdate]);

  // 블록 업데이트 함수
  const updateBlock = (blockId: string, content: any) => {
    if (!ydocRef.current) return;

    const ymap = ydocRef.current.getMap("page-content");
    const blocksMap = (ymap.get("blocks") as Y.Map<any>) || new Y.Map();

    if (!ymap.has("blocks")) {
      ymap.set("blocks", blocksMap);
    }

    blocksMap.set(blockId, content);
  };

  // 블록 삭제 함수
  const deleteBlock = (blockId: string) => {
    if (!ydocRef.current) return;

    const ymap = ydocRef.current.getMap("page-content");
    const blocksMap = ymap.get("blocks") as Y.Map<any>;

    if (blocksMap) {
      blocksMap.delete(blockId);
    }
  };

  // 블록 추가 함수
  const addBlock = (blockId: string, content: any, position: number) => {
    if (!ydocRef.current) return;

    const ymap = ydocRef.current.getMap("page-content");
    const blocksMap = (ymap.get("blocks") as Y.Map<any>) || new Y.Map();

    if (!ymap.has("blocks")) {
      ymap.set("blocks", blocksMap);
    }

    const blockData = {
      ...content,
      position,
      timestamp: Date.now(),
    };

    blocksMap.set(blockId, blockData);
  };

  // 현재 문서 상태 가져오기
  const getDocumentState = () => {
    if (!ydocRef.current) return null;

    const ymap = ydocRef.current.getMap("page-content");
    return ymap.toJSON();
  };

  // 협업자 정보 가져오기
  const getAwareness = () => {
    return providerRef.current?.awareness || null;
  };

  // 사용자 커서 위치 설정
  const setUserCursor = (blockId: string, position: number) => {
    const awareness = getAwareness();
    if (awareness) {
      awareness.setLocalStateField("cursor", {
        blockId,
        position,
        timestamp: Date.now(),
      });
    }
  };

  // 사용자 선택 영역 설정
  const setUserSelection = (blockId: string, start: number, end: number) => {
    const awareness = getAwareness();
    if (awareness) {
      awareness.setLocalStateField("selection", {
        blockId,
        start,
        end,
        timestamp: Date.now(),
      });
    }
  };

  return {
    isConnected,
    ydoc: ydocRef.current,
    provider: providerRef.current,
    updateBlock,
    deleteBlock,
    addBlock,
    getDocumentState,
    getAwareness,
    setUserCursor,
    setUserSelection,
  };
};
