/**
 * Main TUI application component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Header } from './components/header';
import { AgentList } from './components/agent-list';
import { TaskList } from './components/task-list';
import { StatusBar } from './components/status-bar';
import { Modal } from './components/modal';
import { useAgents } from './hooks/use-agents';
import { useTasks } from './hooks/use-tasks';
import { useNavigation } from './hooks/use-navigation';
import { useRefresh } from './hooks/use-refresh';
import { getTuiBridge } from './bridge/tui-bridge';
import { DEFAULT_TUI_CONFIG } from './types';

export function App(): React.ReactElement {
  const { exit } = useApp();
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { state: nav, toggleView, openModal, closeModal, selectAgent, selectTask } = useNavigation();
  const { agents, refresh: refreshAgents, startAgent, stopAgent, deleteAgent } = useAgents();
  const { tasks, stats, refresh: refreshTasks, cancelTask } = useTasks();

  const [agentIndex, setAgentIndex] = useState(0);
  const [taskIndex, setTaskIndex] = useState(0);

  // Initialize bridge
  useEffect(() => {
    const init = async () => {
      try {
        const bridge = getTuiBridge();
        await bridge.initialize();
        setInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      }
    };
    init();
  }, []);

  // Combined refresh
  const refresh = useCallback(() => {
    refreshAgents();
    refreshTasks();
  }, [refreshAgents, refreshTasks]);

  // Auto-refresh
  useRefresh(refresh, {
    intervalMs: DEFAULT_TUI_CONFIG.refreshInterval,
    enabled: initialized && nav.activeModal === 'none',
  });

  // Global key bindings
  useInput((input: string, key: any) => {
    // Quit
    if (input === 'q' && nav.activeModal === 'none') {
      exit();
    }

    // Tab to switch views
    if (key.tab && nav.activeModal === 'none') {
      toggleView();
      setAgentIndex(0);
      setTaskIndex(0);
    }

    // Escape to close modal
    if (key.escape && nav.activeModal !== 'none') {
      closeModal();
    }

    // New task (placeholder)
    if (input === 'n' && nav.activeModal === 'none') {
      // Placeholder: Would open new-task modal
    }

    // New agent (placeholder)
    if (input === 'a' && nav.activeModal === 'none' && nav.currentView === 'agents') {
      // Placeholder: Would open new-agent modal
    }

    // Attach to tmux
    if (input === 't' && nav.activeModal === 'none' && nav.currentView === 'agents') {
      const agent = agents[agentIndex];
      if (agent && agent.isRunning && agent.sessionName) {
        // Exit TUI and attach to tmux
        exit();
        const bridge = getTuiBridge();
        bridge.attachToSession(agent.id).catch(console.error);
      }
    }

    // Refresh
    if (input === 'r' && nav.activeModal === 'none') {
      refresh();
    }
  });

  // Loading state
  if (!initialized) {
    return (
      <Box>
        <Text color="yellow">Initializing MindMux TUI...</Text>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text color="gray">Press any key to exit.</Text>
      </Box>
    );
  }

  const runningCount = agents.filter(a => a.isRunning).length;

  return (
    <Box flexDirection="column" height="100%">
      <Header runningCount={runningCount} />

      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        <Box marginBottom={1}>
          <Text color={nav.currentView === 'agents' ? 'cyan' : 'gray'} bold={nav.currentView === 'agents'}>
            Agents
          </Text>
          <Text color="gray"> │ </Text>
          <Text color={nav.currentView === 'tasks' ? 'cyan' : 'gray'} bold={nav.currentView === 'tasks'}>
            Tasks
          </Text>
          <Text color="gray"> (Tab to switch)</Text>
        </Box>

        {nav.currentView === 'agents' ? (
          <AgentList
            agents={agents}
            selectedIndex={agentIndex}
            onSelect={setAgentIndex}
            onEnter={(id) => {
              selectAgent(id);
              openModal('agent-detail', id);
            }}
            onStart={startAgent}
            onStop={stopAgent}
          />
        ) : (
          <TaskList
            tasks={tasks}
            agents={agents}
            selectedIndex={taskIndex}
            onSelect={setTaskIndex}
            onEnter={(id) => {
              selectTask(id);
              openModal('task-detail', id);
            }}
            onCancel={cancelTask}
          />
        )}
      </Box>

      <StatusBar stats={stats} currentView={nav.currentView} />

      {/* Modals rendered as overlays */}
      {nav.activeModal === 'agent-detail' && nav.selectedAgentId && (
        <Box position="absolute" marginTop={5}>
          <Modal title="Agent Details">
            <AgentDetailContent
              agentId={nav.selectedAgentId}
              agents={agents}
              onStart={startAgent}
              onStop={stopAgent}
              onDelete={async (id) => {
                await deleteAgent(id);
                closeModal();
              }}
              onClose={closeModal}
            />
          </Modal>
        </Box>
      )}

      {nav.activeModal === 'task-detail' && nav.selectedTaskId && (
        <Box position="absolute" marginTop={5}>
          <Modal title="Task Details">
            <TaskDetailContent
              taskId={nav.selectedTaskId}
              tasks={tasks}
              agents={agents}
              onCancel={cancelTask}
              onClose={closeModal}
            />
          </Modal>
        </Box>
      )}
    </Box>
  );
}

// Agent detail content (inline for now, can extract later)
function AgentDetailContent({
  agentId,
  agents,
  onStart,
  onStop,
  onDelete,
}: {
  agentId: string;
  agents: any[];
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}): React.ReactElement {
  const agent = agents.find(a => a.id === agentId);

  useInput((input: string) => {
    if (input === 's' && agent && !agent.isRunning) {
      onStart(agent.id);
    }
    if (input === 'x' && agent && agent.isRunning) {
      onStop(agent.id);
    }
    if (input === 'd' && agent) {
      onDelete(agent.id);
    }
  });

  if (!agent) {
    return <Text color="red">Agent not found</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text>Name:         <Text bold>{agent.name}</Text></Text>
      <Text>ID:           <Text color="gray">{agent.id}</Text></Text>
      <Text>Type:         {agent.type}</Text>
      <Text>Status:       <Text color={agent.isRunning ? 'green' : 'gray'}>{agent.status}</Text></Text>
      <Text>Session:      {agent.sessionName || '-'}</Text>
      <Text>Capabilities: {agent.capabilities.join(', ') || '-'}</Text>
      <Text>Model:        {agent.config.model}</Text>
      <Text>Created:      {agent.createdAt}</Text>
      <Box marginTop={1}>
        {!agent.isRunning && <Text color="cyan">[s]tart </Text>}
        {agent.isRunning && <Text color="cyan">[x]stop </Text>}
        <Text color="red">[d]elete</Text>
      </Box>
    </Box>
  );
}

// Task detail content
function TaskDetailContent({
  taskId,
  tasks,
  agents,
  onCancel,
  onClose,
}: {
  taskId: string;
  tasks: any[];
  agents: any[];
  onCancel: (id: string) => void;
  onClose: () => void;
}): React.ReactElement {
  const task = tasks.find(t => t.id === taskId);
  const agent = task?.agentId ? agents.find(a => a.id === task.agentId) : null;

  useInput((input: string) => {
    if (input === 'c' && task && (task.status === 'pending' || task.status === 'queued')) {
      onCancel(task.id);
      onClose();
    }
  });

  if (!task) {
    return <Text color="red">Task not found</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text>ID:       <Text color="gray">{task.id}</Text></Text>
      <Text>Status:   <Text color={task.status === 'completed' ? 'green' : task.status === 'failed' ? 'red' : 'yellow'}>{task.status}</Text></Text>
      <Text>Priority: {task.priority}</Text>
      <Text>Agent:    {agent?.name || '-'}</Text>
      <Text>Retries:  {task.retryCount}/{task.maxRetries}</Text>
      <Box marginTop={1}>
        <Text bold>Prompt:</Text>
      </Box>
      <Text color="gray">{task.prompt.slice(0, 200)}{task.prompt.length > 200 ? '...' : ''}</Text>
      {task.result && (
        <>
          <Box marginTop={1}><Text bold color="green">Result:</Text></Box>
          <Text color="gray">{task.result.slice(0, 200)}{task.result.length > 200 ? '...' : ''}</Text>
        </>
      )}
      {task.error && (
        <>
          <Box marginTop={1}><Text bold color="red">Error:</Text></Box>
          <Text color="red">{task.error}</Text>
        </>
      )}
      {(task.status === 'pending' || task.status === 'queued') && (
        <Box marginTop={1}>
          <Text color="cyan">[c]ancel</Text>
        </Box>
      )}
    </Box>
  );
}
