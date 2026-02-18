// src/app/routes/register.tsx
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create account</h1>
        <p className="text-sm text-slate-500 mt-1.5">Get started with FlowForge for free</p>
      </div>

      <form onSubmit={handleSubmit((data) => registerUser(data))} className="space-y-4">
        {/* Full name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-slate-700 font-medium text-sm">
            Full name
          </Label>
          <Input
            id="name"
            placeholder="Jane Smith"
            autoComplete="name"
            className="h-10 border-slate-200 bg-slate-50/50 focus:bg-white transition-colors placeholder:text-slate-400"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <span>⚠</span> {errors.name.message}
            </p>
          )}
        </div>

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
              placeholder="Min. 8 characters"
              autoComplete="new-password"
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

        {/* Confirm password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-slate-700 font-medium text-sm">
            Confirm password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat password"
              autoComplete="new-password"
              className="h-10 border-slate-200 bg-slate-50/50 focus:bg-white transition-colors pr-10 placeholder:text-slate-400"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <span>⚠</span> {errors.confirmPassword.message}
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
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="text-sm text-slate-500 text-center mt-6">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-primary font-semibold hover:underline underline-offset-4 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
