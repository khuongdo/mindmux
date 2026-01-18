/**
 * TUI-specific type definitions
 */

export type ViewType = 'agents' | 'tasks';
export type ModalType = 'none' | 'agent-detail' | 'task-detail' | 'new-agent' | 'new-task';

export interface NavigationState {
  currentView: ViewType;
  activeModal: ModalType;
  selectedAgentId: string | null;
  selectedTaskId: string | null;
  filterText: string;
}

export interface RefreshConfig {
  intervalMs: number;
  enabled: boolean;
}

export interface TuiConfig {
  refreshInterval: number;  // ms
  maxVisibleAgents: number;
  maxVisibleTasks: number;
  showCompletedTasks: boolean;
}

export const DEFAULT_TUI_CONFIG: TuiConfig = {
  refreshInterval: 1000,
  maxVisibleAgents: 10,
  maxVisibleTasks: 20,
  showCompletedTasks: false,
};
