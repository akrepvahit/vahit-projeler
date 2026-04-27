import type { PortfolioProject, PortfolioTransferFile } from "../../shared/portfolio";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ProjectsResponse {
  projects: PortfolioProject[];
}

interface SessionResponse {
  authenticated: boolean;
  configured: boolean;
  message?: string;
  localDemo?: boolean;
}

interface ProjectResponse {
  project: PortfolioProject;
}

interface DeleteResponse {
  id: string;
}

interface ImportProjectsResponse {
  projects: PortfolioProject[];
  imported: number;
  mode: "merge" | "replace";
}

export type ProjectPayload = Omit<PortfolioProject, "id" | "updatedAt">;
export type ProjectImportMode = "merge" | "replace";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    const message =
      typeof payload.message === "string" ? payload.message : "Bir hata oluştu.";
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function getProjects() {
  const response = await request<ProjectsResponse>("/api/projects", {
    method: "GET",
  });

  return response.projects;
}

export async function getAdminSession() {
  return request<SessionResponse>("/api/admin/session", {
    method: "GET",
  });
}

export async function loginAdmin(password: string) {
  return request<SessionResponse>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function logoutAdmin() {
  return request<SessionResponse>("/api/admin/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getAdminProjects() {
  const response = await request<ProjectsResponse>("/api/admin/projects", {
    method: "GET",
  });

  return response.projects;
}

export async function createProject(payload: ProjectPayload) {
  const response = await request<ProjectResponse>("/api/admin/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.project;
}

export async function updateProject(id: string, payload: ProjectPayload) {
  const response = await request<ProjectResponse>(`/api/admin/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return response.project;
}

export async function deleteProject(id: string) {
  return request<DeleteResponse>(`/api/admin/projects/${id}`, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
}

export async function importAdminProjects(
  transfer: PortfolioTransferFile,
  mode: ProjectImportMode,
) {
  return request<ImportProjectsResponse>("/api/admin/projects-transfer", {
    method: "POST",
    body: JSON.stringify({
      mode,
      transfer,
    }),
  });
}
