import { FrontendFileItem } from '@/types/fileTypes';
import type { UploadResult, DeleteResult, UploadFileData } from '@/types/electron';

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

  async getWorkingDirectory(): Promise<string> {
    if (!window.electronAPI?.getWorkingDirectory) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.getWorkingDirectory();
  }

  async getDataDirectories(): Promise<Array<{ name: string; path: string }>> {
    if (!window.electronAPI?.getDataDirectories) {
      throw new Error('Electron API not available');
    }
    return await window.electronAPI.getDataDirectories();
  }
}

export const fileService = new FileService();