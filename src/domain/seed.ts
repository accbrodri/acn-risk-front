import { addD, uid } from "./model"
import type { Accion, AccionEstado, Data, Estado, Prioridad, Risk } from "./types"

type HistTuple = [number, string, number, number, Estado]
type AccTuple = [string, string, number, AccionEstado, Prioridad, number, string, number]

const R = (
  proyecto: string,
  nombre: string,
  descripcion: string,
  categoria: string,
  responsable: string,
  objOff: number,
  hist: HistTuple[],
  acc: AccTuple[] = [],
): Risk => {
  const h = hist.map(([o, nota, p, i, e]) => ({ f: addD(o), nota, p, i, e }))
  const l = h[h.length - 1]
  const acciones: Accion[] = acc.map(([accion, resp, o, estado, prioridad, avance, comentario, u]) => ({
    id: uid(),
    accion,
    responsable: resp,
    fecha: addD(o),
    estado,
    prioridad,
    avance,
    comentario,
    actualizado: addD(u),
  }))
  return {
    id: uid(),
    proyecto,
    nombre,
    descripcion,
    categoria,
    responsable,
    fechaId: h[0].f,
    fechaObj: addD(objOff),
    prob: l.p,
    imp: l.i,
    estado: l.e,
    historial: h,
    acciones,
  }
}

export function seed(): Data {
  return {
    webhook: "",
    risks: [
      R("Core Bancario 2.0", "Retraso en integración con sistema externo", "La integración con el sistema de pagos del proveedor depende de una API que aún no está disponible en ambiente de pruebas.", "Proveedor/Terceros", "Ana Gómez", 5,
        [[-24, "Dependencia identificada con proveedor.", 4, 4, "Abierto"], [-21, "Reunión realizada. API aún no disponible.", 5, 4, "En mitigación"], [-17, "Proveedor confirma ambiente para el próximo lunes.", 4, 4, "En mitigación"], [-13, "Pruebas completadas. Probabilidad disminuye de Alta a Baja.", 2, 4, "Monitoreo"]],
        [["Escalar con gerente de cuenta del proveedor y acordar fecha compromiso", "Ana Gómez", -20, "Completada", "Alta", 100, "Compromiso formal recibido por correo.", -19], ["Construir mock del API para no bloquear pruebas", "Carlos Ruiz", -16, "Completada", "Alta", 100, "Mock desplegado en QA.", -16], ["Pruebas de integración end-to-end", "Carlos Ruiz", -12, "Completada", "Media", 100, "Evidencia: reporte QA-231.", -13]]),
      R("Core Bancario 2.0", "Rotación del líder técnico de backend", "El líder técnico anunció su retiro; concentra conocimiento crítico del motor de transacciones.", "Recursos", "Ana Gómez", 12,
        [[-35, "Identificado en retrospectiva: alta dependencia de una persona.", 2, 4, "Abierto"], [-9, "Renuncia confirmada, último día en 3 semanas.", 5, 4, "En mitigación"]],
        [["Plan de transferencia de conocimiento", "Jorge Pérez", -2, "En curso", "Alta", 40, "Sesiones grabadas 3 de 8.", -4], ["Abrir vacante y activar proveedor de staffing", "Ana Gómez", 3, "Pendiente", "Alta", 0, "", -9]]),
      R("Core Bancario 2.0", "Incumplimiento de circular regulatoria de la SFC", "Nuevos requisitos de reporte regulatorio podrían no estar listos antes de la salida a producción.", "Regulatorio", "Laura Méndez", -3,
        [[-28, "Identificado por el área de cumplimiento.", 3, 5, "Abierto"]],
        [["Matriz de requisitos con área legal", "Laura Méndez", -8, "En curso", "Alta", 60, "Pendiente validación de 2 requisitos.", -18]]),
      R("App Móvil Clientes", "Vulnerabilidades en librerías de terceros", "El escaneo SAST detectó dependencias con CVE críticos en el módulo de autenticación.", "Seguridad", "Sofía Rojas", 7,
        [[-26, "Escaneo inicial con hallazgos medios.", 3, 4, "Abierto"], [-6, "Nuevo escaneo: CVE crítico en librería de autenticación.", 4, 5, "Abierto"]]),
      R("App Móvil Clientes", "Baja adopción de la nueva app", "Usuarios acostumbrados al canal web podrían no migrar a la app.", "Alcance", "Diego Torres", 45,
        [[-20, "Identificado en comité de producto.", 3, 3, "Abierto"], [-4, "Piloto con 500 usuarios: 72% de uso activo.", 2, 3, "Monitoreo"]],
        [["Campaña de comunicación y onboarding", "Diego Torres", 20, "En curso", "Media", 30, "Piezas en diseño.", -4]]),
      R("App Móvil Clientes", "Retraso en aprobación de tiendas (App Store / Play)", "Las tiendas pueden rechazar la versión por políticas de privacidad.", "Proveedor/Terceros", "Sofía Rojas", 15,
        [[-15, "Identificado en planeación de release.", 3, 3, "Abierto"]],
        [["Revisión previa de políticas de privacidad", "Sofía Rojas", -1, "Pendiente", "Media", 0, "", -15]]),
      R("Migración Cloud", "Sobrecosto en consumo de nube", "El consumo real de cómputo supera en 35% lo presupuestado por ambientes no apagados.", "Presupuesto", "Jorge Pérez", 10,
        [[-40, "Identificado en planeación.", 2, 4, "Abierto"], [-11, "Factura mensual 35% sobre presupuesto.", 4, 4, "En mitigación"]],
        [["Configurar alertas de costo y presupuestos", "Jorge Pérez", -5, "Completada", "Alta", 100, "Alertas activas en consola.", -6], ["Apagado automático de ambientes no productivos", "Carlos Ruiz", -3, "En curso", "Alta", 50, "Script listo para QA, falta DEV.", -5]]),
      R("Migración Cloud", "Pérdida de datos durante la migración", "La migración de la base histórica podría generar pérdida o corrupción de registros.", "Técnico", "Carlos Ruiz", 20,
        [[-45, "Identificado en diseño.", 4, 5, "Abierto"], [-25, "Ensayo de migración con checksums exitoso al 98%.", 3, 5, "En mitigación"], [-8, "Segundo ensayo 100% consistente.", 2, 5, "Monitoreo"]],
        [["Ensayos de migración con validación de checksums", "Carlos Ruiz", -10, "Completada", "Alta", 100, "2 ensayos exitosos.", -8], ["Plan de rollback documentado", "Jorge Pérez", 5, "En curso", "Media", 70, "", -8]]),
      R("Migración Cloud", "Retraso del proveedor en entrega de ambiente", "El proveedor de servicios gestionados no ha entregado la conectividad dedicada (VPN) requerida para la integración.", "Proveedor/Terceros", "Jorge Pérez", 8,
        [[-12, "Proveedor no entrega conectividad; integración bloqueada.", 4, 3, "Abierto"]]),
      R("CRM Comercial", "Cambios frecuentes en requisitos del negocio", "El área comercial solicita cambios de alcance en cada sprint.", "Alcance", "Laura Méndez", 25,
        [[-30, "Identificado.", 3, 3, "Abierto"], [-5, "3 solicitudes de cambio en el último sprint.", 4, 3, "En mitigación"]],
        [["Comité de control de cambios semanal", "Laura Méndez", -7, "Completada", "Media", 100, "Comité instaurado.", -7]]),
      R("CRM Comercial", "Integración con ERP sin documentación técnica", "El ERP legado no tiene documentación de sus interfaces; puede retrasar la integración.", "Técnico", "Diego Torres", -2,
        [[-33, "Identificado.", 3, 4, "Abierto"], [-16, "Ingeniería inversa parcial; faltan 4 interfaces.", 4, 4, "En mitigación"]],
        [["Sesiones con experto del ERP", "Diego Torres", -6, "En curso", "Alta", 50, "", -16]]),
      R("CRM Comercial", "Falta de capacitación de usuarios finales", "Fuerza comercial sin capacitación antes del go-live.", "Recursos", "Laura Méndez", -1,
        [[-38, "Identificado.", 3, 3, "Abierto"], [-10, "Capacitación completada a 120 usuarios. Riesgo cerrado.", 1, 2, "Cerrado"]],
        [["Plan de capacitación por regiones", "Laura Méndez", -12, "Completada", "Media", 100, "Asistencia 95%.", -10]]),
    ],
  }
}
