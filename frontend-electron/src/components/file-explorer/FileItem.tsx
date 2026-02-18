import React, { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { FrontendFileItem } from '@/types/fileTypes';
import { cn } from '@/lib/utils';
import { useFileStore } from '@/stores/fileStore';

interface FileItemProps {
  file: FrontendFileItem;
  level: number;
  onSelect: (file: FrontendFileItem) => void;
  onDelete: (file: FrontendFileItem) => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  file,
  level,
  onSelect,
  onDelete,
}) => {
  const { isFileSelected, canSelectFile } = useFileStore();
  const isSelected = isFileSelected(file.id);
  const [isHovering, setIsHovering] = useState(false);

  const selectionCheck = canSelectFile(file);
  const isBlocked = !isSelected && !selectionCheck.allowed;

  const handleClick = () => {
    if (isBlocked) return;
    onSelect(file);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(file);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between py-1 px-2 rounded-md",
        isSelected && "bg-accent border border-primary",
        !isSelected && !isBlocked && "hover:bg-accent/50 cursor-pointer",
        isBlocked && "opacity-50 cursor-not-allowed"
      )}
      style={{ paddingLeft: `${level * 16 + 32}px` }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      title={isBlocked ? selectionCheck.reason : undefined}
    >
      <div className="flex items-center min-w-0">
        <FileText className="h-4 w-4 mr-2 text-gray-500 shrink-0" />
        <span className="text-sm truncate">{file.name}</span>
      </div>

      {isHovering && !isBlocked && (
        <button
          onClick={handleDeleteClick}
          className="shrink-0 ml-2 p-1 hover:bg-destructive/20 rounded transition-colors"
          title="Delete file"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      )}
    </div>
  );
};