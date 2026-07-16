"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, AlertTriangle, Check, X, Loader2, Bot } from "lucide-react"
import { toast } from "sonner"
import { useAppStore } from "@/lib/store"

interface PriorityScreening {
  suggested: string
  reasoning: string
  reviewed: boolean
  accepted: boolean | null
}

interface Props {
  cardId: string
  priorityScreening?: PriorityScreening | null
  onScreeningReviewed?: () => void
}

export function AgentInsights({ cardId, priorityScreening, onScreeningReviewed }: Props) {
  const user = useAppStore((s) => s.user)
  const isManager = user?.role === "supervisor" || user?.role === "admin"

  const [draft, setDraft] = useState<any>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [summary, setSummary] = useState<any>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [screeningReviewing, setScreeningReviewing] = useState(false)

  async function loadDraft() {
    setDraftLoading(true)
    try {
      const res = await fetch(`/api/agents/cards/${cardId}/approach-draft`)
      if (res.ok) {
        const data = await res.json()
        setDraft(data)
      } else {
        toast.error("Rascunho indisponível")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setDraftLoading(false)
    }
  }

  async function loadSummary() {
    setSummaryLoading(true)
    try {
      const res = await fetch(`/api/agents/cards/${cardId}/history-summary`)
      if (res.ok) {
        const data = await res.json()
        setSummary(data)
      } else {
        toast.error("Resumo indisponível")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSummaryLoading(false)
    }
  }

  async function reviewScreening(accepted: boolean) {
    setScreeningReviewing(true)
    try {
      const res = await fetch(`/api/agents/cards/${cardId}/priority-screening`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted })
      })
      if (res.ok) {
        toast.success(accepted ? "Triagem aceita" : "Triagem rejeitada")
        onScreeningReviewed?.()
      } else {
        toast.error("Erro ao revisar triagem")
      }
    } finally {
      setScreeningReviewing(false)
    }
  }

  const showScreeningAlert = priorityScreening && !priorityScreening.reviewed

  return (
    <div className="space-y-4">
      {/* Banner de Triagem */}
      {showScreeningAlert && isManager && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3">
          <div className="flex gap-2 text-amber-800 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold mb-1">Triagem de Prioridade da IA</p>
              <p className="mb-2 text-amber-700 dark:text-amber-300">
                Sugestão: <strong className="uppercase">{priorityScreening.suggested}</strong>. 
                Motivo: {priorityScreening.reasoning}
              </p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => reviewScreening(true)} disabled={screeningReviewing} className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs">
                  {screeningReviewing ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Check className="w-3 h-3 mr-1"/>} Aceitar
                </Button>
                <Button size="sm" variant="outline" onClick={() => reviewScreening(false)} disabled={screeningReviewing} className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100">
                  {screeningReviewing ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <X className="w-3 h-3 mr-1"/>} Descartar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blocos de IA lado a lado ou empilhados */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Rascunho */}
        <div className="rounded-md border p-3 bg-indigo-50/50 dark:bg-indigo-950/20 text-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Abordagem Inicial
            </h4>
            {!draft && !draftLoading && (
              <Button variant="ghost" size="sm" className="h-6 text-xs text-indigo-600 p-0 hover:bg-transparent hover:underline" onClick={loadDraft}>
                Sugerir Rascunho
              </Button>
            )}
          </div>
          {draftLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-xs py-2"><Loader2 className="w-3 h-3 animate-spin"/> Gerando...</div>
          ) : draft ? (
            <div className="text-slate-700 dark:text-slate-300">
              <p className="italic text-xs bg-white dark:bg-slate-900 p-2 rounded border leading-relaxed break-words whitespace-pre-wrap">
                {draft.draftText}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-slate-400">Por {draft.model}</span>
                <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 bg-white dark:bg-slate-900" onClick={() => {
                  navigator.clipboard.writeText(draft.draftText)
                  toast.success("Copiado para a área de transferência")
                }}>
                  Copiar
                </Button>
              </div>
            </div>
          ) : (
             <p className="text-xs text-slate-500">Gere um rascunho amigável baseado no perfil.</p>
          )}
        </div>

        {/* Resumo do Histórico */}
        <div className="rounded-md border p-3 bg-teal-50/50 dark:bg-teal-950/20 text-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
              <Bot className="w-4 h-4" />
              Resumo Operacional
            </h4>
            {!summary && !summaryLoading && (
              <Button variant="ghost" size="sm" className="h-6 text-xs text-teal-600 p-0 hover:bg-transparent hover:underline" onClick={loadSummary}>
                Sintetizar Histórico
              </Button>
            )}
          </div>
          {summaryLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-xs py-2"><Loader2 className="w-3 h-3 animate-spin"/> Analisando...</div>
          ) : summary ? (
            <div className="text-slate-700 dark:text-slate-300">
              <p className="text-xs leading-relaxed bg-white dark:bg-slate-900 p-2 rounded border">
                {summary.summaryText}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Útil para cards com longo histórico de interações.</p>
          )}
        </div>
      </div>
    </div>
  )
}
