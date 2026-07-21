"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Leaf, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

interface Props {
  onSuccess: (user: any) => void
  onLoungeAccess?: () => void
}

export function LoginScreen({ onSuccess, onLoungeAccess }: Props) {
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!login.trim() || !password.trim()) {
      toast.error("Preencha o login e a senha")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, rememberMe }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Credenciais inválidas")
        return
      }
      toast.success(`Bem-vindo, ${data.user.name}!`)
      onSuccess(data.user)
    } catch {
      toast.error("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-lg shadow-emerald-600/30">
            <Leaf className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CCVideira Capim Macio</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sistema de Follow-up</p>
        </div>

        <Card className="border-emerald-100 dark:border-emerald-900/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Entrar</CardTitle>
            <CardDescription>Use seu e-mail ou telefone e senha.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login">E-mail ou telefone</Label>
              <Input
                id="login"
                type="text"
                placeholder="seu@email.com ou 84999999999"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(c) => setRememberMe(c as boolean)}
              />
              <Label htmlFor="remember" className="text-sm cursor-pointer text-slate-600 dark:text-slate-300">
                Manter conectado
              </Label>
            </div>

            <Button
              id="btn-login"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
              onClick={handleLogin}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
            </Button>

            {onLoungeAccess && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
                  onClick={onLoungeAccess}
                >
                  Acesso Público — Cadastro do Lounge
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
