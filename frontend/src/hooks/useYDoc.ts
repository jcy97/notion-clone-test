import { useEffect, useState, useRef, useCallback } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

interface UseYDocProps {
  pageId: string;
  onUpdate?: (content: any) => void;
}

export const useYDoc = ({ pageId, onUpdate }: UseYDocProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SocketIOProvider | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // onUpdate를 useCallback으로 메모이제이션
  const stableOnUpdate = useCallback(onUpdate || (() => {}), [onUpdate]);

  useEffect(() => {
    if (!pageId) return;

    // 기존 연결이 있다면 정리
    if (providerRef.current) {
      providerRef.current.destroy();
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
    }

    // YJS Document 생성
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // WebSocket Provider 설정 (더 안정적인 옵션들 추가)
    const wsUrl = process.env.REACT_APP_WS_URL || "ws://localhost:3001";
    const provider = new SocketIOProvider(wsUrl, `page-${pageId}`, ydoc, {
      // 재연결 설정
      autoConnect: true,
      // 디버깅을 위한 로그 비활성화 (선택사항)
      disableBc: false,
    });
    providerRef.current = provider;

    // 연결 상태를 debounce로 처리
    const updateConnectionStatus = (status: string) => {
      // 기존 타임아웃 클리어
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }

      // 상태 변경을 지연시켜 빠른 변화 방지
      connectionTimeoutRef.current = setTimeout(() => {
        const connected = status === "connected";
        setIsConnected((prev) => {
          // 실제로 상태가 변경될 때만 업데이트
          if (prev !== connected) {
            console.log(`YJS Connection status: ${status}`);
            return connected;
          }
          return prev;
        });
      }, 100); // 100ms 디바운스
    };

    // 연결 상태 모니터링
    const statusHandler = (event: { status: string }) => {
      updateConnectionStatus(event.status);
    };

    provider.on("status", statusHandler);

    // 문서 업데이트 감지
    const ymap = ydoc.getMap("page-content");
    let updateTimeout: NodeJS.Timeout | null = null;

    const updateHandler = () => {
      // 업데이트를 debounce 처리
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      updateTimeout = setTimeout(() => {
        try {
          const content = ymap.toJSON();
          stableOnUpdate(content);
        } catch (error) {
          console.error("Error in YJS update handler:", error);
        }
      }, 50); // 50ms 디바운스
    };

    ymap.observe(updateHandler);

    // 정리 함수
    return () => {
      // 타임아웃 정리
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      // 이벤트 리스너 제거
      provider.off("status", statusHandler);
      ymap.unobserve(updateHandler);

      // 리소스 정리
      provider.destroy();
      ydoc.destroy();

      // ref 초기화
      ydocRef.current = null;
      providerRef.current = null;
    };
  }, [pageId]); // onUpdate 제거하고 pageId만 의존성으로 설정

  // 블록 업데이트 함수
  const updateBlock = useCallback((blockId: string, content: any) => {
    if (!ydocRef.current) return;

    try {
      const ymap = ydocRef.current.getMap("page-content");
      const blocksMap = (ymap.get("blocks") as Y.Map<any>) || new Y.Map();

      if (!ymap.has("blocks")) {
        ymap.set("blocks", blocksMap);
      }

      blocksMap.set(blockId, content);
    } catch (error) {
      console.error("Error updating block:", error);
    }
  }, []);

  // 블록 삭제 함수
  const deleteBlock = useCallback((blockId: string) => {
    if (!ydocRef.current) return;

    try {
      const ymap = ydocRef.current.getMap("page-content");
      const blocksMap = ymap.get("blocks") as Y.Map<any>;

      if (blocksMap) {
        blocksMap.delete(blockId);
      }
    } catch (error) {
      console.error("Error deleting block:", error);
    }
  }, []);

  // 블록 추가 함수
  const addBlock = useCallback(
    (blockId: string, content: any, position: number) => {
      if (!ydocRef.current) return;

      try {
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
      } catch (error) {
        console.error("Error adding block:", error);
      }
    },
    []
  );

  // 현재 문서 상태 가져오기
  const getDocumentState = useCallback(() => {
    if (!ydocRef.current) return null;

    try {
      const ymap = ydocRef.current.getMap("page-content");
      return ymap.toJSON();
    } catch (error) {
      console.error("Error getting document state:", error);
      return null;
    }
  }, []);

  // 협업자 정보 가져오기
  const getAwareness = useCallback(() => {
    return providerRef.current?.awareness || null;
  }, []);

  // 사용자 커서 위치 설정
  const setUserCursor = useCallback(
    (blockId: string, position: number) => {
      try {
        const awareness = getAwareness();
        if (awareness) {
          awareness.setLocalStateField("cursor", {
            blockId,
            position,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error("Error setting user cursor:", error);
      }
    },
    [getAwareness]
  );

  // 사용자 선택 영역 설정
  const setUserSelection = useCallback(
    (blockId: string, start: number, end: number) => {
      try {
        const awareness = getAwareness();
        if (awareness) {
          awareness.setLocalStateField("selection", {
            blockId,
            start,
            end,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error("Error setting user selection:", error);
      }
    },
    [getAwareness]
  );

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
