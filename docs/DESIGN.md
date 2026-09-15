# Agito — Design

Visual identity and UX decisions. Product scope and data model live in
[PLAN.md](PLAN.md). If a decision changes, update this file in the same change.

## Identity

- **Name:** Agito
- **Theme:** dark only (for now)
- **Accent:** dark purple
- **Tone:** friendly but direct

## Terminology

Use these words everywhere — UI copy, code, database, docs, and MCP tools.

| Use | Don't use | Meaning |
|---|---|---|
| **Task feed** | notes, activity, comments, log | The timeline of written entries on a task, from the user or agents |
| **Feed entry** | note, comment | One item in the task feed |
| **Description** | context, notes | The user's own text on a task |
| **Estimate** | duration, effort | How long a task will take, stored in minutes |
| **List** | project, folder | A group of tasks |
| **Agent: do this** (label), **agent task** | auto task, AI task | A task the agent works on itself instead of scheduling time for the user |

## Color

Near-black background with a slight purple tint so the accent sits naturally.
Purple is reserved for actions and completion — everything else stays neutral,
so what to tap is always obvious.

| Token | Value | Use |
|---|---|---|
| `background` | `#121118` | Page |
| `surface` | `#1C1A26` | Inputs, cards |
| `border` | `#262433` | Row dividers |
| `border-strong` | `#3A3748` | Secondary button outlines |
| `text` | `#ECEAF4` | Primary text |
| `text-muted` | `#8C88A3` | Secondary text, placeholders |
| `text-faint` | `#5A5670` | Done tasks, section labels, empty checkboxes |
| `accent` | `#534AB7` | Primary buttons, checked state |
| `accent-strong` | `#3C3489` | Accent borders, toggles |
| `accent-soft` | `#AFA9EC` | Icons, task feed indicator |
| `due` | `#F0997B` on `#2A1B17` | Due date tag |

Green and red are reserved for finance (money in/out) later, so they are not
used as task accents.

## Type

System font stack for now (fast, no downloads). Headings use weight 500.

## Layout and components

- **Header:** "Agito" wordmark, list switcher, then a summary: "3 to do" and
  "About 3h 30m of work".
- **Quick add bar:** always visible, full width, purple arrow button. Enter adds
  the task instantly.
- **Add task details (optional):** "Agent: do this" switch, description, due
  date (+ optional time), estimate with a min/hr toggle (hidden when the switch
  is on), file drop area. Primary button "Add task",
  secondary "Cancel".
- **Task row:** 22px round checkbox, title, small metadata line (file count,
  task feed indicator), "Agent" tag for agent tasks (`accent-soft` on
  `accent-strong`), due tag, estimate.
- **Task feed indicator:** sparkle icon in `accent-soft`, e.g. "Claude added to
  the feed".
- **Agent thinks it's done (later):** a small indicator on a task when an agent
  has said in the task feed that it believes the work is done. Only the user
  can close the task.
- **Done today:** completed tasks move under the open list, struck through in
  `text-faint`.
- Tap targets at least 44px tall.

## Motion

Plain CSS only, no animation library.

- **Complete:** circle fills purple with a quick scale pop, check draws in, row
  fades and slides into "Done today".
- **Undo:** a toast with Undo for a few seconds after completing or deleting.
- **Add:** new task appears at the top with a short fade/slide.
- Respect `prefers-reduced-motion`.

## Copy

- Sentence case, contractions, verb-first buttons ("Add task").
- No "please", "successfully", or exclamation marks.
- Placeholders are examples or plain prompts: "Add a task",
  "Add context for you or your agents".

## Defaults chosen (revisit after first use)

- **Header summary:** kept — "3 to do" and "About 3h 30m of work".
- **Done tasks:** shown under the list as "Done today" (today in the viewer's
  time zone). Tapping a done task's check reopens it.
- **Font:** system font stack.

## Behavior details

- New tasks appear at the top of the list.
- Quick add saves instantly; failures roll back with a toast.
- Deleting waits 5 seconds (the undo window) before deleting for real.
- Tapping a task opens an edit sheet (native `<dialog>`) with the same fields
  plus Delete.
- Lists: switcher in the header; new lists are created from the same menu. The
  default list is named "Tasks" and can't be deleted.
