import React, { useState, useEffect } from "react";
import { Page } from "../../types/page.types";
import { api } from "../../utils/api";

interface Props {
  pages: Page[];
  currentPageId?: string;
  onPageSelect: (pageId: string) => void;
  onNewPage: () => void;
}

export const Sidebar: React.FC<Props> = ({
  pages,
  currentPageId,
  onPageSelect,
  onNewPage,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`bg-gray-50 border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-4">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full mb-4 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
        >
          {isCollapsed ? "→" : "←"}
        </button>

        {!isCollapsed && (
          <>
            <button
              onClick={onNewPage}
              className="w-full mb-4 p-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <span>+</span>새 페이지
            </button>

            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                내 페이지
              </h3>
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => onPageSelect(page.id)}
                  className={`w-full p-2 text-left rounded transition-colors ${
                    currentPageId === page.id
                      ? "bg-blue-100 text-blue-800"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <div className="truncate">{page.title || "제목 없음"}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              ))}

              {pages.length === 0 && (
                <div className="text-sm text-gray-500 p-2">
                  페이지가 없습니다
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
