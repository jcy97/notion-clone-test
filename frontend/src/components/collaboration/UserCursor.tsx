import React from "react";

interface Props {
  userId: string;
  userName: string;
  userAvatar?: string;
  position: { top: number; left: number };
  color: string;
}

export const UserCursor: React.FC<Props> = ({
  userId,
  userName,
  userAvatar,
  position,
  color,
}) => {
  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        top: position.top,
        left: position.left,
        transform: "translateX(-1px)",
      }}
    >
      <div className="w-0.5 h-5" style={{ backgroundColor: color }} />
      <div
        className="absolute top-0 left-1 px-2 py-1 rounded text-white text-xs whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center gap-1">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="w-3 h-3 rounded-full"
            />
          ) : (
            <div className="w-3 h-3 rounded-full bg-white bg-opacity-30 flex items-center justify-center text-xs">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          {userName}
        </div>
      </div>
    </div>
  );
};
