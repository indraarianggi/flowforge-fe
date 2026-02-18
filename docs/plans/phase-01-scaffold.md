# Phase 1: Scaffold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a working Vite + React + TypeScript project with Tailwind CSS, shadcn/ui, Vitest, and the full folder structure ready for development.

**Architecture:** Standard Vite scaffold with path aliases (`@/` → `src/`), Tailwind for styling, shadcn/ui for component primitives, and Vitest + React Testing Library for tests. No app logic yet — just infrastructure.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, shadcn/ui, Vitest, React Testing Library

---

### Task 1: Initialize Vite Project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

**Step 1: Scaffold the project**

Run in the repo root (`/Users/indraarianggi/Documents/Projects/flowforge`):
```bash
npm create vite@latest . -- --template react-ts
```
When prompted "Current directory is not empty. Remove existing files and continue?" — select **Ignore files and continue**.

**Step 2: Verify it boots**
```bash
npm install
npm run dev
```
Expected: Vite dev server running at `http://localhost:5173` showing default React page.

**Step 3: Stop the dev server** (`Ctrl+C`)

---

### Task 2: Install All Dependencies

**Step 1: Install runtime dependencies**
```bash
npm install \
  react-router-dom@6 \
  zustand@4 \
  @tanstack/react-query@5 \
  @tanstack/react-query-devtools@5 \
  react-hook-form \
  zod \
  @hookform/resolvers \
  sonner \
  lucide-react \
  date-fns \
  ky \
  clsx \
  tailwind-merge \
  class-variance-authority \
  @radix-ui/react-slot \
  cmdk
```

**Step 2: Install dev dependencies**
```bash
npm install -D \
  tailwindcss@3 \
  postcss \
  autoprefixer \
  @types/node \
  vitest \
  @vitest/ui \
  jsdom \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event
```

**Step 3: Verify no peer dependency errors**
```bash
npm ls --depth=0
```
Expected: List of installed packages with no `UNMET PEER DEPENDENCY` errors.

---

### Task 3: Configure Tailwind CSS

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`
- Modify: `src/index.css`

**Step 1: Initialize Tailwind**
```bash
npx tailwindcss init -p
```

**Step 2: Replace `tailwind.config.js`**
```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**Step 3: Install tailwindcss-animate**
```bash
npm install -D tailwindcss-animate
```

**Step 4: Replace `src/index.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 96%;
    --foreground: 0 0% 12%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 12%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 12%;
    --primary: 211 85% 62%;
    --primary-foreground: 0 0% 100%;
    --secondary: 262 83% 66%;
    --secondary-foreground: 0 0% 100%;
    --muted: 0 0% 94%;
    --muted-foreground: 0 0% 46%;
    --accent: 0 0% 94%;
    --accent-foreground: 0 0% 12%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 88%;
    --input: 0 0% 88%;
    --ring: 211 85% 62%;
    --radius: 0.75rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans;
  }
}
```

---

### Task 4: Set Up shadcn/ui

**Step 1: Initialize shadcn/ui**
```bash
npx shadcn@latest init
```
Answer the prompts:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

**Step 2: Add core components used throughout the app**
```bash
npx shadcn@latest add button input label select textarea badge card dialog sheet tabs tooltip dropdown-menu separator scroll-area avatar switch progress
```

**Step 3: Verify components exist**
```bash
ls src/components/ui/
```
Expected: `button.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, etc.

---

### Task 5: Configure Path Aliases

**Files:**
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`

**Step 1: Update `vite.config.ts`**
```ts
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

**Step 2: Update `tsconfig.json` — add `compilerOptions` paths**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
(Merge with existing content — don't replace the whole file.)

**Step 3: Verify alias works**
```bash
npm run build
```
Expected: Build completes without errors.

---

### Task 6: Configure Vitest

**Files:**
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`

**Step 1: Add test config to `vite.config.ts`**
```ts
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
})
```

**Step 2: Create `src/test/setup.ts`**
```ts
import "@testing-library/jest-dom"
```

**Step 3: Add test scripts to `package.json`**

Add to the `"scripts"` section:
```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:run": "vitest run"
```

**Step 4: Write a smoke test to verify setup**

Create `src/test/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest"

describe("test setup", () => {
  it("works", () => {
    expect(1 + 1).toBe(2)
  })
})
```

**Step 5: Run the test**
```bash
npm run test:run
```
Expected: `✓ src/test/smoke.test.ts (1 test) 1ms` — PASS

---

### Task 7: Create Folder Structure

**Step 1: Create all directories**
```bash
mkdir -p src/app/routes \
  src/app/layouts \
  src/components/shared \
  src/components/workflow \
  src/components/execution \
  src/hooks \
  src/services \
  src/stores \
  src/lib \
  src/mocks \
  src/types \
  src/test
```

**Step 2: Create placeholder index files to prevent import errors**

Create `src/types/index.ts`:
```ts
// Types exported from individual type files
export * from "./workflow"
export * from "./execution"
export * from "./credential"
export * from "./user"
```

Create `src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Create `src/lib/delay.ts`:
```ts
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))
```

**Step 3: Clean up Vite boilerplate**

Delete:
```bash
rm src/App.css src/assets/react.svg public/vite.svg
```

Replace `src/App.tsx`:
```tsx
export default function App() {
  return <div>FlowForge</div>
}
```

**Step 4: Verify app still starts**
```bash
npm run dev
```
Expected: Dev server starts, browser shows "FlowForge" text.

---

### Task 8: Commit Scaffold

**Step 1: Verify tests still pass**
```bash
npm run test:run
```
Expected: All tests pass.

**Step 2: Commit**
```bash
git add -A
git commit -m "feat: scaffold Vite + React + TS project with Tailwind, shadcn/ui, and Vitest"
```
