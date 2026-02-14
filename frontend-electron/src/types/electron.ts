export interface UploadFileData {
  name: string;
  data: number[];
  type: string;
  size: number;
}

export interface UploadResult {
  success: boolean;
  path: string;
  directory: string;
  filename: string;
}

export interface DeleteResult {
  success: boolean;
}

export interface DataDirectory {
  name: string;
  path: string;
}

declare global {
  interface Window {
    electronAPI: {
      listFiles: (path: string) => Promise<any[]>;
      getWorkingDirectory: () => Promise<string>;
      getDataDirectories: () => Promise<DataDirectory[]>;
      uploadFile: (fileData: UploadFileData) => Promise<UploadResult>;
      deleteFile: (filePath: string) => Promise<DeleteResult>;
      onMainConsoleLog: (callback: (data: any) => void) => void;

      // Generic IPC — remove if unused (see preload.ts)
      on: (channel: string, listener: Function) => void;
      off: (channel: string, listener: Function) => void;
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}