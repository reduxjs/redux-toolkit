import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  ownerId: string;
}

const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Alpha',
    description: 'Alpha project',
    createdAt: '2025-01-01T00:00:00.000Z',
    ownerId: 'u1',
  },
  {
    id: 'p2',
    name: 'Beta',
    description: 'Beta project',
    createdAt: '2025-01-02T00:00:00.000Z',
    ownerId: 'u1',
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchProjects = createAsyncThunk<
  Project[],
  void,
  { state: RootState; rejectValue: string }
>('projects/fetchProjects', async (_, { rejectWithValue }) => {
  try {
    await sleep(500);
    return mockProjects;
  } catch {
    return rejectWithValue('获取项目列表失败');
  }
});

export const createProject = createAsyncThunk<
  Project,
  Omit<Project, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  { state: RootState; rejectValue: string }
>('projects/createProject', async (payload, { rejectWithValue }) => {
  try {
    await sleep(300);
    return {
      id: payload.id ?? `project-${Date.now()}`,
      name: payload.name,
      description: payload.description,
      ownerId: payload.ownerId,
      createdAt: payload.createdAt ?? new Date().toISOString(),
    };
  } catch {
    return rejectWithValue('创建项目失败');
  }
});

export const updateProject = createAsyncThunk<
  Project,
  Project,
  { state: RootState; rejectValue: string }
>('projects/updateProject', async (project, { rejectWithValue }) => {
  try {
    await sleep(300);
    return project;
  } catch {
    return rejectWithValue('更新项目失败');
  }
});

export const deleteProject = createAsyncThunk<
  string,
  string,
  { state: RootState; rejectValue: string }
>('projects/deleteProject', async (projectId, { rejectWithValue }) => {
  try {
    await sleep(300);
    return projectId;
  } catch {
    return rejectWithValue('删除项目失败');
  }
});
