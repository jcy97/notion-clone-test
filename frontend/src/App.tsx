import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Page } from "./types/page.types";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { Editor } from "./components/editor/Editor";
import { Register } from "./components/auth/Register";
import { api } from "./utils/api";
import { Login } from "./components/auth/Login";

const App: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [pagesLoading, setPagesLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPages();
    }
  }, [user]);

  const fetchPages = async () => {
    setPagesLoading(true);
    try {
      const response = await api.get("/pages");
      setPages(response.data.pages);

      // 첫 번째 페이지를 자동으로 선택
      if (response.data.pages.length > 0 && !currentPage) {
        setCurrentPage(response.data.pages[0]);
      }
    } catch (error) {
      console.error("페이지 목록 불러오기 실패:", error);
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
      setPages((prev) => [newPage, ...prev]);
      setCurrentPage(newPage);
    } catch (error) {
      console.error("페이지 생성 실패:", error);
    }
  };

  const handlePageSelect = async (pageId: string) => {
    try {
      const response = await api.get(`/pages/${pageId}`);
      setCurrentPage(response.data.page);
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

      // 클립보드에 복사
      await navigator.clipboard.writeText(shareUrl);
      alert("공유 링크가 클립보드에 복사되었습니다!");
    } catch (error) {
      console.error("페이지 공유 실패:", error);
      alert("페이지 공유에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header
        user={user}
        page={currentPage || undefined}
        onShare={currentPage ? handleShare : undefined}
        onLogout={logout}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          pages={pages}
          currentPageId={currentPage?.id}
          onPageSelect={handlePageSelect}
          onNewPage={handleNewPage}
        />

        <main className="flex-1 overflow-auto">
          {pagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-lg text-gray-500">페이지 로딩 중...</div>
            </div>
          ) : currentPage ? (
            <Editor page={currentPage} onPageUpdate={handlePageUpdate} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-2xl text-gray-400 mb-4">📝</div>
                <div className="text-lg text-gray-500 mb-4">
                  페이지를 선택하거나 새로 만들어보세요
                </div>
                <button
                  onClick={handleNewPage}
                  className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  새 페이지 만들기
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
