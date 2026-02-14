import { create } from 'zustand';
import { FileItem } from '@/types/fileTypes';

interface FileStore {
  selectedFiles: FileItem[];
  currentDirectory: string;

  setSelectedFiles: (files: FileItem[]) => void;
  addSelectedFile: (file: FileItem) => void;
  removeSelectedFile: (fileId: string) => void;
  clearSelectedFiles: () => void;
  setCurrentDirectory: (path: string) => void;

  isFileSelected: (fileId: string) => boolean;
  getSelectedByType: (type: 'file' | 'directory') => FileItem[];
}

export const useFileStore = create<FileStore>((set, get) => ({
  selectedFiles: [],
  currentDirectory: '/',

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

  isFileSelected: (fileId) =>
    get().selectedFiles.some(f => f.id === fileId),

  getSelectedByType: (type) =>
    get().selectedFiles.filter(f => f.type === type),
}));