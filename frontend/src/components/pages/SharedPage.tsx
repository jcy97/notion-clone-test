import React, { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Page } from "../../types/page.types";
import { Editor } from "../editor/Editor";
import { OnlineUsers, CollaborationStatus } from "../collaboration";
import { useCollaboration } from "../../hooks/useCollaboration";
import { api } from "../../utils/api";

export const SharedPage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReadOnly] = useState(true);

  const { onlineUsers, isConnected } = useCollaboration(page?.id || "");

  useEffect(() => {
    const fetchSharedPage = async () => {
      if (!shareId) {
        setError("유효하지 않은 공유 링크입니다.");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/shared/${shareId}`);
        setPage(response.data.page);
      } catch (error: any) {
        if (error.response?.status === 404) {
          setError("페이지를 찾을 수 없거나 공유가 중단되었습니다.");
        } else if (error.response?.status === 403) {
          setError("이 페이지에 접근할 권한이 없습니다.");
        } else {
          setError("페이지를 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSharedPage();
  }, [shareId]);

  const handlePageUpdate = () => {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">공유 페이지 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">⚠️</div>
          <div className="text-2xl font-semibold text-gray-700 mb-4">
            접근할 수 없습니다
          </div>
          <div className="text-gray-500 mb-8">{error}</div>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  if (!page) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Notion Clone
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">/</span>
              <span className="text-gray-700">{page.title || "제목 없음"}</span>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                읽기 전용
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CollaborationStatus
              isConnected={isConnected}
              onlineCount={onlineUsers.length + 1}
            />
            <OnlineUsers users={onlineUsers} />
            <a
              href="/"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              내 워크스페이스로
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {isReadOnly && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-blue-800 font-medium">
                  이 페이지는 읽기 전용입니다. 실시간으로 다른 사용자들과 함께
                  보고 있습니다.
                </span>
              </div>
            </div>
          )}

          <div className="pointer-events-none select-text">
            <h1 className="text-4xl font-bold mb-8 text-gray-900">
              {page.title || "제목 없음"}
            </h1>

            <div className="space-y-1">
              {page.blocks?.map((block) => (
                <div key={block.id} className="py-1 px-3 rounded">
                  {block.type === "text" && (
                    <div
                      className="text-gray-900"
                      style={{ wordBreak: "break-word" }}
                    >
                      {block.content || ""}
                    </div>
                  )}
                  {block.type === "heading" && (
                    <div
                      className={`text-gray-900 font-bold ${
                        (block as any).level === 1
                          ? "text-3xl"
                          : (block as any).level === 2
                          ? "text-2xl"
                          : "text-xl"
                      }`}
                    >
                      {block.content || ""}
                    </div>
                  )}
                  {block.type === "image" && (
                    <div>
                      <img
                        src={(block as any).url || ""}
                        alt={(block as any).caption || ""}
                        className="max-w-full h-auto rounded-lg"
                      />
                      {(block as any).caption && (
                        <div className="text-sm text-gray-600 mt-2 text-center">
                          {(block as any).caption}
                        </div>
                      )}
                    </div>
                  )}
                  {block.type === "table" && (
                    <div className="overflow-x-auto">
                      {(() => {
                        try {
                          const tableData = JSON.parse(
                            block.content || '{"headers":[],"rows":[]}'
                          );
                          return (
                            <table className="w-full border-collapse border border-gray-300">
                              <thead>
                                <tr>
                                  {tableData.headers?.map(
                                    (header: string, index: number) => (
                                      <th
                                        key={index}
                                        className="border border-gray-300 p-2 bg-gray-50 font-semibold text-left"
                                      >
                                        {header}
                                      </th>
                                    )
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {tableData.rows?.map(
                                  (row: string[], rowIndex: number) => (
                                    <tr key={rowIndex}>
                                      {row.map(
                                        (cell: string, cellIndex: number) => (
                                          <td
                                            key={cellIndex}
                                            className="border border-gray-300 p-2"
                                          >
                                            {cell}
                                          </td>
                                        )
                                      )}
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          );
                        } catch {
                          return (
                            <div className="text-gray-500">
                              표 데이터를 불러올 수 없습니다.
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {isConnected && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">
                {onlineUsers.length > 0
                  ? `${onlineUsers.length}명과 함께 보는 중`
                  : "실시간 동기화됨"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
