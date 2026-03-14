# 📤 HANDOFF TEMPLATE

> Use this template when pausing a task or passing work to the next agent.
> Save as: `.agent/handoffs/TASK-XXX-YYYY-MM-DD-HHMM.md`

---

```markdown
# Handoff Report: [Task Title]

## 📋 Task Reference

| Field             | Value                                       |
| ----------------- | ------------------------------------------- |
| **Task ID**       | TASK-XXX                                    |
| **Priority**      | P[0-4]                                      |
| **Status**        | ⏸️ PAUSED / 🔄 IN PROGRESS                  |
| **Date**          | YYYY-MM-DD HH:MM                            |
| **Agent Session** | [Optional: Session identifier if available] |

---

## 🎯 Summary

[1-2 sentence description of what this task aims to accomplish]

---

## ✅ What Was Completed

### Changes Made

- [Specific completed item 1]
- [Specific completed item 2]
- [Include file paths with line numbers where helpful]

### Files Modified

| File                | Changes                            |
| ------------------- | ---------------------------------- |
| `path/to/file1.ts`  | Added function X, modified class Y |
| `path/to/file2.tsx` | Updated component to handle Z      |

### Tests/Verification Done

- [What was tested]
- [Results of testing]

---

## ⏳ What Remains

- [ ] [Remaining item 1]
- [ ] [Remaining item 2]
- [ ] [Remaining item 3]

Estimated remaining effort: [Small/Medium/Large]

---

## 🧠 Context for Next Agent

### Key Decisions Made

1. **[Decision 1]**: [Why this approach was chosen]
2. **[Decision 2]**: [Rationale]

### Patterns to Follow

- [Pattern or convention established]
- [Coding style notes]

### Important Notes

- [Critical information]
- [Gotchas or non-obvious issues]

### Relevant Documentation/Links

- [Link or file reference]

---

## 🚧 Blockers (if any)

| Blocker     | Impact           | Possible Resolution |
| ----------- | ---------------- | ------------------- |
| [Blocker 1] | [What it blocks] | [How to resolve]    |

---

## ➡️ Recommended Next Steps

1. **First**: [Most important next action]
2. **Then**: [Follow-up action]
3. **Finally**: [Completion steps]

### Quick Start for Next Agent
```

1. Read this entire handoff
2. View these key files: [list 2-3 most relevant files]
3. Start with: [specific first action]

```

---

## 📎 Related Files

- Context file: `.agent/contexts/TASK-XXX.md` (if exists)
- Previous handoffs: [list if any]
- Task registry: `.agent/docs/task-registry.md`
```

---

## 📝 Usage Notes

### When to Create a Handoff

Create a handoff when:

- ✅ Pausing work before task completion
- ✅ Significant progress made but more remains
- ✅ Hitting complexity that needs fresh perspective
- ✅ Context/memory is getting heavy
- ✅ Encountering blockers that need resolution

### Quality Checklist

Before saving, verify:

- [ ] Summary is clear and concise
- [ ] All modified files are listed
- [ ] Remaining work is actionable
- [ ] Context includes key decisions
- [ ] Next steps are specific
- [ ] A new agent could continue without asking questions

### Naming Convention

```
.agent/handoffs/TASK-XXX-YYYY-MM-DD-HHMM.md
```

Example: `TASK-005-2024-01-15-1430.md`

Multiple handoffs for same task are fine (shows progression).
