/**
 * Parse conversation history from tmux scrollback
 */

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Parse conversation history from tmux output
 *
 * Detects user prompts and AI responses based on common patterns
 */
export function parseConversation(output: string): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  const lines = output.split('\n');

  let currentRole: 'user' | 'assistant' | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Detect user prompts (usually start with >, User:, or specific markers)
    if (line.trim().startsWith('>') || line.includes('User:')) {
      // Save previous turn
      if (currentRole && currentContent.length > 0) {
        turns.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
        });
      }

      // Start new user turn
      currentRole = 'user';
      currentContent = [line.replace(/^>\s*/, '').replace(/User:\s*/, '')];
    }
    // Detect AI responses (usually longer blocks, or start with AI:, Assistant:)
    else if (line.includes('AI:') || line.includes('Assistant:')) {
      // Save previous turn
      if (currentRole && currentContent.length > 0) {
        turns.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
        });
      }

      // Start new assistant turn
      currentRole = 'assistant';
      currentContent = [line.replace(/AI:\s*/, '').replace(/Assistant:\s*/, '')];
    }
    // Continue current turn
    else if (currentRole && line.trim()) {
      currentContent.push(line);
    }
  }

  // Save final turn
  if (currentRole && currentContent.length > 0) {
    turns.push({
      role: currentRole,
      content: currentContent.join('\n').trim(),
    });
  }

  return turns;
}

/**
 * Format conversation for context injection
 *
 * Converts turns into prompt format suitable for AI tool
 * Truncates if too long to keep recent history
 */
export function formatConversationContext(turns: ConversationTurn[], maxLength: number = 4000): string {
  let context = 'Previous conversation:\n\n';

  for (const turn of turns) {
    const prefix = turn.role === 'user' ? 'User: ' : 'AI: ';
    context += `${prefix}${turn.content}\n\n`;
  }

  // Truncate if too long (keep recent history)
  if (context.length > maxLength) {
    const recentTurns = turns.slice(-10); // Keep last 10 turns
    context = 'Recent conversation:\n\n';
    for (const turn of recentTurns) {
      const prefix = turn.role === 'user' ? 'User: ' : 'AI: ';
      context += `${prefix}${turn.content}\n\n`;
    }
  }

  context += 'Please continue from this context.';

  return context;
}
