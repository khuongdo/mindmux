/**
 * Agent creation wizard component
 * Phase 5.5: Interactive agent creation
 */

import { colors } from '../utils/colors.js';
import { center } from '../utils/formatters.js';

export interface WizardState {
  step: number;
  name: string;
  type: string;
  capabilities: string[];
  model: string;
}

export interface WizardRenderOptions {
  selectedIndex?: number;
}

export const AVAILABLE_TYPES = [
  'claude',
  'gemini',
  'opencode',
  'gpt4',
];

export const AVAILABLE_MODELS = [
  'default',
  'sonnet',
  'opus',
  'haiku',
];

export const AVAILABLE_CAPABILITIES = [
  'code-generation',
  'code-review',
  'testing',
  'documentation',
  'debugging',
  'refactoring',
];

/**
 * Render creation wizard screen
 */
export function renderCreationWizard(state: WizardState, width: number, selectedIndex: number = 0): string[] {
  const lines: string[] = [];

  // Title
  lines.push('');
  lines.push(colors.header(center('Create New Agent', width)));
  lines.push(colors.dim('─'.repeat(width)));
  lines.push('');

  // Progress indicator
  const totalSteps = 5;
  const progress = `Step ${state.step + 1}/${totalSteps}`;
  lines.push(colors.dim(`  ${progress}`));
  lines.push('');

  // Step content
  switch (state.step) {
    case 0:
      renderNameStep(lines, state);
      break;
    case 1:
      renderTypeStep(lines, state);
      break;
    case 2:
      renderCapabilitiesStep(lines, state, selectedIndex);
      break;
    case 3:
      renderModelStep(lines, state);
      break;
    case 4:
      renderReviewStep(lines, state);
      break;
  }

  lines.push('');
  lines.push(colors.dim('─'.repeat(width)));
  lines.push(colors.dim(center('Type to input | Enter: next | Esc: cancel', width)));
  lines.push('');

  return lines;
}

function renderNameStep(lines: string[], state: WizardState): void {
  lines.push(colors.header('  Agent Name:'));
  lines.push('');
  lines.push(`  > ${state.name}_`);
  lines.push('');
  lines.push(colors.dim('  Enter a unique name for your agent'));
}

function renderTypeStep(lines: string[], state: WizardState): void {
  lines.push(colors.header('  Agent Type:'));
  lines.push('');

  AVAILABLE_TYPES.forEach(type => {
    const marker = type === state.type ? '●' : '○';
    const color = type === state.type ? colors.success : colors.dim;
    lines.push(color(`  ${marker} ${type}`));
  });

  lines.push('');
  lines.push(colors.dim('  Use ↑/↓ to select, Enter to confirm'));
}

function renderCapabilitiesStep(lines: string[], state: WizardState, selectedIndex: number): void {
  lines.push(colors.header('  Capabilities (select multiple):'));
  lines.push('');

  AVAILABLE_CAPABILITIES.forEach((cap, index) => {
    const selected = state.capabilities.includes(cap);
    const marker = selected ? '☑' : '☐';
    const isHighlighted = index === selectedIndex;

    let line = `  ${marker} ${cap}`;
    if (isHighlighted) {
      line = colors.highlight(line);
    } else if (selected) {
      line = colors.success(line);
    } else {
      line = colors.dim(line);
    }

    lines.push(line);
  });

  lines.push('');
  lines.push(colors.dim('  Use ↑/↓ to navigate, Space to toggle, Enter to confirm'));
}

function renderModelStep(lines: string[], state: WizardState): void {
  lines.push(colors.header('  Model:'));
  lines.push('');

  AVAILABLE_MODELS.forEach(model => {
    const marker = model === state.model ? '●' : '○';
    const color = model === state.model ? colors.success : colors.dim;
    lines.push(color(`  ${marker} ${model}`));
  });

  lines.push('');
  lines.push(colors.dim('  Use ↑/↓ to select, Enter to confirm'));
}

function renderReviewStep(lines: string[], state: WizardState): void {
  lines.push(colors.header('  Review Configuration:'));
  lines.push('');
  lines.push(`  Name:         ${state.name}`);
  lines.push(`  Type:         ${state.type}`);
  lines.push(`  Capabilities: ${state.capabilities.join(', ') || 'none'}`);
  lines.push(`  Model:        ${state.model}`);
  lines.push('');
  lines.push(colors.success('  Press Enter to create agent'));
}
