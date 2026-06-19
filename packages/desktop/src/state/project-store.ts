import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CostModel, Methodology, ProjectType, RoleType, Status, type Project, type User, type Sprint, type Story, type Task, type Risk } from "@ai-pm/core/domain";

export type ActiveView =
  | "dashboard" | "daily-brief" | "sprint" | "meeting"
  | "backlog" | "timeline" | "risks"
  | "code-review" | "reports"
  | "mcp-servers" | "agents" | "settings";

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  currentUser: User | null;
  currentSprint: Sprint | null;
  activeView: ActiveView;
  sidebarOpen: boolean;
  agentPanelOpen: boolean;
  isOnline: boolean;
  syncStatus: "synced" | "syncing" | "offline" | "conflict";
  
  initializeApp: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setCurrentUser: (user: User | null) => void;
  setCurrentSprint: (sprint: Sprint | null) => void;
  setActiveView: (view: ActiveView) => void;
  toggleSidebar: () => void;
  toggleAgentPanel: () => void;
  setOnlineStatus: (online: boolean) => void;
  setSyncStatus: (status: ProjectState["syncStatus"]) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      currentProject: null,
      projects: [],
      currentUser: null,
      currentSprint: null,
      activeView: "dashboard",
      sidebarOpen: true,
      agentPanelOpen: false,
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      syncStatus: "synced",

      initializeApp: async () => {
        const savedProjects = localStorage.getItem("ai-pm-projects");
        if (savedProjects) {
          const projects = JSON.parse(savedProjects);
          set({ projects });
          if (projects.length > 0) {
            set({ currentProject: projects[0] });
          }
        } else {
          // First visit: create a default project so the app is usable immediately
          const defaultProject: Project = {
            id: crypto.randomUUID(),
            name: "Dashboard (beta)",
            description: "Default project – MCP Server Manager",
            key: "DASH",
            type: ProjectType.SOFTWARE,
            methodology: Methodology.SCRUM,
            costModel: CostModel.FIXED_COST,
            startDate: new Date(),
            tags: ["dashboard", "mcp"],
            status: Status.IN_PROGRESS,
            healthScore: 100,
            settings: {
              workingDays: [1, 2, 3, 4, 5],
              hoursPerDay: 8,
              autoAssign: false,
              notifications: { email: true, slack: false, push: true, inApp: true, digestFrequency: "daily" },
              integrations: {}
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: "system",
            version: 1
          };
          set({ projects: [defaultProject], currentProject: defaultProject });
          localStorage.setItem("ai-pm-projects", JSON.stringify([defaultProject]));
        }
        
        const savedUser = localStorage.getItem("ai-pm-user");
        if (savedUser) {
          set({ currentUser: JSON.parse(savedUser) });
        } else {
          const defaultUser: User = {
            id: crypto.randomUUID(),
            email: "pm@example.com",
            name: "Project Manager",
            role: RoleType.PM,
            seniority: "SENIOR",
            skills: ["Project Management", "Agile", "Risk Management"],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            workingHours: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, schedule: [] },
            preferences: { theme: "dark", language: "en", dateFormat: "MM/DD/YYYY", timeFormat: "24h", notifications: { email: true, slack: false, push: true, inApp: true, digestFrequency: "daily" } },
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: "system",
            version: 1
          };
          set({ currentUser: defaultUser });
          localStorage.setItem("ai-pm-user", JSON.stringify(defaultUser));
        }

        if (typeof window !== "undefined") {
          window.addEventListener("online", () => set({ isOnline: true, syncStatus: "synced" }));
          window.addEventListener("offline", () => set({ isOnline: false, syncStatus: "offline" }));
        }
      },

      setCurrentProject: (project) => set({ currentProject: project }),
      setProjects: (projects) => { 
        set({ projects });
        localStorage.setItem("ai-pm-projects", JSON.stringify(projects));
      },
      setCurrentUser: (user) => { 
        set({ currentUser: user });
        if (user) localStorage.setItem("ai-pm-user", JSON.stringify(user));
      },
      setCurrentSprint: (sprint) => set({ currentSprint: sprint }),
      setActiveView: (view) => set({ activeView: view }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleAgentPanel: () => set((state) => ({ agentPanelOpen: !state.agentPanelOpen })),
      setOnlineStatus: (online) => set({ isOnline: online }),
      setSyncStatus: (syncStatus) => set({ syncStatus })
    }),
    { name: "ai-pm-store", partialize: (state) => ({ sidebarOpen: state.sidebarOpen, agentPanelOpen: state.agentPanelOpen }) }
  )
);
