export const PROJECT_STATUSES = ["Yayında", "Geliştiriliyor", "Bakımda"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface PortfolioProject {
  id: string;
  title: string;
  spotlight: string;
  category: string;
  year: string;
  status: ProjectStatus;
  shortDescription: string;
  fullDescription: string;
  coverImage: string;
  liveUrl: string;
  repoUrl: string;
  techStack: string[];
  featured: boolean;
  updatedAt: string;
}

export interface PortfolioTransferFile {
  version: 1;
  exportedAt: string;
  projects: PortfolioProject[];
}

export const createPlaceholderCover = (title: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="1200" height="900" viewBox="0 0 1200 900" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="900" fill="#141724"/>
      <circle cx="224" cy="188" r="170" fill="#FF7A59" fill-opacity="0.88"/>
      <circle cx="972" cy="214" r="190" fill="#15AABF" fill-opacity="0.7"/>
      <circle cx="932" cy="706" r="220" fill="#F0B429" fill-opacity="0.46"/>
      <rect x="94" y="112" width="1012" height="676" rx="42" fill="white" fill-opacity="0.08" stroke="white" stroke-opacity="0.24"/>
      <text x="120" y="460" fill="white" font-size="92" font-family="Arial, sans-serif" font-weight="700">${title}</text>
      <text x="120" y="548" fill="#F5EBDD" font-size="34" font-family="Arial, sans-serif">Kapak görseli eklenmedi</text>
    </svg>
  `)}`;

export const demoProjects: PortfolioProject[] = [];
