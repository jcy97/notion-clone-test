import React from "react";

interface Props {
  isConnected: boolean;
  onlineCount: number;
}

export const CollaborationStatus: React.FC<Props> = ({
  isConnected,
  onlineCount,
}) => {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? "bg-green-500" : "bg-red-500"
        }`}
      ></div>
      <span className="text-gray-600">
        {isConnected
          ? onlineCount > 1
            ? `${onlineCount}명 온라인`
            : "실시간 동기화"
          : "연결 중..."}
      </span>
    </div>
  );
};
