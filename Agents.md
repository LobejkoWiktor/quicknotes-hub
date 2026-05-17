# AI Agent Directives & Rules

## Security & Dependencies
**CRITICAL RULE:** Due to ongoing supply chain attacks (e.g., the 2026 "Mini Shai-Hulud" campaign) and general security best practices:
1. **Explicit Permission Required:** You MUST ask the user for explicit permission BEFORE installing or adding any new library or dependency to this project.
2. **Security Check Required:** Before suggesting or asking permission to add a new library, you MUST first verify its security. Check for recent vulnerabilities, its maintenance status, and ensure it is safe to use in the current environment. 

Do not bypass these rules under any circumstances.

## Tech Stack & Architecture
- **Frontend Framework:** React 18 with Vite and TypeScript.
- **State Management:** Zustand (see `src/stores/`). Do not introduce Redux, Context-heavy stores, or other state management libraries without permission.
- **Styling & UI:** Tailwind CSS combined with `shadcn/ui` (Radix UI primitives) and `lucide-react` for icons. Do not introduce alternative UI libraries (like Material UI or Bootstrap).
- **Backend & Auth:** Supabase. All authentication and database operations should go through the Supabase client (`src/lib/supabase.ts`) and be managed by Zustand stores (`authStore.ts`, `wikiStore.ts`).
- **Routing:** React Router (`react-router-dom`). 

## Core Application Logic (QuickNotes)
- **Notion-like Block Editor:** The editor uses a custom block-based architecture. Text is stored as an `InlineText[]` JSON structure to support rich text (bold, italic, links) rather than plain strings or pure HTML. Be extremely careful not to break this data model when modifying the editor.
- **Collaborative Editing & Locking:** The app features a database-driven page locking mechanism. It uses a heartbeat to update the `last_seen` timestamp every 60s and polls every 30s to detect if other users are editing. Ensure these mechanisms remain intact when modifying saving or routing logic.
- **Design Principles:** Maintain a premium, modern aesthetic. Prioritize visual excellence, smooth transitions, and adherence to the existing design system (e.g., using `bg-background`, `text-foreground`, `bg-primary` variables defined in Tailwind).
