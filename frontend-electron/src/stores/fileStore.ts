import { create } from 'zustand';
import { FileItem, FrontendFileItem } from '@/types/fileTypes';
import { fileService } from '@/services/fileService';

const EXCLUDED_DIRECTORIES = ['distance_matrix', 'results'];

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

interface SelectionState {
  eventLog: FileItem | null;
  pnmlModel: FileItem | null;
  ptmlModel: FileItem | null;
  logDirectory: FileItem | null;
  logFile: FileItem | null;
  resultFiles: FileItem[];
}

function isInResultsDirectory(path: string): boolean {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts.length >= 2 && parts[1] === 'results';
}

function getWorkingDirName(workingDirectory: string | null): string | null {
  if (!workingDirectory) return null;
  const parts = workingDirectory.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || null;
}

function isTopLevelDirectory(path: string): boolean {
  return !path.replace(/\\/g, '/').includes('/');
}

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
  
  getSelectionState: () => SelectionState;
  canSelectFile: (file: FileItem) => { allowed: boolean; reason?: string };
}

export const useFileStore = create<FileStore>((set, get) => ({
  selectedFiles: [],
  currentDirectory: '/',
  workingDirectory: null,
  expandedFolders: new Set<string>(),
  fileTree: [],

  setSelectedFiles: (files) => set({ selectedFiles: files }),

  addSelectedFile: (file) => {
    const { canSelectFile } = get();
    const check = canSelectFile(file);
    if (!check.allowed) {
      return;
    }
    set((state) => ({
      selectedFiles: [...state.selectedFiles, file],
    }));
  },

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
      
      for (const p of state.expandedFolders) {
        if (p === path || p.startsWith(path + '/')) {
          newExpanded.delete(p);
        }
      }
      
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

  getSelectionState: () => {
    const { selectedFiles, workingDirectory } = get();
    const workingDirName = getWorkingDirName(workingDirectory);
    
    const xesFiles = selectedFiles.filter(
      f => f.type === 'file' && f.name.toLowerCase().endsWith('.xes')
    );
    
    const eventLog = xesFiles[0] ?? null;
    const logFile = xesFiles.length > 0 ? xesFiles[xesFiles.length - 1] : null;
    
    const pnmlModel = selectedFiles.find(
      f => f.type === 'file' && f.name.toLowerCase().endsWith('.pnml')
    ) ?? null;
    
    const ptmlModel = selectedFiles.find(
      f => f.type === 'file' && f.name.toLowerCase().endsWith('.ptml')
    ) ?? null;
    
    const logDirectory = selectedFiles.find(f => {
      if (f.type !== 'directory') return false;
      if (EXCLUDED_DIRECTORIES.includes(f.name)) return false;
      if (isTopLevelDirectory(f.path) && f.name === workingDirName) return false;
      return true;
    }) ?? null;
    
    const resultFiles = selectedFiles.filter(
      f => f.type === 'file' && 
           f.name.toLowerCase().endsWith('.json') && 
           isInResultsDirectory(f.path)
    );
    
    return { eventLog, pnmlModel, ptmlModel, logDirectory, logFile, resultFiles };
  },

  canSelectFile: (file: FileItem) => {
    const { workingDirectory } = get();
    const state = get().getSelectionState();
    const fileName = file.name.toLowerCase();
    const filePath = file.path.replace(/\\/g, '/');
    const workingDirName = getWorkingDirName(workingDirectory);
    
    if (file.type === 'directory') {
      if (EXCLUDED_DIRECTORIES.includes(file.name)) {
        return { allowed: false, reason: `"${file.name}" cannot be selected` };
      }
      
      if (isTopLevelDirectory(filePath) && file.name === workingDirName) {
        return { allowed: true };
      }
      
      if (state.logDirectory && state.logDirectory.id !== file.id) {
        return { allowed: false, reason: 'A log directory is already selected. Deselect it first.' };
      }
      
      return { allowed: true };
    }
    
    if (file.type === 'file') {
      if (fileName.endsWith('.xes')) {
        if (state.eventLog && state.eventLog.id !== file.id) {
          return { allowed: false, reason: 'An event log is already selected. Deselect it first.' };
        }
        return { allowed: true };
      }
      
      if (fileName.endsWith('.pnml')) {
        if (state.pnmlModel && state.pnmlModel.id !== file.id) {
          return { allowed: false, reason: 'A Petri Net model is already selected. Deselect it first.' };
        }
        return { allowed: true };
      }
      
      if (fileName.endsWith('.ptml')) {
        if (state.ptmlModel && state.ptmlModel.id !== file.id) {
          return { allowed: false, reason: 'A Process Tree model is already selected. Deselect it first.' };
        }
        return { allowed: true };
      }
      
      if (fileName.endsWith('.json')) {
        if (!isInResultsDirectory(filePath)) {
          return { allowed: false, reason: 'Only .json files in the results directory can be selected' };
        }
        return { allowed: true };
      }
      
      return { allowed: false, reason: 'Unsupported file type' };
    }
    
    return { allowed: true };
  },
}));