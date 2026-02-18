# Phase 5: Auth Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build fully functional Login and Register pages with form validation, error states, and navigation — backed by the mock auth service.

**Architecture:** React Hook Form + Zod for validation. `authService` handles the mock login/register. On success, navigate to `/dashboard`. Both pages share the AuthLayout card shell from Phase 4.

**Tech Stack:** React Hook Form, Zod, TanStack Query, React Router 6, shadcn/ui, Sonner

---

### Task 1: Build Login Page

**Files:**
- Create: `src/app/routes/login.tsx`
- Modify: `src/app/router.tsx`

**Step 1: Write the Login page**
```tsx
// src/app/routes/login.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/authService"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const { mutate: login, isPending } = useMutation({
    mutationFn: authService.login,
    onSuccess: () => {
      toast.success("Welcome back!")
      navigate("/dashboard")
    },
    onError: () => {
      toast.error("Login failed. Please try again.")
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome back to FlowForge</p>
      </div>

      <form onSubmit={handleSubmit((data) => login(data))} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 size={16} className="mr-2 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="text-sm text-slate-500 text-center mt-6">
        Don't have an account?{" "}
        <Link to="/register" className="text-primary font-medium hover:underline">
          Create one
        </Link>
      </p>

      {/* Demo hint */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs text-blue-600 text-center">
          <span className="font-medium">Demo:</span> Use any email and password to sign in
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Replace stub in `src/app/router.tsx`**

Replace the `LoginPage` stub import and component:
```tsx
import { LoginPage } from "./routes/login"
```
And change:
```tsx
{ path: "/login", element: <LoginPage /> },
```

---

### Task 2: Build Register Page

**Files:**
- Create: `src/app/routes/register.tsx`
- Modify: `src/app/router.tsx`

**Step 1: Write the Register page**
```tsx
// src/app/routes/register.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/authService"

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const { mutate: registerUser, isPending } = useMutation({
    mutationFn: (data: RegisterForm) =>
      authService.register({ name: data.name, email: data.email, password: data.password }),
    onSuccess: () => {
      toast.success("Account created! Welcome to FlowForge.")
      navigate("/dashboard")
    },
    onError: () => {
      toast.error("Registration failed. Please try again.")
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
        <p className="text-sm text-slate-500 mt-1">Get started with FlowForge for free</p>
      </div>

      <form onSubmit={handleSubmit((data) => registerUser(data))} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            placeholder="Jane Smith"
            autoComplete="name"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repeat password"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 size={16} className="mr-2 animate-spin" />}
          Create account
        </Button>
      </form>

      <p className="text-sm text-slate-500 text-center mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
```

**Step 2: Replace stub in `src/app/router.tsx`**
```tsx
import { RegisterPage } from "./routes/register"
```
And change:
```tsx
{ path: "/register", element: <RegisterPage /> },
```

---

### Task 3: Manual Verification

**Step 1: Start dev server**
```bash
pnpm dev
```

**Step 2: Test login flow**
- Navigate to `http://localhost:5173/login`
- Submit empty form → expect validation errors on both fields
- Enter invalid email (e.g. "notanemail") → expect "Enter a valid email address"
- Enter valid email + any password → expect toast "Welcome back!" and redirect to `/dashboard`

**Step 3: Test register flow**
- Navigate to `http://localhost:5173/register`
- Submit empty → validation errors on all fields
- Enter password "abc" → "Password must be at least 8 characters"
- Enter non-matching passwords → "Passwords do not match"
- Fill all fields correctly → toast "Account created!" and redirect to `/dashboard`

**Step 4: Test ProtectedRoute**
- Clear localStorage in DevTools (Application → Local Storage → clear)
- Navigate to `http://localhost:5173/dashboard` → should redirect to `/login`

---

### Task 4: Run Tests & Commit

**Step 1: Run tests**
```bash
pnpm test:run
```
Expected: All tests pass.

**Step 2: Commit**
```bash
git add -A
git commit -m "feat: add login and register pages with form validation"
```
