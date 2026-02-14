export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  modified?: string;
}

export interface FrontendFileItem extends FileItem {
  isExpanded?: boolean;
  isSelected?: boolean;
  children?: FrontendFileItem[];
}