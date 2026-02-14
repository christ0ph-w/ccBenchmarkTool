import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  listFiles: (path: string) => ipcRenderer.invoke('list-files', path),
  getWorkingDirectory: () => ipcRenderer.invoke('get-working-directory'),
  getDataDirectories: () => ipcRenderer.invoke('get-data-directories'),
  uploadFile: (fileData: any) => ipcRenderer.invoke('upload-file', fileData),
  deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),

  // Console logging
  onMainConsoleLog: (callback: (data: any) => void) => {
    ipcRenderer.on('main-console-log', (_event, data) => callback(data));
  },

  // Generic IPC — TODO: remove if unused, exposes full IPC surface
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});
