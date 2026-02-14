import React, { useState, useEffect } from 'react';
import { FrontendFileItem } from '@/types/fileTypes';
import { fileService } from '@/services/fileService';
import { FolderItem } from './FolderItem';
import { FileItem as FileItemComponent } from './FileItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, FolderOpen, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFileStore } from '@/stores/fileStore';
import { cn } from '@/lib/utils';

interface FileExplorerProps {
  rootPath?: string;
  onFileSelect?: (file: FrontendFileItem) => void;
  allowedExtensions?: string[];
}

/* const findNodeInTree = (tree: FrontendFileItem[], path: string): FrontendFileItem | null => {
  for (const node of tree) {
    if (node.path === path) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeInTree(node.children, path);
      if (found) return found;
    }
  }
  return null;
}; */

const updateNodeInTree = (
  tree: FrontendFileItem[],
  path: string,
  updateFn: (node: FrontendFileItem) => FrontendFileItem
): FrontendFileItem[] => {
  return tree.map(node => {
    if (node.path === path) {
      return updateFn(node);
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateNodeInTree(node.children, path, updateFn),
      };
    }
    return node;
  });
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  rootPath = '',
  onFileSelect,
  allowedExtensions = ['.xes', '.pnml', '.ptml'],
}) => {
  const [fileTree, setFileTree] = useState<FrontendFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [currentWorkingDir, setCurrentWorkingDir] = useState<string | null>(null);

  const { addSelectedFile, removeSelectedFile, isFileSelected } = useFileStore();

  useEffect(() => {
    if (currentWorkingDir) return;

    const getWorkingDir = async () => {
      try {
        const workingDir = await fileService.getWorkingDirectory();
        setCurrentWorkingDir(workingDir);
      } catch (err) {
        console.error('Failed to get working directory:', err);
      }
    };

    getWorkingDir();
  }, [currentWorkingDir]);

  useEffect(() => {
    const loadDataRoot = async () => {
      setLoading(true);
      try {
        const rootFiles = await fileService.listFiles('');

        const processedRootFiles = rootFiles.map(file => ({
          ...file,
          children: file.type === 'directory' ? [] : undefined,
          isExpanded: false,
        }));

        setFileTree(processedRootFiles);
        setExpandedFolders(new Set());
      } catch (err) {
        setError('Failed to load files');
        console.error('Error loading data root:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDataRoot();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const rootFiles = await fileService.listFiles(rootPath);

      const processedRootFiles = rootFiles.map(file => ({
        ...file,
        children: file.type === 'directory' ? [] : undefined,
        isExpanded: false,
      }));

      setFileTree(processedRootFiles);
      setExpandedFolders(new Set());
    } catch (err) {
      setError('Failed to refresh files');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    try {
      await fileService.uploadFile(file);
      handleRefresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
    }
  };

  const handleFileSelect = (file: FrontendFileItem) => {
    if (isFileSelected(file.id)) {
      removeSelectedFile(file.id);
    } else {
      addSelectedFile(file);
    }
    onFileSelect?.(file);
  };

  const handleToggle = async (folder: FrontendFileItem) => {
    const folderPath = folder.path;

    if (expandedFolders.has(folderPath)) {
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderPath);
        return newSet;
      });
    } else {
      setLoading(true);
      try {
        const childFiles = await fileService.listFiles(folderPath);

        const processedChildren = childFiles.map(child => ({
          ...child,
          children: child.type === 'directory' ? [] : undefined,
          isExpanded: false,
        }));

        setFileTree(prevTree =>
          updateNodeInTree(prevTree, folderPath, node => ({
            ...node,
            children: processedChildren,
            isExpanded: true,
          }))
        );

        setExpandedFolders(prev => new Set(prev).add(folderPath));
      } catch (err) {
        setError('Failed to load directory contents');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (file: FrontendFileItem) => {
    if (currentWorkingDir && file.path === currentWorkingDir.split('\\').pop()) {
      setError('Cannot delete the current working directory in this session');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${file.name}"?${
        file.type === 'directory' ? ' (This will delete all contents)' : ''
      }`
    );

    if (!confirmDelete) return;

    setLoading(true);
    try {
      await fileService.deleteFile(file.path);

      setFileTree(prevTree => {
        const removeItemFromTree = (items: FrontendFileItem[]): FrontendFileItem[] => {
          return items.filter(item => item.path !== file.path).map(item => ({
            ...item,
            children: item.children ? removeItemFromTree(item.children) : item.children,
          }));
        };
        return removeItemFromTree(prevTree);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderFiles = (items: FrontendFileItem[] = fileTree, level = 0) => {
    return items.map((item) => {
      if (item.type === 'directory') {
        const isExpanded = expandedFolders.has(item.path);

        return (
          <div key={item.path}>
            <FolderItem
              folder={item}
              level={level}
              isExpanded={isExpanded}
              onToggle={() => handleToggle(item)}
              onSelect={handleFileSelect}
              onDelete={handleDelete}
            />
            {isExpanded && item.children && (
              <div style={{ marginLeft: `${level * 16 + 16}px` }}>
                {renderFiles(item.children, level + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <FileItemComponent
          key={item.path}
          file={item}
          level={level}
          onSelect={handleFileSelect}
          onDelete={handleDelete}
        />
      );
    });
  };

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        <p>{error}</p>
        <Button onClick={handleRefresh} variant="outline" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border rounded-lg">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <FolderOpen className="h-5 w-5" />
          <h3 className="font-semibold">File Explorer</h3>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-4 w-4" />
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept={allowedExtensions.join(',')}
              />
            </label>
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 max-h-[400px]">
        <div className="p-2 pb-6">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Loading files...</p>
            </div>
          ) : fileTree.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No files found
            </div>
          ) : (
            <div>{renderFiles(fileTree)}</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};