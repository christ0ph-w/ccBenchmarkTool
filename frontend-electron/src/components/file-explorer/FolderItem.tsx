import React, { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, Trash2 } from 'lucide-react';
import { FrontendFileItem } from '@/types/fileTypes';
import { cn } from '@/lib/utils';
import { useFileStore } from '@/stores/fileStore';

interface FolderItemProps {
  folder: FrontendFileItem;
  level: number;
  isExpanded: boolean;
  onToggle: (folder: FrontendFileItem) => void;
  onSelect: (file: FrontendFileItem) => void;
  onDelete: (file: FrontendFileItem) => void;
}

export const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  level,
  isExpanded,
  onToggle,
  onSelect,
  onDelete,
}) => {
  const { isFileSelected } = useFileStore();
  const isSelected = isFileSelected(folder.id);
  const [isHovering, setIsHovering] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(folder);
  };

  const handleSelect = () => {
    onSelect(folder);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(folder);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between py-1 px-2 rounded-md cursor-pointer",
        isSelected && "bg-accent border border-primary",
        !isSelected && "hover:bg-accent/50"
      )}
      style={{ paddingLeft: `${level * 16 + 8}px` }}
      onClick={handleSelect}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center min-w-0">
        <ChevronRight
          className={cn(
            "h-4 w-4 mr-1 transition-transform shrink-0",
            isExpanded && "rotate-90"
          )}
          onClick={handleToggle}
        />
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 mr-2 text-blue-500 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 mr-2 text-blue-500 shrink-0" />
        )}
        <span className="text-sm truncate">{folder.name}</span>
      </div>

      {isHovering && (
        <button
          onClick={handleDeleteClick}
          className="shrink-0 ml-2 p-1 hover:bg-destructive/20 rounded transition-colors"
          title="Delete folder and all contents"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      )}
    </div>
  );
};