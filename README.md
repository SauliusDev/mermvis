<div align="center">
  <img src="https://raw.githubusercontent.com/SauliusDev/mermvis/master/mermvis-banner.png" alt="Mermvis Banner" width="400" />
</div>

<br />

<div align="center">

![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-007ACC?style=flat-square&logo=visualstudiocode&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Mermaid](https://img.shields.io/badge/Mermaid-Diagram-FF3670?style=flat-square&logo=mermaid&logoColor=white)
![Release](https://img.shields.io/badge/Release-v0.1.0-22C55E?style=flat-square)
![License](https://img.shields.io/badge/License-BUSL%201.1-F59E0B?style=flat-square)

</div>

## What is Mermvis?

Mermvis is a VS Code extension that lets you build and edit [Mermaid.js](https://mermaid.js.org) diagrams visually — no syntax writing required. Drag nodes, connect edges, configure layouts, and export clean `.mmd` files. All inside your editor.

In the age of AI-assisted development, having a **clear, crystalized visual blueprint** of your system is essential. LLMs work best when given structured, precise context — not vague descriptions. Mermvis bridges the gap between human visual thinking and machine-readable system models.

> Draw your system. Export the blueprint. Feed it to your AI.

## Features

### Three Views, One Editor

| View | Description |
|------|-------------|
| **Code** | Full syntax editor with Mermaid highlighting |
| **Preview** | Live rendered diagram with theme and curve controls |
| **Canvas** | Infinite drag-and-drop canvas — Miro-style visual editing |

### Canvas Editing
- Drag nodes from the sidebar onto the canvas
- Connect nodes via directional handles (top / bottom / left / right)
- 14 node shapes — Rectangle, Rounded, Diamond, Stadium, Circle, Hexagon, Cylinder, and more
- Inline label editing — double-click any node or edge
- Undo / Redo with full history stack

### Diagram Controls
- Layout direction — Top-to-Bottom, Left-to-Right, Bottom-to-Top, Right-to-Left
- Mermaid themes — default, dark, forest, neutral, base
- Hand-drawn mode toggle
- 12 curve routing styles
- Auto-layout powered by Dagre

### Import & Export
- Import `.mmd` Mermaid syntax directly to canvas
- Export `.mmd`, `.svg`, and canvas `.json`
- Copy syntax to clipboard in one click

### VS Code Integration
- Respects your VS Code dark / light theme automatically
- Custom Mermvis dark and light themes available
- Configurable keybindings for node placement and actions
- Inspector panel — click any node to edit its properties

## Roadmap

### Near-term
- [ ] Subgraph support
- [ ] Sequence diagram support
- [ ] Mindmap support
- [ ] Split-insert — drag a node onto a connection to insert it in between

### Medium-term
- [ ] Class diagram support
- [ ] ER diagram support
- [ ] State diagram support
- [ ] Custom theme editor — import, modify, and export themes

### Long-term
- [ ] AI-assisted diagram generation — describe a system, get a diagram
- [ ] Team sync and shared diagrams via cloud companion
- [ ] BMAD / agentic workflow integration — auto-generate epics and stories from diagrams
- [ ] Real-time collaboration

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) |
| Visual Canvas | React Flow (XY Flow) |
| Mermaid Render | mermaid.js |
| State | Zustand |
| Styling | Tailwind CSS |
| Language | TypeScript |
| Layout | Dagre |
| Package Manager | pnpm |

## Development

```bash
git clone https://github.com/SauliusDev/mermvis.git
cd mermvis
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

**Requirements:** Node.js 18+, pnpm

```bash
pnpm dev      # start dev server
pnpm build    # production build
pnpm lint     # run ESLint
```

## Contributing

PRs are welcome. Open an issue first for large changes.

The codebase follows strict TypeScript with 2-space indentation and single quotes. Keep UI concerns in `components/` and pure diagram logic in `lib/`. Read `AGENTS.md` before contributing.

## License

Mermvis is licensed under the **[Business Source License 1.1 (BUSL-1.1)](LICENSE)**.

**What this means in plain terms:**

- **Free for personal use** — individuals, students, and hobbyists can use, run, and modify Mermvis freely
- **Free for open-source projects** — non-commercial open-source use is permitted
- **Commercial use requires a license** — companies embedding Mermvis in a paid product, SaaS offering, or enterprise tooling must obtain a commercial license
- **Converts to Apache 2.0** — after 4 years from each release date, that version automatically becomes Apache 2.0 and is fully free for all use

This license protects the project from being absorbed into closed commercial products while keeping it fully open and accessible to the developer community.

For commercial licensing: [saulius.d3v@gmail.com](mailto:saulius.d3v@gmail.com)

## 🙏 Attribution

Mermvis is built on the shoulders of two open-source projects:

- **[mermaid-visual-editor](https://github.com/saketkattu/mermaid-visual-editor)** by [@saketkattu](https://github.com/saketkattu) — the original visual drag-and-drop Mermaid editor that Mermvis was forked from
- **[mermaid-reactflow-editor](https://github.com/albingcj/mermaid-reactflow-editor)** by [@albingcj](https://github.com/albingcj) — inspiration and code for the React Flow canvas and Mermaid-to-canvas conversion approach

<div align="center">
  <sub>⭐ If this project helps you, please give us a <a href="https://github.com/SauliusDev/mermvis">Star!</a></sub>
</div>
