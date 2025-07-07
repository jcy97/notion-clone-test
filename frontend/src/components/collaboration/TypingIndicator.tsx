import React from "react";

interface Props {
  users: Array<{
    userId: string;
    userName: string;
    blockId: string;
  }>;
}

export const TypingIndicator: React.FC<Props> = ({ users }) => {
  if (users.length === 0) return null;

  const userNames = users.map((u) => u.userName);
  const displayText =
    userNames.length === 1
      ? `${userNames[0]}이 입력 중...`
      : userNames.length === 2
      ? `${userNames[0]}과 ${userNames[1]}이 입력 중...`
      : `${userNames[0]} 외 ${userNames.length - 1}명이 입력 중...`;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 px-3 py-1">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
        <div
          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: "0.1s" }}
        ></div>
        <div
          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: "0.2s" }}
        ></div>
      </div>
      <span>{displayText}</span>
    </div>
  );
};
