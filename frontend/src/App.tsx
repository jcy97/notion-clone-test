import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useCollaboration } from "./hooks/useCollaboration";
import { Page } from "./types/page.types";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { Editor } from "./components/editor/Editor";
import { Register } from "./components/auth/Register";
import { Login } from "./components/auth/Login";
import { SharedPage } from "./components/pages/SharedPage";
import { api } from "./utils/api";

const App: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [initialPageSelected, setInitialPageSelected] = useState(false);

  const { onlineUsers, isConnected: collaborationConnected } = useCollaboration(
    currentPage?.id || ""
  );

  useEffect(() => {
    if (user) {
      fetchPages();
    }
  }, [user]);

  const fetchPages = async () => {
    setPagesLoading(true);
    setInitialPageSelected(false);

    try {
      const response = await api.get("/pages");
      setPages(response.data.pages);

      if (response.data.pages.length > 0 && !currentPage) {
        const firstPageId = response.data.pages[0].id;
        await handlePageSelect(firstPageId);
      } else {
        setInitialPageSelected(true);
      }
    } catch (error) {
      console.error("페이지 목록 불러오기 실패:", error);
      setInitialPageSelected(true);
    } finally {
      setPagesLoading(false);
    }
  };

  const handleNewPage = async () => {
    try {
      const response = await api.post("/pages", {
        title: "새 페이지",
        isPublic: false,
      });

      const newPage = response.data.page;
      const fullPageResponse = await api.get(`/pages/${newPage.id}`);
      const fullNewPage = fullPageResponse.data.page;

      setPages((prev) => [fullNewPage, ...prev]);
      setCurrentPage(fullNewPage);
      setInitialPageSelected(true);
    } catch (error) {
      console.error("페이지 생성 실패:", error);
    }
  };

  const handlePageSelect = async (pageId: string) => {
    try {
      const response = await api.get(`/pages/${pageId}`);
      const fullPage = response.data.page;

      setCurrentPage(fullPage);
      setInitialPageSelected(true);
    } catch (error) {
      console.error("페이지 불러오기 실패:", error);
    }
  };

  const handlePageUpdate = async (updatedPage: Page) => {
    try {
      await api.put(`/pages/${updatedPage.id}`, {
        title: updatedPage.title,
        isPublic: updatedPage.isPublic,
      });

      setCurrentPage(updatedPage);
      setPages((prev) =>
        prev.map((page) => (page.id === updatedPage.id ? updatedPage : page))
      );
    } catch (error) {
      console.error("페이지 업데이트 실패:", error);
    }
  };

  const handleShare = async () => {
    if (!currentPage) return;

    try {
      const response = await api.post(`/pages/${currentPage.id}/share`);
      const shareUrl = response.data.shareUrl;

      await navigator.clipboard.writeText(shareUrl);

      const notification = document.createElement("div");
      notification.className =
        "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all";
      notification.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          공유 링크가 클립보드에 복사되었습니다!
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

      const errorNotification = document.createElement("div");
      errorNotification.className =
        "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      errorNotification.textContent = "페이지 공유에 실패했습니다.";
      document.body.appendChild(errorNotification);

      setTimeout(() => {
        document.body.removeChild(errorNotification);
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/shared/:shareId" element={<SharedPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  const hasCollaborators = onlineUsers.length > 0;
  const isCollaborating = collaborationConnected && hasCollaborators;

  return (
    <Router>
      <Routes>
        <Route path="/shared/:shareId" element={<SharedPage />} />
        <Route
          path="*"
          element={
            <div className="h-screen flex flex-col bg-gray-50">
              <Header
                user={user}
                page={currentPage || undefined}
                onShare={currentPage ? handleShare : undefined}
                onLogout={logout}
                onlineUsers={onlineUsers}
                isCollaborating={isCollaborating}
              />

              <div className="flex-1 flex overflow-hidden">
                <Sidebar
                  pages={pages}
                  currentPageId={currentPage?.id}
                  onPageSelect={handlePageSelect}
                  onNewPage={handleNewPage}
                />

                <main className="flex-1 overflow-auto bg-white">
                  {pagesLoading || !initialPageSelected ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-500">
                          페이지 로딩 중...
                        </div>
                      </div>
                    </div>
                  ) : currentPage && currentPage.id ? (
                    <Editor
                      page={currentPage}
                      onPageUpdate={handlePageUpdate}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center max-w-md">
                        <div className="text-6xl mb-6">📝</div>
                        <div className="text-2xl font-semibold text-gray-700 mb-4">
                          새로운 페이지를 만들어보세요
                        </div>
                        <div className="text-gray-500 mb-8">
                          아이디어를 정리하고, 팀과 협업하고, 지식을 공유하세요.
                          실시간 협업으로 함께 작업할 수 있습니다.
                        </div>
                        <button
                          onClick={handleNewPage}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          새 페이지 만들기
                        </button>
                      </div>
                    </div>
                  )}
                </main>
              </div>

              {collaborationConnected && currentPage && (
                <div className="fixed bottom-4 right-4 z-40">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-600">
                        {hasCollaborators
                          ? `${onlineUsers.length}명과 함께 편집 중`
                          : "실시간 협업 준비됨"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
