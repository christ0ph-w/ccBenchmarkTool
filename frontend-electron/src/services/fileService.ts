import { FrontendFileItem } from '@/types/fileTypes';
import type { UploadResult, DeleteResult, UploadFileData, SetWorkingDirResult, CreateWorkingDirResult, DataDirectory } from '@/types/electron';

class FileService {
  async listFiles(path: string = ''): Promise<FrontendFileItem[]> {
    if (!window.electronAPI?.listFiles) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.listFiles(path);
  }

  async uploadFile(file: File): Promise<UploadResult> {
    if (!window.electronAPI?.uploadFile) {
      throw new Error('Electron API not available');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const fileData: UploadFileData = {
      name: file.name,
      data: Array.from(buffer),
      type: file.type,
      size: file.size,
    };

    return await window.electronAPI.uploadFile(fileData);
  }

  async deleteFile(filePath: string): Promise<DeleteResult> {
    if (!window.electronAPI?.deleteFile) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.deleteFile(filePath);
  }

  async getWorkingDirectory(): Promise<string | null> {
    if (!window.electronAPI?.getWorkingDirectory) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.getWorkingDirectory();
  }

  async setWorkingDirectory(dirPath: string): Promise<SetWorkingDirResult> {
    if (!window.electronAPI?.setWorkingDirectory) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.setWorkingDirectory(dirPath);
  }

  async createWorkingDirectory(): Promise<CreateWorkingDirResult> {
    if (!window.electronAPI?.createWorkingDirectory) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.createWorkingDirectory();
  }

  async getDataDirectories(): Promise<DataDirectory[]> {
    if (!window.electronAPI?.getDataDirectories) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.getDataDirectories();
  }

  async readFile(filePath: string): Promise<string> {
    if (!window.electronAPI?.readFile) {
      throw new Error('Electron API not available');
    }
    const result = await window.electronAPI.readFile(filePath);
    if (!result.success) {
      throw new Error(result.error || 'Failed to read file');
    }
    return result.content!;
  }
}

export const fileService = new FileService();