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

export interface SetWorkingDirResult {
  success: boolean;
  path: string;
}

export interface CreateWorkingDirResult {
  success: boolean;
  path: string;
  name: string;
}

export interface DataDirectory {
  name: string;
  path: string;
}

export interface ReadFileResult {
  success: boolean;
  content?: string;
  error?: string;
}

declare global {
  interface Window {
    electronAPI: {
      listFiles: (path: string) => Promise<any[]>;
      getWorkingDirectory: () => Promise<string | null>;
      setWorkingDirectory: (dirPath: string) => Promise<SetWorkingDirResult>;
      createWorkingDirectory: () => Promise<CreateWorkingDirResult>;
      getDataDirectories: () => Promise<DataDirectory[]>;
      uploadFile: (fileData: UploadFileData) => Promise<UploadResult>;
      deleteFile: (filePath: string) => Promise<DeleteResult>;
      readFile: (filePath: string) => Promise<ReadFileResult>;
      onMainConsoleLog: (callback: (data: any) => void) => void;
    };
  }
}