"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KeyRound, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

interface Props {
  open: boolean
  onDone: () => void
}

export function ChangePasswordModal({ open, onDone }: Props) {
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(keepDefault: boolean) {
    if (!keepDefault) {
      if (!newPassword.trim()) {
        toast.error("Digite uma nova senha")
        return
      }
      if (newPassword.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres")
        return
      }
      if (newPassword !== confirm) {
        toast.error("As senhas não coincidem")
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: keepDefault ? undefined : newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar")
        return
      }
      toast.success(keepDefault ? "Senha padrão mantida. Você pode alterá-la depois." : "Senha alterada com sucesso!")
      onDone()
    } catch {
      toast.error("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm overflow-y-auto flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            Primeiro acesso
          </DialogTitle>
          <DialogDescription>
            Sua senha foi gerada automaticamente. Deseja definir uma senha pessoal agora?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-pwd">Nova senha</Label>
            <div className="relative">
              <Input
                id="new-pwd"
                type={show ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShow((v) => !v)}
                tabIndex={-1}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-pwd">Confirmar senha</Label>
            <Input
              id="confirm-pwd"
              type={show ? "text" : "password"}
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit(false)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={loading}
            onClick={() => submit(false)}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar nova senha"}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-slate-500"
            disabled={loading}
            onClick={() => submit(true)}
          >
            Manter senha padrão por enquanto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
