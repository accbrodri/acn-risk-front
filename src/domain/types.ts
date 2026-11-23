export type Estado = "Abierto" | "En mitigación" | "Monitoreo" | "Cerrado";
export type AccionEstado = "Pendiente" | "En curso" | "Completada";
export type Prioridad = "Alta" | "Media" | "Baja";
export type Nivel = "Bajo" | "Medio" | "Alto" | "Crítico";

export interface Historial {
  f: string; // fecha YYYY-MM-DD
  nota: string;
  p: number;
  i: number;
  e: Estado;
}

export interface Accion {
  id: string;
  accion: string;
  responsable: string;
  fecha: string;
  estado: AccionEstado;
  prioridad: Prioridad;
  avance: number;
  comentario: string;
  actualizado: string;
}

export interface Risk {
  id: string;
  proyecto: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  responsable: string;
  prob: number;
  imp: number;
  estado: Estado;
  fechaId: string;
  fechaObj: string;
  historial: Historial[];
  acciones: Accion[];
}

export interface Data {
  webhook: string;
  risks: Risk[];
}

/** Acción enriquecida con su riesgo padre (como `allActions()` en la versión vanilla). */
export interface ActionRow extends Accion {
  r: Risk;
}
