import React, { useState } from "react";
import { User } from "../../types/user.types";
import { Page } from "../../types/page.types";

interface Props {
  user: User;
  page?: Page;
  onShare?: () => void;
  onLogout: () => void;
  onlineUsers?: any[];
  isCollaborating?: boolean;
}

export const Header: React.FC<Props> = ({
  user,
  page,
  onShare,
  onLogout,
  onlineUsers = [],
  isCollaborating = false,
}) => {
  const [showUserList, setShowUserList] = useState(false);

  const collaboratorCount = onlineUsers.length;
  const hasCollaborators = collaboratorCount > 0;

  const handleShareClick = async () => {
    if (!onShare) return;
    onShare();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">Notion Clone</h1>
          {page && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">/</span>
              <span className="text-gray-700">{page.title || "제목 없음"}</span>
              {isCollaborating && (
                <div className="flex items-center gap-2 ml-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">
                    실시간 협업
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {page && hasCollaborators && (
            <div className="relative">
              <button
                onClick={() => setShowUserList(!showUserList)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="flex -space-x-1">
                  {onlineUsers.slice(0, 3).map((collaborator, index) => (
                    <div
                      key={collaborator.userId}
                      className="w-6 h-6 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ zIndex: 10 - index }}
                    >
                      {collaborator.userAvatar ? (
                        <img
                          src={collaborator.userAvatar}
                          alt={collaborator.userName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        collaborator.userName.charAt(0).toUpperCase()
                      )}
                    </div>
                  ))}
                  {collaboratorCount > 3 && (
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-500 flex items-center justify-center text-white text-xs font-medium">
                      +{collaboratorCount - 3}
                    </div>
                  )}
                </div>
                <span>{collaboratorCount}명 온라인</span>
              </button>

              {showUserList && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-gray-100">
                    <h3 className="font-medium text-gray-900">온라인 사용자</h3>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <div className="p-2 border-b border-gray-50 bg-blue-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.name} (나)
                          </div>
                          <div className="text-sm text-gray-500">편집자</div>
                        </div>
                      </div>
                    </div>
                    {onlineUsers.map((collaborator) => (
                      <div
                        key={collaborator.userId}
                        className="p-2 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
                              {collaborator.userAvatar ? (
                                <img
                                  src={collaborator.userAvatar}
                                  alt={collaborator.userName}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                collaborator.userName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {collaborator.userName}
                            </div>
                            <div className="text-sm text-green-600">온라인</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {page && onShare && (
            <button
              onClick={handleShareClick}
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
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
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

      {showUserList && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserList(false)}
        />
      )}
    </header>
  );
};
