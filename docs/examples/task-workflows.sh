#!/bin/bash

# MindMux Example Task Workflows
# Run these examples to see MindMux in action

set -e

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}MindMux Task Workflow Examples${NC}\n"

# ============================================================================
# Workflow 1: Code Generation and Review
# ============================================================================

workflow_1_code_generation_and_review() {
  echo -e "${GREEN}Workflow 1: Code Generation and Review${NC}"
  echo "This workflow creates two agents: one for generation, one for review"
  echo ""

  # Create code generator
  echo "1. Creating code generator agent..."
  mux agent:create code-gen-v1 --type claude --capabilities code-generation || echo "Agent may already exist"

  # Create code reviewer
  echo "2. Creating code reviewer agent..."
  mux agent:create code-reviewer-v1 --type claude --capabilities code-review || echo "Agent may already exist"

  # Start both
  echo "3. Starting agents..."
  mux agent:start code-gen-v1 code-reviewer-v1

  # List agents
  echo "4. Listing agents..."
  mux agent:list

  # Show status
  echo "5. Agent status:"
  mux agent:status code-gen-v1
  echo ""
  mux agent:status code-reviewer-v1

  # View logs
  echo "6. Viewing logs (last 5 lines)..."
  mux agent:logs code-gen-v1 --lines 5

  echo -e "\n${GREEN}Workflow 1 complete!${NC}\n"
}

# ============================================================================
# Workflow 2: Multi-Agent Testing Suite
# ============================================================================

workflow_2_testing_suite() {
  echo -e "${GREEN}Workflow 2: Multi-Agent Testing Suite${NC}"
  echo "This workflow creates testing specialists"
  echo ""

  # Create test runner
  echo "1. Creating test runner..."
  mux agent:create test-runner --type gemini --capabilities testing || echo "Agent may already exist"

  # Create debugger
  echo "2. Creating debugger..."
  mux agent:create debugger-bot --type claude --capabilities debugging || echo "Agent may already exist"

  # Start both
  echo "3. Starting agents..."
  mux agent:start test-runner debugger-bot

  # Show agents
  echo "4. Testing agents:"
  mux agent:list --verbose

  echo -e "\n${GREEN}Workflow 2 complete!${NC}\n"
}

# ============================================================================
# Workflow 3: Documentation Generation
# ============================================================================

workflow_3_documentation() {
  echo -e "${GREEN}Workflow 3: Documentation Generation${NC}"
  echo "This workflow creates documentation specialists"
  echo ""

  # Create researcher
  echo "1. Creating researcher..."
  mux agent:create researcher --type claude --capabilities research || echo "Agent may already exist"

  # Create documenter
  echo "2. Creating documenter..."
  mux agent:create doc-writer --type claude --capabilities documentation || echo "Agent may already exist"

  # Start both
  echo "3. Starting agents..."
  mux agent:start researcher doc-writer

  # Status check
  echo "4. Checking status..."
  mux agent:status researcher
  echo ""
  mux agent:status doc-writer

  echo -e "\n${GREEN}Workflow 3 complete!${NC}\n"
}

# ============================================================================
# Workflow 4: Project-Specific Configuration
# ============================================================================

workflow_4_project_config() {
  echo -e "${GREEN}Workflow 4: Project-Specific Configuration${NC}"
  echo "This workflow demonstrates project-local configuration"
  echo ""

  # Create project config
  echo "1. Creating project configuration..."
  mkdir -p .mindmux
  cat > .mindmux/config.json << 'EOF'
{
  "maxConcurrentAgents": 3,
  "timeout": 1800000,
  "logging": {
    "level": "info"
  }
}
EOF

  echo "2. Project config created at .mindmux/config.json"
  cat .mindmux/config.json

  # Show merged config
  echo "3. Merged configuration (project overrides global):"
  mux config:show

  echo -e "\n${GREEN}Workflow 4 complete!${NC}\n"
}

# ============================================================================
# Workflow 5: Cleanup and Reset
# ============================================================================

workflow_5_cleanup() {
  echo -e "${GREEN}Workflow 5: Cleanup and Reset${NC}"
  echo "This workflow stops and removes agents"
  echo ""

  # List agents
  echo "1. Current agents:"
  mux agent:list

  # Stop all agents
  echo "2. Stopping all agents..."
  mux agent:stop --all

  # Delete agents
  echo "3. Deleting workflow agents..."
  mux agent:delete code-gen-v1 --yes 2>/dev/null || true
  mux agent:delete code-reviewer-v1 --yes 2>/dev/null || true
  mux agent:delete test-runner --yes 2>/dev/null || true
  mux agent:delete debugger-bot --yes 2>/dev/null || true
  mux agent:delete researcher --yes 2>/dev/null || true
  mux agent:delete doc-writer --yes 2>/dev/null || true

  # Verify cleanup
  echo "4. Remaining agents:"
  mux agent:list

  echo -e "\n${GREEN}Workflow 5 complete!${NC}\n"
}

# ============================================================================
# Main Menu
# ============================================================================

show_menu() {
  echo "Choose a workflow to run:"
  echo ""
  echo "1. Code Generation and Review"
  echo "2. Multi-Agent Testing Suite"
  echo "3. Documentation Generation"
  echo "4. Project-Specific Configuration"
  echo "5. Cleanup and Reset"
  echo "6. Run all workflows"
  echo "0. Exit"
  echo ""
  read -p "Enter choice [0-6]: " choice
}

# Main
if [ $# -eq 1 ]; then
  choice=$1
else
  show_menu
fi

case $choice in
  1) workflow_1_code_generation_and_review ;;
  2) workflow_2_testing_suite ;;
  3) workflow_3_documentation ;;
  4) workflow_4_project_config ;;
  5) workflow_5_cleanup ;;
  6)
    workflow_1_code_generation_and_review
    workflow_2_testing_suite
    workflow_3_documentation
    workflow_4_project_config
    workflow_5_cleanup
    ;;
  0) echo "Exiting" ;;
  *) echo "Invalid option" ;;
esac
