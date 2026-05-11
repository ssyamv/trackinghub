"use client";

import Link from "next/link";
import { CheckIcon, ChevronsUpDownIcon, FolderKanbanIcon } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ApiProject = {
  id: string;
  name: string;
  slug: string;
};

type ProjectsResponse = {
  ok: boolean;
  data?: {
    projects?: ApiProject[];
  };
};

export type ProjectSwitcherProject = ApiProject;

const DEFAULT_PROJECTS: ProjectSwitcherProject[] = [];
const LOCATION_CHANGE_EVENT = "trackinghub-location-change";
let cachedProjects: ProjectSwitcherProject[] | null = null;
let historyEventsPatched = false;

function projectIdFromUrl(url: URL) {
  return url.searchParams.get("project_id") ?? "";
}

function currentProjectId() {
  return typeof window === "undefined"
    ? ""
    : projectIdFromUrl(new URL(window.location.href));
}

function dispatchLocationChange() {
  window.setTimeout(() => {
    window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
  }, 0);
}

function patchHistoryEvents() {
  if (historyEventsPatched || typeof window === "undefined") {
    return;
  }

  historyEventsPatched = true;

  const patchMethod = (method: "pushState" | "replaceState") => {
    const original = window.history[method];

    window.history[method] = function patchedHistoryMethod(
      this: History,
      ...args: Parameters<History[typeof method]>
    ) {
      const result = original.apply(this, args);
      dispatchLocationChange();
      return result;
    } as History[typeof method];
  };

  patchMethod("pushState");
  patchMethod("replaceState");
}

function subscribeToLocationChange(onStoreChange: () => void) {
  patchHistoryEvents();
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(LOCATION_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(LOCATION_CHANGE_EVENT, onStoreChange);
  };
}

export function useCurrentProjectId() {
  return useSyncExternalStore(subscribeToLocationChange, currentProjectId, () => "");
}

function currentHref() {
  return typeof window === "undefined" ? "http://localhost/" : window.location.href;
}

function useCurrentHref() {
  return useSyncExternalStore(subscribeToLocationChange, currentHref, () => "http://localhost/");
}

export function buildProjectSwitchHref(currentHref: string, projectId: string) {
  const url = new URL(currentHref, "http://localhost");

  if (projectId) {
    url.searchParams.set("project_id", projectId);
  } else {
    url.searchParams.delete("project_id");
  }

  url.searchParams.delete("page");

  return `${url.pathname}${url.search}${url.hash}`;
}

function projectInitials(project: ProjectSwitcherProject) {
  const source = project.name.trim() || project.slug;
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length > 1 && words.every((word) => /^[a-z0-9]/i.test(word))) {
    return words
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return Array.from(source)
    .filter((char) => char.trim())
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function projectById(projects: ProjectSwitcherProject[], projectId: string) {
  return projects.find((project) => project.id === projectId);
}

export function ProjectSwitcher({
  initialProjects = DEFAULT_PROJECTS,
}: {
  initialProjects?: ProjectSwitcherProject[];
}) {
  const [projects, setProjects] = useState<ProjectSwitcherProject[]>(
    () => cachedProjects ?? initialProjects,
  );
  const [hasLoadedProjects, setHasLoadedProjects] = useState(
    () => Boolean(cachedProjects) || initialProjects.length > 0,
  );
  const selectedProjectId = useCurrentProjectId();
  const href = useCurrentHref();
  const selectedProject = projectById(projects, selectedProjectId);
  const isLoading = !hasLoadedProjects && projects.length === 0;
  const isEmpty = hasLoadedProjects && projects.length === 0;
  const selectedLabel = isEmpty
    ? "暂无项目"
    : selectedProject?.name ?? (selectedProjectId ? "当前项目" : "全部项目");
  const selectedMeta = isEmpty
    ? "先配置 Postgres 元数据"
    : selectedProject?.slug ?? (selectedProjectId ? "来自当前筛选条件" : "查看所有项目数据");
  const projectOptions = useMemo(() => {
    if (
      selectedProjectId &&
      !projects.some((project) => project.id === selectedProjectId)
    ) {
      return [
        {
          id: selectedProjectId,
          name: "当前项目",
          slug: "来自当前筛选条件",
        },
        ...projects,
      ];
    }

    return projects;
  }, [projects, selectedProjectId]);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        const response = await fetch("/api/projects", {
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (!cancelled) {
            setHasLoadedProjects(true);
          }
          return;
        }

        const payload = (await response.json()) as ProjectsResponse;
        const nextProjects = payload.data?.projects ?? [];

        if (!cancelled) {
          cachedProjects = nextProjects;
          setProjects(nextProjects);
          setHasLoadedProjects(true);
        }
      } catch {
        if (!cancelled) {
          setProjects(initialProjects);
          setHasLoadedProjects(true);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [initialProjects]);

  return (
    <div className="grid min-h-[76px] gap-1.5 text-xs font-medium text-sidebar-foreground/70">
      <span>当前项目</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isLoading}>
          <Button
            aria-label="切换项目"
            className="h-12 w-full justify-between rounded-lg border-sidebar-border bg-sidebar px-2 text-left shadow-xs hover:border-sidebar-foreground/25 hover:bg-sidebar-accent/45 disabled:opacity-100"
            variant="outline"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[0.7rem] font-bold text-sidebar-foreground ring-1 ring-primary/25">
                {isLoading ? (
                  <FolderKanbanIcon className="size-4 text-sidebar-foreground/55" />
                ) : selectedProject ? (
                  projectInitials(selectedProject)
                ) : (
                  "全"
                )}
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate text-sm font-semibold text-sidebar-foreground">
                  {isLoading ? "正在加载项目" : selectedLabel}
                </span>
                <span className="truncate text-[0.7rem] font-normal text-sidebar-foreground/55">
                  {isLoading ? "保持侧栏布局稳定" : selectedMeta}
                </span>
              </span>
            </span>
            <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 text-sidebar-foreground/50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg border border-sidebar-border bg-sidebar p-1.5 text-sidebar-foreground shadow-lg"
        >
          <DropdownMenuLabel className="px-2 py-1.5 text-[0.7rem] text-sidebar-foreground/55">
            选择项目范围
          </DropdownMenuLabel>
          <DropdownMenuItem asChild className="gap-2 px-2 py-2">
            <Link href={buildProjectSwitchHref(href, "")}>
              <span className="flex size-7 items-center justify-center rounded-md bg-sidebar-accent text-xs font-bold">
                全
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate font-medium">全部项目</span>
                <span className="truncate text-xs text-sidebar-foreground/55">
                  查看全局汇总
                </span>
              </span>
              <CheckIcon
                className={cn(
                  "ml-auto size-4 text-primary",
                  selectedProjectId ? "opacity-0" : "opacity-100",
                )}
              />
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-sidebar-border" />
          {projectOptions.map((project) => (
            <DropdownMenuItem
              asChild
              className="gap-2 px-2 py-2"
              key={project.id}
            >
              <Link href={buildProjectSwitchHref(href, project.id)}>
                <span className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-[0.65rem] font-bold ring-1 ring-primary/20">
                  {projectInitials(project)}
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate font-medium">{project.name}</span>
                  <span className="truncate text-xs text-sidebar-foreground/55">
                    {project.slug}
                  </span>
                </span>
                <CheckIcon
                  className={cn(
                    "ml-auto size-4 text-primary",
                    selectedProjectId === project.id ? "opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
