import { create } from 'zustand';
import { FileItem, FrontendFileItem } from '@/types/fileTypes';
import { fileService } from '@/services/fileService';

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

const removeFromTree = (
  tree: FrontendFileItem[],
  path: string
): FrontendFileItem[] => {
  return tree
    .filter(node => node.path !== path)
    .map(node => ({
      ...node,
      children: node.children ? removeFromTree(node.children, path) : undefined,
    }));
};

interface FileStore {
  selectedFiles: FileItem[];
  currentDirectory: string;
  workingDirectory: string | null;
  expandedFolders: Set<string>;
  fileTree: FrontendFileItem[];

  setSelectedFiles: (files: FileItem[]) => void;
  addSelectedFile: (file: FileItem) => void;
  removeSelectedFile: (fileId: string) => void;
  clearSelectedFiles: () => void;
  setCurrentDirectory: (path: string) => void;
  setWorkingDirectory: (path: string | null) => void;
  toggleFolder: (path: string) => void;
  setFileTree: (tree: FrontendFileItem[]) => void;
  updateFileTree: (path: string, updateFn: (node: FrontendFileItem) => FrontendFileItem) => void;
  removeFromFileTree: (path: string) => void;
  refreshFileTree: (preserveExpanded?: boolean) => Promise<void>;
  loadFolderChildren: (folderPath: string) => Promise<FrontendFileItem[]>;

  isFileSelected: (fileId: string) => boolean;
  getSelectedByType: (type: 'file' | 'directory') => FileItem[];
}

export const useFileStore = create<FileStore>((set, get) => ({
  selectedFiles: [],
  currentDirectory: '/',
  workingDirectory: null,
  expandedFolders: new Set<string>(),
  fileTree: [],

  setSelectedFiles: (files) => set({ selectedFiles: files }),

  addSelectedFile: (file) =>
    set((state) => ({
      selectedFiles: [...state.selectedFiles, file],
    })),

  removeSelectedFile: (fileId) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.filter(f => f.id !== fileId),
    })),

  clearSelectedFiles: () => set({ selectedFiles: [] }),

  setCurrentDirectory: (path) => set({ currentDirectory: path }),

  setWorkingDirectory: (path) => set({ workingDirectory: path }),

  toggleFolder: (path) =>
    set((state) => {
      const newExpanded = new Set(state.expandedFolders);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return { expandedFolders: newExpanded };
    }),

  setFileTree: (tree) => set({ fileTree: tree }),

  updateFileTree: (path, updateFn) =>
    set((state) => ({
      fileTree: updateNodeInTree(state.fileTree, path, updateFn),
    })),

  removeFromFileTree: (path) =>
    set((state) => {
      const newTree = removeFromTree(state.fileTree, path);
      const newExpanded = new Set(state.expandedFolders);
      
      // Clean up expanded folders
      for (const p of state.expandedFolders) {
        if (p === path || p.startsWith(path + '/')) {
          newExpanded.delete(p);
        }
      }
      
      // Clean up selected files - remove deleted file and any children
      const newSelectedFiles = state.selectedFiles.filter(
        f => f.path !== path && !f.path.startsWith(path + '/')
      );
      
      return { 
        fileTree: newTree, 
        expandedFolders: newExpanded,
        selectedFiles: newSelectedFiles,
      };
    }),

  loadFolderChildren: async (folderPath: string) => {
    const childFiles = await fileService.listFiles(folderPath);
    return childFiles.map(child => ({
      ...child,
      children: child.type === 'directory' ? [] : undefined,
      isExpanded: false,
    }));
  },

  refreshFileTree: async (preserveExpanded = true) => {
    const { expandedFolders, loadFolderChildren, updateFileTree, selectedFiles } = get();
    
    try {
      const rootFiles = await fileService.listFiles('');
      const processedRootFiles = rootFiles.map(file => ({
        ...file,
        children: file.type === 'directory' ? [] : undefined,
        isExpanded: false,
      }));

      // Collect all valid paths after refresh
      const validPaths = new Set<string>();
      const collectPaths = (items: FrontendFileItem[]) => {
        items.forEach(item => {
          validPaths.add(item.path);
        });
      };
      collectPaths(processedRootFiles);

      set({ fileTree: processedRootFiles });

      if (preserveExpanded && expandedFolders.size > 0) {
        const sortedPaths = Array.from(expandedFolders).sort(
          (a, b) => a.split('/').length - b.split('/').length
        );

        for (const folderPath of sortedPaths) {
          try {
            const children = await loadFolderChildren(folderPath);
            children.forEach(child => validPaths.add(child.path));
            updateFileTree(folderPath, node => ({
              ...node,
              children,
              isExpanded: true,
            }));
          } catch {
            // Folder may no longer exist
          }
        }
      }

      // Clean up selected files that no longer exist
      const validSelectedFiles = selectedFiles.filter(f => validPaths.has(f.path));
      if (validSelectedFiles.length !== selectedFiles.length) {
        set({ selectedFiles: validSelectedFiles });
      }
    } catch (err) {
      console.error('Failed to refresh file tree:', err);
    }
  },

  isFileSelected: (fileId) =>
    get().selectedFiles.some(f => f.id === fileId),

  getSelectedByType: (type) =>
    get().selectedFiles.filter(f => f.type === type),
}));