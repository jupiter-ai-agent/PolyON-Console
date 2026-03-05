import { apiFetch } from './client';

export interface User {
  username: string;
  cn?: string;
  given_name?: string;
  surname?: string;
  display_name?: string;
  mail?: string;
  enabled: boolean;
  dn?: string;
  member_of?: string[];
  when_created?: string;
  description?: string;
  attributes?: Record<string, unknown>;
  groups?: string[];
}

export interface UsersResponse {
  users: User[];
}

export interface UserResponse extends User {
  // same as User
}

export interface CreateUserPayload {
  username: string;
  password: string;
  given_name: string;
  surname: string;
  mail?: string;
  enable_mail?: boolean;
  enable_drive?: boolean;
  enable_chat?: boolean;
}

export interface UpdateUserPayload {
  given_name?: string;
  surname?: string;
  mail?: string;
  description?: string;
  enabled?: boolean;
}

export interface Group {
  name: string;
  description?: string;
  dn?: string;
  member_count?: number;
  members?: string[];
  group_type?: string;
  attributes?: Record<string, unknown>;
}

export interface GroupsResponse {
  groups: Group[];
}

export interface OU {
  name: string;
  dn: string;
  parent_dn?: string;
  description?: string;
  depth?: number;
  users?: User[];
  groups?: Group[];
  sub_ous?: OU[];
}

export interface OUsResponse {
  ous: OU[];
  base_dn?: string;
  success?: boolean;
  base_contents?: {
    users?: User[];
    groups?: Group[];
  };
}

export interface Computer {
  name: string;
  dns_hostname?: string;
  os?: string;
  os_version?: string;
  when_created?: string;
  dn?: string;
}

export interface ComputersResponse {
  computers: Computer[];
}

export interface DomainDCsResponse {
  dcs: Computer[];
}

// Users API
export const listUsers = () => apiFetch<UsersResponse>('/users');
export const getUser = (username: string) => apiFetch<UserResponse>(`/users/${encodeURIComponent(username)}`);
export const createUser = (data: CreateUserPayload) =>
  apiFetch<UserResponse>('/users', { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (username: string, data: UpdateUserPayload) =>
  apiFetch<UserResponse>(`/users/${encodeURIComponent(username)}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteUser = (username: string) =>
  apiFetch<void>(`/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
export const enableUser = (username: string) =>
  apiFetch<void>(`/users/${encodeURIComponent(username)}/enable`, { method: 'POST' });
export const disableUser = (username: string) =>
  apiFetch<void>(`/users/${encodeURIComponent(username)}/disable`, { method: 'POST' });
export const resetPassword = (username: string, password: string) =>
  apiFetch<void>(`/users/${encodeURIComponent(username)}/password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
export const userPhotoUrl = (username: string) => `/api/v1/users/${encodeURIComponent(username)}/photo`;

// Groups API
export const listGroups = () => apiFetch<GroupsResponse>('/groups');
export const getGroup = (name: string) => apiFetch<Group>(`/groups/${encodeURIComponent(name)}`);
export const createGroup = (data: { name: string; description?: string; group_type?: string }) =>
  apiFetch<Group>('/groups', { method: 'POST', body: JSON.stringify(data) });
export const updateGroup = (name: string, data: { name?: string; description?: string }) =>
  apiFetch<Group>(`/groups/${encodeURIComponent(name)}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteGroup = (name: string) =>
  apiFetch<void>(`/groups/${encodeURIComponent(name)}`, { method: 'DELETE' });
export const addMember = (group: string, username: string) =>
  apiFetch<void>(`/groups/${encodeURIComponent(group)}/members`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
export const removeMember = (group: string, username: string) =>
  apiFetch<void>(`/groups/${encodeURIComponent(group)}/members/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  });

// OUs API
export const listOUs = () => apiFetch<OUsResponse>('/ous');
export const ouTree = () => apiFetch<OUsResponse>('/ous/tree');
export const ouContents = (dn: string) =>
  apiFetch<OU>(`/ous/contents?dn=${encodeURIComponent(dn)}`);
export const createOU = (data: { name: string; parent_dn?: string; description?: string }) =>
  apiFetch<OU>('/ous', { method: 'POST', body: JSON.stringify(data) });
export const deleteOU = (dn: string) =>
  apiFetch<void>(`/ous?dn=${encodeURIComponent(dn)}`, { method: 'DELETE' });
export const moveUser = (username: string, targetDn: string) =>
  apiFetch<void>(`/users/${encodeURIComponent(username)}/move`, {
    method: 'POST',
    body: JSON.stringify({ target_dn: targetDn }),
  });
export const moveGroup = (name: string, targetDn: string) =>
  apiFetch<void>(`/groups/${encodeURIComponent(name)}/move`, {
    method: 'POST',
    body: JSON.stringify({ target_dn: targetDn }),
  });

// Computers API
export const listComputers = () => apiFetch<ComputersResponse>('/computers');
export const domainDCs = () => apiFetch<DomainDCsResponse>('/domain/dcs');

// Photo API
export const uploadPhoto = async (username: string, file: File): Promise<void> => {
  const form = new FormData();
  form.append('photo', file);
  const res = await fetch(`/api/v1/users/${encodeURIComponent(username)}/photo`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('사진 업로드 실패');
};

export const deletePhoto = (username: string) =>
  apiFetch<void>(`/users/${encodeURIComponent(username)}/photo`, { method: 'DELETE' });
