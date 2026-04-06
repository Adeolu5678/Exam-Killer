---
name: claude-flow
description: Orchestrate multi-agent swarms using RuFlo V3. Use this skill when complex, multi-step tasks require specialized agents (coder, reviewer, tester, researcher) working in coordination. It provides hierarchical and mesh topologies, vector memory, and self-learning hooks.
---

# Claude-Flow / RuFlo V3 Agentic Orchestration

This skill enables Antigravity to utilize the **RuFlo V3** (formerly Claude-Flow) framework for advanced multi-agent orchestration.

## Core Capabilities

- **Swarm Topologies**: Choose between `hierarchical`, `mesh`, `hierarchical-mesh`, `ring`, `star`, or `adaptive`.
- **Specialized Agents**: Over 60 specialized agent types (e.g., `coder`, `reviewer`, `security-auditor`, `perf-analyzer`).
- **Memory (RuVector)**: Uses HNSW vector search for fast pattern retrieval and SONA for neural learning.
- **Hive-Mind Consensus**: Implements Byzantine Fault Tolerance for critical decisions.
- **Hooks System**: 27 available hooks for pre/post-command, task, and session management.

## Usage Guidelines

When a task is complex or requires deep specialized knowledge across multiple files:

1. **Initialize or Check Swarm**:

   ```bash
   ruflo swarm status
   ```

2. **Select Topology**:
   - Use `hierarchical-mesh` for 10+ agents (default for V3).
   - Use `mesh` for bug fixes or collaborative refactoring.
   - Use `hierarchical` for new features or security-sensitive work.

3. **Spawn Specialized Agents**:

   ```bash
   ruflo agent spawn -t coder --name feature-coder
   ruflo agent spawn -t reviewer --name code-reviewer
   ```

4. **Assign Tasks**:

   ```bash
   ruflo task assign --agent feature-coder --description "Implement payment gateway"
   ```

5. **Utilize Memory**:
   Use `ruflo memory search` to retrieve past patterns or `ruflo memory store` to record successful implementations.

## Diagnostics and Health

If the orchestration layer behaves unexpectedly, run:

```bash
ruflo doctor --fix
```

## Integration with Antigravity

Antigravity acts as the **Primary Orchestrator** (Queen). Sub-tasks identified in Implementation Plans can be routed to `ruflo` agents for parallel execution or specialized deep-dives.
