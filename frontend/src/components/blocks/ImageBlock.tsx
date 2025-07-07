import React, { useState, useRef } from "react";
import { ImageBlock as ImageBlockType } from "../../types/block.types";

interface Props {
  block: ImageBlockType;
  onUpdate: (id: string, url: string, caption?: string) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const ImageBlock: React.FC<Props> = ({
  block,
  onUpdate,
  onDelete,
  isSelected,
  onSelect,
}) => {
  const blockUrl = (block as any).url || (block as any).metadata?.url || "";
  const blockCaption =
    (block as any).caption ||
    (block as any).metadata?.caption ||
    block.content ||
    "";

  const [caption, setCaption] = useState(blockCaption);
  const [isEditing, setIsEditing] = useState(!blockUrl);
  const [imageUrl, setImageUrl] = useState(blockUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setImageUrl(url);
        onUpdate(block.id, url, caption);
        setIsEditing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (imageUrl) {
      onUpdate(block.id, imageUrl, caption);
      setIsEditing(false);
    }
  };

  const handleCaptionChange = (newCaption: string) => {
    setCaption(newCaption);
    onUpdate(block.id, imageUrl, newCaption);
  };

  const handleCaptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`group relative py-2 px-3 rounded hover:bg-gray-50 ${
        isSelected ? "bg-blue-50" : ""
      }`}
      onClick={onSelect}
    >
      {isEditing ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="이미지 URL을 입력하세요"
                className="w-full px-3 py-2 border rounded-md"
                autoFocus
              />
            </div>
            <div className="text-gray-500">또는</div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                파일 업로드
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                disabled={!imageUrl}
              >
                확인
              </button>
              <button
                type="button"
                onClick={() => onDelete(block.id)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          <img
            src={imageUrl}
            alt={caption}
            className="max-w-full h-auto rounded-lg cursor-pointer"
            onClick={() => setIsEditing(true)}
          />
          <input
            type="text"
            value={caption}
            onChange={(e) => handleCaptionChange(e.target.value)}
            onKeyDown={handleCaptionKeyDown}
            placeholder="이미지 설명을 입력하세요..."
            className="w-full mt-2 px-2 py-1 text-sm text-gray-600 bg-transparent border-none outline-none placeholder-gray-400"
          />
        </div>
      )}

      <div className="absolute left-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded">
          ⋮⋮
        </button>
      </div>
    </div>
  );
};
