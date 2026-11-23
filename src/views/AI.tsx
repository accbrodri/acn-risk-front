import { useEffect, useRef, useState, type FormEvent } from "react"
import { projectsOf, peopleOf } from "@/domain/model"
import type { AppApi } from "@/components/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Pill, Tag, inputCls } from "@/components/shared"
import { cn } from "@/lib/utils"

const QUESTIONS = [
  "¿Cuántos riesgos abiertos hay?",
  "¿Cuáles son críticos?",
  "¿Qué proyecto tiene mayor exposición?",
  "¿Cuáles aumentaron su severidad?",
  "¿Cuáles disminuyeron?",
  "¿Cuántos riesgos están vencidos?",
  "¿Qué acciones están retrasadas?",
  "¿Quién tiene acciones pendientes?",
  "¿Cómo ha evolucionado el riesgo?",
  "¿Hay riesgos similares entre proyectos?",
  "¿Qué recomiendas hacer?",
  "Resumen ejecutivo",
]

export function AI({ api }: { api: AppApi }) {
  const { ai, risks } = api
  const [q, setQ] = useState("")
  const [proyecto, setProyecto] = useState<string | undefined>(undefined)
  const [responsable, setResponsable] = useState("")
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight })
  }, [ai.chat])

  const projects = projectsOf(risks)
  const proyectoVal = proyecto ?? projects[0] ?? ""

  function submit(e: FormEvent) {
    e.preventDefault()
    ai.ask(q)
    setQ("")
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">💬 Conversa con tus riesgos</h3>
        <div ref={chatRef} className="flex h-80 flex-col gap-2 overflow-y-auto rounded-lg bg-muted p-3">
          {ai.chat.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm",
                m.me ? "ml-auto bg-primary text-primary-foreground" : "bg-card border",
              )}
            >
              {m.t}
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="flex gap-2">
          <input
            className={cn(inputCls, "flex-1")}
            placeholder="Escribe tu pregunta…"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button type="submit">Preguntar</Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {QUESTIONS.map((question) => (
            <Button key={question} size="sm" variant="secondary" onClick={() => ai.ask(question)}>
              {question}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">🧠 Identificación automática de riesgos</h3>
        <p className="text-sm text-muted-foreground">
          Pega un acta, correo o notas de reunión. Se detectan posibles riesgos, se clasifican, se valoran y se les propone
          un plan de mitigación.
        </p>
        <Textarea rows={7} value={ai.detText} onChange={(e) => ai.setDetText(e.target.value)} />
        <Button onClick={ai.detect}>Analizar texto</Button>

        {ai.det.length > 0 && (
          <>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2" />
                  <th className="p-2">Riesgo propuesto</th>
                  <th className="p-2">Sev.</th>
                  <th className="p-2">Evidencia en el texto</th>
                </tr>
              </thead>
              <tbody>
                {ai.det.map((d, i) => (
                  <tr key={i} className="border-t align-top">
                    <td className="p-2">
                      <input type="checkbox" checked={d.on} onChange={() => ai.toggleDet(i)} />
                    </td>
                    <td className="p-2">
                      <b>{d.nombre}</b>
                      <br />
                      <Tag>{d.categoria}</Tag>
                    </td>
                    <td className="p-2">
                      <Pill v={d.prob * d.imp} />
                    </td>
                    <td className="p-2">
                      <small>{d.descripcion}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="space-y-1 text-sm">
                <span>Proyecto</span>
                <input
                  className={inputCls}
                  list="dlProj"
                  value={proyectoVal}
                  onChange={(e) => setProyecto(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Responsable</span>
                <input className={inputCls} list="dlPeople" value={responsable} onChange={(e) => setResponsable(e.target.value)} />
              </label>
              <Button onClick={() => ai.createDet(proyectoVal, responsable)}>Crear riesgos + plan sugerido</Button>
            </div>
            <datalist id="dlProj">
              {projects.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <datalist id="dlPeople">
              {peopleOf(risks).map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </>
        )}
      </Card>
    </div>
  )
}
