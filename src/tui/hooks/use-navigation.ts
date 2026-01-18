/**
 * Navigation state hook
 */

import { useState, useCallback } from 'react';
import { ViewType, ModalType, NavigationState } from '../types';

const initialState: NavigationState = {
  currentView: 'agents',
  activeModal: 'none',
  selectedAgentId: null,
  selectedTaskId: null,
  filterText: '',
};

export interface UseNavigationResult {
  state: NavigationState;
  switchView: (view: ViewType) => void;
  toggleView: () => void;
  openModal: (modal: ModalType, id?: string) => void;
  closeModal: () => void;
  setFilter: (text: string) => void;
  selectAgent: (id: string | null) => void;
  selectTask: (id: string | null) => void;
}

export function useNavigation(): UseNavigationResult {
  const [state, setState] = useState<NavigationState>(initialState);

  const switchView = useCallback((view: ViewType) => {
    setState(prev => ({ ...prev, currentView: view }));
  }, []);

  const toggleView = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentView: prev.currentView === 'agents' ? 'tasks' : 'agents',
    }));
  }, []);

  const openModal = useCallback((modal: ModalType, id?: string) => {
    setState(prev => ({
      ...prev,
      activeModal: modal,
      selectedAgentId: modal === 'agent-detail' ? (id || prev.selectedAgentId) : prev.selectedAgentId,
      selectedTaskId: modal === 'task-detail' ? (id || prev.selectedTaskId) : prev.selectedTaskId,
    }));
  }, []);

  const closeModal = useCallback(() => {
    setState(prev => ({ ...prev, activeModal: 'none' }));
  }, []);

  const setFilter = useCallback((text: string) => {
    setState(prev => ({ ...prev, filterText: text }));
  }, []);

  const selectAgent = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedAgentId: id }));
  }, []);

  const selectTask = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedTaskId: id }));
  }, []);

  return {
    state,
    switchView,
    toggleView,
    openModal,
    closeModal,
    setFilter,
    selectAgent,
    selectTask,
  };
}
