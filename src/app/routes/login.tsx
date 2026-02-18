// src/app/routes/login.tsx
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link, useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Eye, EyeOff, Loader2 } from "lucide-react"
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
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in</h1>
        <p className="text-sm text-slate-500 mt-1.5">Welcome back to FlowForge</p>
      </div>

      <form onSubmit={handleSubmit((data) => login(data))} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-slate-700 font-medium text-sm">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className="h-10 border-slate-200 bg-slate-50/50 focus:bg-white transition-colors placeholder:text-slate-400"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <span>⚠</span> {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-slate-700 font-medium text-sm">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-10 border-slate-200 bg-slate-50/50 focus:bg-white transition-colors pr-10 placeholder:text-slate-400"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <span>⚠</span> {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-10 font-semibold shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 size={15} className="mr-2 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="text-sm text-slate-500 text-center mt-6">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="text-primary font-semibold hover:underline underline-offset-4 transition-colors"
        >
          Create one
        </Link>
      </p>

      {/* Demo hint */}
      <div className="mt-5 p-3 bg-blue-50 rounded-xl border border-blue-100/80">
        <p className="text-xs text-blue-600 text-center leading-relaxed">
          <span className="font-semibold">Demo mode:</span> Use any email and password to sign in
        </p>
      </div>
    </div>
  )
}
