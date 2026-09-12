export interface Dataset {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  fingerprint: string;
}
