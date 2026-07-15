"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Leaf, Mail, ArrowLeft, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

interface Props {
  onSuccess: (user: any) => void
  onLoungeAccess?: () => void
}

export function LoginScreen({ onSuccess, onLoungeAccess }: Props) {
  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [devCode, setDevCode] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)

  async function requestCode() {
    if (!email.trim()) {
      toast.error("Digite seu e-mail")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erro ao gerar código")
        return
      }
      setUserName(data.userName)
      setUserId(data.userId)
      if (data.devCode) setDevCode(data.devCode)
      setStep("code")
      toast.success("Código gerado!")
    } catch (e) {
      toast.error("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  async function verifyCode() {
    if (code.length !== 6) {
      toast.error("Digite o código de 6 dígitos")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code, rememberMe }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Código inválido")
        return
      }
      toast.success(`Bem-vindo, ${data.user.name}!`)
      onSuccess(data.user)
    } catch (e) {
      toast.error("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-lg shadow-emerald-600/30">
            <Leaf className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CCVideira Capim Macio</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sistema de Follow-up</p>
        </div>

        <Card className="border-emerald-100 dark:border-emerald-900/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Acesso ao Sistema
            </CardTitle>
            <CardDescription>
              {step === "email"
                ? "Entre com seu e-mail cadastrado. Enviaremos um código de acesso para você."
                : "Informe o código de 6 dígitos que enviamos no seu e-mail."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "email" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && requestCode()}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Use o e-mail que foi cadastrado pelo seu supervisor.
                  </p>
                </div>
                <div className="flex items-center space-x-2 pb-2">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe} 
                    onCheckedChange={(c) => setRememberMe(c as boolean)} 
                  />
                  <Label htmlFor="remember" className="text-sm cursor-pointer text-slate-600 dark:text-slate-300">
                    Manter conectado neste computador
                  </Label>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={loading}
                  onClick={requestCode}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Solicitar código"}
                </Button>
                {onLoungeAccess && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
                    <Button
                      variant="outline"
                      className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/20"
                      onClick={onLoungeAccess}
                    >
                      Acesso Público - Cadastro do Lounge
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Código de acesso</Label>
                  <p className="text-sm text-slate-500">Olá, <strong>{userName}</strong>!</p>
                  <InputOTP maxLength={6} value={code} onChange={setCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  {devCode && (
                    <div className="mt-4 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs text-center font-mono text-slate-500" data-testid="dev-code">
                      [Dev] Código: {devCode}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={loading || code.length !== 6}
                  onClick={verifyCode}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("email")
                    setCode("")
                    setDevCode(null)
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6 px-4">
          Sem senha para lembrar. A cada acesso, um código novo é gerado e enviado por e-mail.
        </p>
      </div>
    </div>
  )
}
