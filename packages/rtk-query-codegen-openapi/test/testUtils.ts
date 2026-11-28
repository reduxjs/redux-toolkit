import fs from 'node:fs/promises';
import { rimraf } from 'rimraf';

export const removeDir = async (dirPath: string) => {
  await rimraf(dirPath);
};

export const isDir = async (filePath: string) => {
  try {
    const stat = await fs.lstat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
};
