import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win: BrowserWindow | null;
let currentWorkingDir: string | null = null;

function getDataRoot(): string {
  const projectRoot = path.join(__dirname, '..', '..');
  return path.join(projectRoot, 'data');
}

function createTimestampedDirectory(): string {
  const dataRoot = getDataRoot();

  if (!fs.existsSync(dataRoot)) {
    fs.mkdirSync(dataRoot, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  const workingDir = path.join(dataRoot, `${timestamp}_data`);

  if (!fs.existsSync(workingDir)) {
    fs.mkdirSync(workingDir, { recursive: true });
  }

  return workingDir;
}

// --- IPC Handlers ---

ipcMain.handle('get-working-directory', () => {
  return currentWorkingDir;
});

ipcMain.handle('set-working-directory', (_event, dirPath: string) => {
  const dataRoot = getDataRoot();
  const absolutePath = path.resolve(dataRoot, dirPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }

  if (!absolutePath.startsWith(dataRoot)) {
    throw new Error('Directory must be within the data root');
  }

  currentWorkingDir = absolutePath;
  return { success: true, path: currentWorkingDir };
});

ipcMain.handle('create-working-directory', () => {
  currentWorkingDir = createTimestampedDirectory();
  return { success: true, path: currentWorkingDir, name: path.basename(currentWorkingDir) };
});

ipcMain.handle('get-data-directories', () => {
  const dataRoot = getDataRoot();

  if (!fs.existsSync(dataRoot)) {
    return [];
  }

  const items = fs.readdirSync(dataRoot, { withFileTypes: true });
  return items
    .filter(dirent => dirent.isDirectory())
    .map(dirent => ({
      name: dirent.name,
      path: path.join(dataRoot, dirent.name),
    }));
});

ipcMain.handle('list-files', async (_event, targetPath: string) => {
  try {
    const dataRoot = getDataRoot();
    const absolutePath = targetPath
      ? path.resolve(dataRoot, targetPath)
      : dataRoot;

    if (!fs.existsSync(absolutePath)) {
      return [];
    }

    const items = fs.readdirSync(absolutePath, { withFileTypes: true });
    const files = items.map(dirent => {
      const fullPath = path.join(absolutePath, dirent.name);
      const relativePath = path.relative(dataRoot, fullPath);
      const stat = fs.statSync(fullPath);

      return {
        id: relativePath.replace(/\\/g, '/'),
        name: dirent.name,
        path: relativePath.replace(/\\/g, '/'),
        type: dirent.isDirectory() ? 'directory' : 'file',
        extension: dirent.isDirectory() ? undefined : path.extname(dirent.name).toLowerCase(),
        size: dirent.isDirectory() ? 0 : stat.size,
        modified: stat.mtime.toISOString(),
        isExpanded: false,
        children: [],
      };
    });

    return files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
});

ipcMain.handle('upload-file', async (_event, fileData: { name: string; data: number[]; type: string; size: number }) => {
  if (!currentWorkingDir) {
    throw new Error('No working directory set. Please select or create one first.');
  }

  try {
    const filePath = path.join(currentWorkingDir, fileData.name);
    const buffer = Buffer.from(fileData.data);
    await fs.promises.writeFile(filePath, buffer);

    return {
      success: true,
      path: filePath,
      directory: path.basename(currentWorkingDir),
      filename: fileData.name,
    };
  } catch (error) {
    console.error('Upload failed:', error);
    throw new Error(`Upload failed: ${error}`);
  }
});

ipcMain.handle('delete-file', async (_event, filePath: string) => {
  try {
    const dataRoot = getDataRoot();
    const absolutePath = path.resolve(dataRoot, filePath);
    await fs.promises.rm(absolutePath, { recursive: true, force: true });

    return { success: true };
  } catch (error) {
    console.error('Delete failed:', error);
    throw new Error(`Delete failed: ${error}`);
  }
});

ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    const dataRoot = getDataRoot();
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(dataRoot, filePath);

    const content = await fs.promises.readFile(fullPath, 'utf-8');
    return { success: true, content };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('upload-file-native', async () => {
  if (!currentWorkingDir) {
    throw new Error('No working directory set. Please select or create one first.');
  }

  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Supported', extensions: ['xes', 'pnml', 'ptml', 'json'] },
      { name: 'Event Logs', extensions: ['xes'] },
      { name: 'Petri Nets', extensions: ['pnml'] },
      { name: 'Process Trees', extensions: ['ptml'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  const uploaded: Array<{ path: string; filename: string }> = [];

  for (const sourcePath of result.filePaths) {
    const filename = path.basename(sourcePath);
    const destPath = path.join(currentWorkingDir, filename);
    
    await fs.promises.copyFile(sourcePath, destPath);
    
    uploaded.push({
      path: destPath,
      filename,
    });
  }

  return {
    success: true,
    files: uploaded,
    directory: path.basename(currentWorkingDir),
  };
});

// --- Window ---

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  createWindow();
});
