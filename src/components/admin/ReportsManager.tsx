"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants"
import { Download, FileText, Loader2, Table as TableIcon } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import Papa from "papaparse"

export function ReportsManager() {
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [departmentId, setDepartmentId] = useState("all")
  const [status, setStatus] = useState("all")

  const [cards, setCards] = useState<any[]>([])
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((data) => setDepartments(data.departments || []))
      .catch(console.error)
  }, [])

  async function handleGenerate() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
      if (departmentId && departmentId !== "all") params.append("departmentId", departmentId)
      if (status && status !== "all") params.append("status", status)

      const res = await fetch(`/api/reports?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Erro ao gerar relatório")
        return
      }

      setCards(data.cards || [])
      setGeneratedAt(new Date(data.generatedAt))
      toast.success("Dados carregados com sucesso")
    } catch (e) {
      toast.error("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  function exportPDF() {
    if (cards.length === 0) {
      toast.error("Não há dados para exportar.")
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(22)
    doc.setTextColor(5, 150, 105) // emerald-600
    doc.text("CCVideira - FollowUp", 14, 22)
    
    doc.setFontSize(14)
    doc.setTextColor(50, 50, 50)
    doc.text("Relatório de Acompanhamento", 14, 32)
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Período: ${startDate ? format(new Date(startDate), "dd/MM/yyyy") : "Início"} até ${endDate ? format(new Date(endDate), "dd/MM/yyyy") : "Hoje"}`, 14, 40)
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 46)

    const tableColumn = ["Data", "Visitante", "Telefone", "Departamento", "Voluntário", "Status", "Prioridade"]
    const tableRows = cards.map((c) => [
      format(new Date(c.createdAt), "dd/MM/yyyy", { locale: ptBR }),
      c.visitor?.name || "-",
      c.visitor?.phone || "-",
      c.department?.name || "-",
      c.volunteer?.name || "Sem voluntário",
      STATUS_LABELS[c.status] || c.status,
      PRIORITY_LABELS[c.priority] || c.priority,
    ])

    autoTable(doc, {
      startY: 52,
      head: [tableColumn],
      body: tableRows,
      theme: "striped",
      headStyles: { fillColor: [5, 150, 105] }, // emerald-600
    })

    doc.save(`relatorio-followup-${format(new Date(), "dd-MM-yyyy")}.pdf`)
  }

  function exportCSV() {
    if (cards.length === 0) {
      toast.error("Não há dados para exportar.")
      return
    }

    const dataToExport = cards.map((c) => ({
      "Data Criação": format(new Date(c.createdAt), "dd/MM/yyyy HH:mm"),
      "Visitante": c.visitor?.name || "",
      "Telefone": c.visitor?.phone || "",
      "Idade": c.visitor?.age || "",
      "Departamento": c.department?.name || "",
      "Voluntário": c.volunteer?.name || "",
      "Supervisor": c.supervisor?.name || "",
      "Status": STATUS_LABELS[c.status] || c.status,
      "Prioridade": PRIORITY_LABELS[c.priority] || c.priority,
    }))

    const csv = Papa.unparse(dataToExport, { delimiter: ";" })
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `relatorio-followup-${format(new Date(), "dd-MM-yyyy")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Relatórios Gerenciais</h2>
          <p className="text-slate-500">Exporte dados consolidados do follow-up.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione os critérios para buscar os dados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button onClick={handleGenerate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TableIcon className="w-4 h-4 mr-2" />}
              Carregar Dados
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedAt && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Resultado da Busca</CardTitle>
              <CardDescription>
                Encontrados {cards.length} registros.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={cards.length === 0} className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <TableIcon className="w-4 h-4 mr-2" /> Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF} disabled={cards.length === 0} className="border-rose-200 text-rose-700 hover:bg-rose-50">
                <FileText className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {cards.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                Nenhum registro encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-50 uppercase dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Visitante</th>
                      <th className="px-4 py-3">Dept</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.slice(0, 10).map((c) => (
                      <tr key={c.id} className="border-b dark:border-slate-800">
                        <td className="px-4 py-3">{format(new Date(c.createdAt), "dd/MM/yyyy", { locale: ptBR })}</td>
                        <td className="px-4 py-3 font-medium">{c.visitor?.name}</td>
                        <td className="px-4 py-3">{c.department?.name}</td>
                        <td className="px-4 py-3">{STATUS_LABELS[c.status] || c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cards.length > 10 && (
                  <div className="text-center py-3 text-xs text-slate-500 border-t">
                    Exibindo os primeiros 10 registros. Exporte para ver todos.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
