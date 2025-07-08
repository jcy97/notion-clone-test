import React, { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Page } from "../../types/page.types";
import { Editor } from "../editor/Editor";
import { OnlineUsers, CollaborationStatus } from "../collaboration";
import { useCollaboration } from "../../hooks/useCollaboration";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../utils/api";

export const SharedPage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const { user } = useAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

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
        setIsGuest(!user);
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
  }, [shareId, user]);

  const handlePageUpdate = async (updatedPage: Page) => {
    try {
      await api.put(`/pages/${updatedPage.id}`, {
        title: updatedPage.title,
        isPublic: updatedPage.isPublic,
      });
      setPage(updatedPage);
    } catch (error) {
      console.error("페이지 업데이트 실패:", error);
    }
  };

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

  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;

      await navigator.clipboard.writeText(currentUrl);

      const notification = document.createElement("div");
      notification.className =
        "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all";
      notification.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          현재 페이지 링크가 클립보드에 복사되었습니다!
        </div>
      `;

      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.transform = "translateX(100%)";
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 2000);
    } catch (error) {
      console.error("페이지 공유 실패:", error);
    }
  };

  const currentUserName = user?.name || "익명 사용자";
  const hasCollaborators = onlineUsers.length > 0;
  const isCollaborating = isConnected && hasCollaborators;

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
              <span className="text-sm text-gray-500 bg-blue-100 px-2 py-1 rounded">
                공유됨
              </span>
              {isCollaborating && (
                <div className="flex items-center gap-2 ml-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">
                    실시간 협업
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CollaborationStatus
              isConnected={isConnected}
              onlineCount={onlineUsers.length + 1}
            />

            {hasCollaborators && (
              <OnlineUsers users={onlineUsers} currentUserId={user?.id} />
            )}

            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                />
              </svg>
              공유
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={currentUserName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  currentUserName.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-gray-700">{currentUserName}</span>
              {isGuest && (
                <span className="text-xs text-gray-500">(게스트)</span>
              )}
            </div>

            {user ? (
              <a
                href="/"
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                내 워크스페이스로
              </a>
            ) : (
              <a
                href="/login"
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                로그인
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-white">
        <Editor
          page={page}
          onPageUpdate={handlePageUpdate}
          isSharedPage={true}
        />
      </main>

      {isConnected && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">
                {onlineUsers.length > 0
                  ? `${onlineUsers.length + 1}명이 함께 편집 중`
                  : "실시간 동기화됨"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
