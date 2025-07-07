import React from "react";
import { User } from "../../types/user.types";
import { Page } from "../../types/page.types";

interface Props {
  user: User;
  page?: Page;
  onShare?: () => void;
  onLogout: () => void;
}

export const Header: React.FC<Props> = ({ user, page, onShare, onLogout }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">Notion Clone</h1>
          {page && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">/</span>
              <span className="text-gray-700">{page.title || "제목 없음"}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {page && onShare && (
            <button
              onClick={onShare}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              공유
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-gray-700">{user.name}</span>
          </div>

          <button
            onClick={onLogout}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
};
