import React from "react";

interface UserInfo {
  userId: string;
  userName: string;
  userAvatar?: string;
  lastSeen: number;
}

interface Props {
  users: UserInfo[];
  currentUserId?: string;
}

export const OnlineUsers: React.FC<Props> = ({ users, currentUserId }) => {
  const otherUsers = users.filter((user) => user.userId !== currentUserId);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {otherUsers.slice(0, 5).map((user, index) => (
        <div
          key={user.userId}
          className="relative"
          style={{ marginLeft: index > 0 ? "-8px" : "0" }}
        >
          <div
            className="w-8 h-8 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-white text-sm font-medium shadow-sm"
            title={user.userName}
          >
            {user.userAvatar ? (
              <img
                src={user.userAvatar}
                alt={user.userName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              user.userName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
      ))}
      {otherUsers.length > 5 && (
        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-500 flex items-center justify-center text-white text-xs font-medium shadow-sm ml-1">
          +{otherUsers.length - 5}
        </div>
      )}
    </div>
  );
};
