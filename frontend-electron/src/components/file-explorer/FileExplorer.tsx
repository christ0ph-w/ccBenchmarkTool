import React, { useState, useEffect } from 'react';
import { FrontendFileItem } from '@/types/fileTypes';
import { fileService } from '@/services/fileService';
import { FolderItem } from './FolderItem';
import { FileItem as FileItemComponent } from './FileItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, FolderOpen, Upload, Plus, FolderCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFileStore } from '@/stores/fileStore';
import { cn } from '@/lib/utils';

interface FileExplorerProps {
  rootPath?: string;
  onFileSelect?: (file: FrontendFileItem) => void;
  allowedExtensions?: string[];
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  rootPath = '',
  onFileSelect,
  allowedExtensions = ['.xes', '.pnml', '.ptml', '.json'],
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    addSelectedFile,
    removeSelectedFile,
    isFileSelected,
    selectedFiles,
    workingDirectory,
    setWorkingDirectory,
    expandedFolders,
    toggleFolder,
    fileTree,
    setFileTree,
    updateFileTree,
    removeFromFileTree,
  } = useFileStore();

  const selectedTopLevelDir = selectedFiles.find(
    f => f.type === 'directory' && !f.path.includes('/')
  );

  const canSetWorkingDir = selectedTopLevelDir && getWorkingDirName() !== selectedTopLevelDir.name;

  function getWorkingDirName(): string | null {
    if (!workingDirectory) return null;
    const parts = workingDirectory.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || null;
  }

  useEffect(() => {
    // Only load if tree is empty
    if (fileTree.length > 0) return;

    const loadInitialState = async () => {
      setLoading(true);
      try {
        const existingDir = await fileService.getWorkingDirectory();
        if (existingDir) {
          setWorkingDirectory(existingDir);
        }

        const rootFiles = await fileService.listFiles('');
        const processedRootFiles = rootFiles.map(file => ({
          ...file,
          children: file.type === 'directory' ? [] : undefined,
          isExpanded: false,
        }));

        setFileTree(processedRootFiles);
      } catch (err) {
        setError('Failed to load files');
        console.error('Error loading data root:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialState();
  }, [fileTree.length, setFileTree, setWorkingDirectory]);

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
    } catch (err) {
      setError('Failed to refresh files');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkingDir = async () => {
    setLoading(true);
    try {
      const result = await fileService.createWorkingDirectory();
      setWorkingDirectory(result.path);
      await handleRefresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create directory';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSetWorkingDir = async () => {
    if (!selectedTopLevelDir) return;

    try {
      const result = await fileService.setWorkingDirectory(selectedTopLevelDir.path);
      setWorkingDirectory(result.path);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set working directory';
      setError(errorMessage);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    if (!workingDirectory) {
      setError('No working directory set. Select or create one first.');
      return;
    }

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
      toggleFolder(folderPath);
    } else {
      setLoading(true);
      try {
        const childFiles = await fileService.listFiles(folderPath);
        const processedChildren = childFiles.map(child => ({
          ...child,
          children: child.type === 'directory' ? [] : undefined,
          isExpanded: false,
        }));

        updateFileTree(folderPath, node => ({
          ...node,
          children: processedChildren,
          isExpanded: true,
        }));

        toggleFolder(folderPath);
      } catch (err) {
        setError('Failed to load directory contents');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (file: FrontendFileItem) => {
    const workingDirName = getWorkingDirName();
    if (workingDirName && file.name === workingDirName && !file.path.includes('/')) {
      setError('Cannot delete the active working directory');
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
      removeFromFileTree(file.path);
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
        const isWorkingDir = item.name === getWorkingDirName() && !item.path.includes('/');

        return (
          <div key={item.path}>
            <div className={cn(
              isWorkingDir && "border-l-2 border-green-500 bg-green-500/5"
            )}>
              <FolderItem
                folder={item}
                level={level}
                isExpanded={isExpanded}
                onToggle={() => handleToggle(item)}
                onSelect={handleFileSelect}
                onDelete={handleDelete}
              />
              {isWorkingDir && (
                <span className="text-[10px] text-green-600 font-medium ml-10">
                  Working Directory
                </span>
              )}
            </div>
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
        <div className="flex gap-2 justify-center mt-2">
          <Button onClick={() => setError(null)} variant="outline">
            Dismiss
          </Button>
          <Button onClick={handleRefresh} variant="outline">
            Retry
          </Button>
        </div>
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
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSetWorkingDir}
            disabled={!canSetWorkingDir}
            title="Set selected directory as working directory"
          >
            <FolderCheck className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCreateWorkingDir}
            disabled={loading}
            title="Create new working directory"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <label htmlFor="file-upload" className="cursor-pointer" title="Upload file">
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
            <div className="text-center py-8 text-muted-foreground space-y-3">
              <p>No data directories found.</p>
              <Button variant="outline" size="sm" onClick={handleCreateWorkingDir}>
                <Plus className="h-4 w-4 mr-1" />
                Create Working Directory
              </Button>
            </div>
          ) : (
            <div>{renderFiles(fileTree)}</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};