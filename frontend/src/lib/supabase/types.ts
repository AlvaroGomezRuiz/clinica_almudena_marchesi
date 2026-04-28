/**
 * Types del esquema Supabase.
 *
 * FUENTE DE VERDAD: Este archivo debe regenerarse con:
 *   `supabase gen types typescript --project-id <ref> --schema public > src/lib/supabase/types.ts`
 *
 * Hasta que generemos los tipos desde el proyecto real, declaramos interfaces
 * manuales que reflejan exactamente las migraciones 0001–0005.
 */

export type UserRole = 'admin' | 'paciente';

export type CitaEstado =
  | 'bloqueo_temporal'
  | 'confirmada'
  | 'completada'
  | 'cancelada'
  | 'no_asistio';

export type PagoEstado =
  | 'pendiente'
  | 'procesando'
  | 'completado'
  | 'fallido'
  | 'reembolsado';

export type BonoEstado = 'activo' | 'agotado' | 'expirado' | 'cancelado';

export type ConversacionEstado = 'abierta' | 'archivada' | 'bloqueada';

export type RecursoTipo = 'pdf' | 'audio' | 'video' | 'imagen' | 'enlace' | 'otro';

export type RecursoCategoria =
  | 'tarea'
  | 'lectura'
  | 'ejercicio'
  | 'evaluacion'
  | 'recurso';

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  numero_colegiada: string | null;
  intrusion_alerts_enabled: boolean;
  /** Paciente cerró la bienvenida del portal (onboarding una sola vez). */
  portal_welcome_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Paciente {
  id: string;
  user_id: string | null;
  dni_nie_ciphertext: string;
  dni_nie_bidx: string;
  nombre_completo_ciphertext: string;
  nombre_completo_bidx: string;
  telefono_ciphertext: string | null;
  telefono_bidx: string | null;
  fecha_nacimiento: string | null;
  fecha_alta: string;
  motivo_consulta_inicial_ciphertext: string | null;
  experiencia_terapia: string | null;
  motivo_consulta_ciphertext: string | null;
  consentimiento_rgpd: boolean;
  firma_rgpd_storage_path: string | null;
  // Migración 0012: campos clínicos adicionales (ciphertext + metadata)
  direccion_ciphertext: string | null;
  email_ciphertext: string | null;
  email_bidx: string | null;
  contacto_emergencia_nombre_ciphertext: string | null;
  contacto_emergencia_telefono_ciphertext: string | null;
  alergias_ciphertext: string | null;
  medicacion_base_ciphertext: string | null;
  objetivos_ciphertext: string | null;
  preferencias_clinicas_ciphertext: string | null;
  avatar_url: string | null;
  color_etiqueta: string | null;
  tags: readonly string[];
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_minutos: number;
  precio_centimos: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cita {
  id: string;
  paciente_id: string;
  servicio_id: string;
  inicio: string;
  fin: string;
  estado: CitaEstado;
  notas_admin: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgendaBloqueo {
  id: string;
  inicio: string;
  fin: string;
  motivo: string | null;
  dia_completo: boolean;
  creado_por: string | null;
  activo: boolean;
  created_at: string;
}

export interface FacturacionNota {
  id: number;
  nota: string;
  updated_by: string | null;
  updated_at: string;
}

export interface HorarioPlantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  // Items: array jsonb con {weekday, hora_inicio, hora_fin, libre}
  items: unknown;
  bloquea_dia_completo: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgendaPlantillaAplicacion {
  id: string;
  plantilla_id: string;
  fecha_desde: string;
  fecha_hasta: string;
  nota: string | null;
  activo: boolean;
  created_at: string;
}

export interface CitaNotaPaciente {
  id: string;
  cita_id: string;
  paciente_id: string;
  autor_user_id: string;
  contenido: string | null;
  contenido_ciphertext: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export type RgpdTipo =
  | 'exportar'
  | 'borrado'
  | 'rectificar'
  | 'oposicion'
  | 'portabilidad'
  | 'limitacion';

export type RgpdEstado =
  | 'pendiente'
  | 'en_revision'
  | 'resuelta'
  | 'rechazada'
  | 'expirada';

export interface RgpdRequest {
  id: string;
  user_id: string;
  tipo: RgpdTipo;
  estado: RgpdEstado;
  motivo: string | null;
  payload: Record<string, unknown>;
  resolucion: string | null;
  fecha_limite: string;
  resuelta_por: string | null;
  resuelta_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pago {
  id: string;
  paciente_id: string;
  cita_id: string | null;
  bono_id: string | null;
  stripe_event_id: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  importe_centimos: number;
  moneda: string;
  estado: PagoEstado;
  fecha_pago: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface BonoPaciente {
  id: string;
  paciente_id: string;
  servicio_id: string;
  sesiones_totales: number;
  sesiones_consumidas: number;
  estado: BonoEstado;
  fecha_compra: string;
  fecha_expiracion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recurso {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: RecursoTipo;
  categoria: RecursoCategoria;
  storage_path: string | null;
  external_url: string | null;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_by: string | null;
  activo: boolean;
  publico: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecursoAsignacion {
  id: string;
  recurso_id: string;
  paciente_id: string;
  assigned_by: string | null;
  assigned_at: string;
  completed_at: string | null;
  activo: boolean;
}

export type PreferenciaTema = 'light' | 'dark' | 'system';

export interface NotificacionesPrefs {
  user_id: string;
  welcome: boolean;
  booking_confirmed: boolean;
  booking_cancelled: boolean;
  reminder_24h: boolean;
  reminder_48h: boolean;
  nueva_asignacion: boolean;
  tema: PreferenciaTema;
  privacy_mode_default: boolean;
  sound: boolean;
  desktop_notifications: boolean;
  chat_nuevo_mensaje: boolean;
  marketing: boolean;
  created_at: string;
  updated_at: string;
}

export interface BonoConfig {
  id: string;
  nombre: string;
  descripcion: string | null;
  sesiones: number;
  importe_centimos: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversacion {
  id: string;
  paciente_id: string;
  last_message_at: string | null;
  estado: ConversacionEstado;
  unread_admin: number;
  unread_paciente: number;
  created_at: string;
  updated_at: string;
}

export interface Mensaje {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body_ciphertext: string;
  encryption_version: string;
  read_at: string | null;
  created_at: string;
}

export type MensajeAdjuntoTipo = 'archivo' | 'imagen' | 'audio' | 'video';

export interface MensajeAdjunto {
  id: string;
  mensaje_id: string;
  storage_path: string;
  nombre: string;
  mime: string | null;
  size_bytes: number | null;
  tipo: MensajeAdjuntoTipo;
  duracion_ms: number | null;
  transcripcion_ciphertext: string | null;
  /** Reservado: cifrado en reposo (migración 0054). */
  encryption_scheme?: string | null;
  created_at: string;
}

export interface HistorialSesion {
  id: string;
  paciente_id: string;
  cita_id: string | null;
  notas_clinicas_ciphertext: string | null;
  tareas_asignadas_ciphertext: string | null;
  estado_emocional: string | null;
  fecha_registro: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export type DiagnosticoSeveridad = 'leve' | 'moderado' | 'severo';
export type DiagnosticoEstado = 'activo' | 'remision' | 'resuelto' | 'descartado';

export interface PacienteDiagnostico {
  id: string;
  paciente_id: string;
  cie_code: string | null;
  titulo: string | null;
  descripcion: string | null;
  titulo_ciphertext: string | null;
  notas_ciphertext: string | null;
  severidad: DiagnosticoSeveridad | null;
  estado: DiagnosticoEstado;
  fecha_inicio: string;
  fecha_fin: string | null;
  created_by: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PacienteMedicacion {
  id: string;
  paciente_id: string;
  nombre: string;
  dosis: string | null;
  frecuencia: string | null;
  via: string | null;
  prescrita_por: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  notas: string | null;
  notas_ciphertext: string | null;
  created_by: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PacienteAdjunto {
  id: string;
  paciente_id: string;
  storage_path: string;
  nombre: string;
  mime: string | null;
  size_bytes: number | null;
  descripcion: string | null;
  subido_por: string | null;
  created_at: string;
}

export type AdminLookupCampo =
  | 'dni_nie'
  | 'telefono'
  | 'email'
  | 'direccion'
  | 'contacto_emergencia'
  | 'alergias'
  | 'medicacion_base'
  | 'objetivos'
  | 'preferencias_clinicas'
  | 'historial_clinico'
  | 'diagnostico'
  | 'bulk_export';

export interface AdminLookup {
  id: string;
  admin_id: string;
  paciente_id: string;
  campo: AdminLookupCampo;
  justificacion: string | null;
  ip_origen: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Shape mínimo del schema para `createClient<Database>()`.
 * Una vez generemos types con el CLI, reemplazar por la versión completa.
 *
 * Nota 1: `Relationships: []` es REQUERIDO por supabase-js para inferencia
 *         correcta (ver GenericTable en postgrest-js).
 *
 * Nota 2: `Prettify<Row>` convierte la interface en un mapped type, condición
 *         necesaria para que satisfaga `Record<string, unknown>` que exige
 *         `GenericTable`. Sin esto `.insert()` / `.update()` devuelven
 *         PostgrestFilterBuilder<{...}, never, never, ...> y tipo `never`.
 */
/**
 * Normaliza una interface para que satisfaga `Record<string, unknown>`
 * que exige `GenericTable` del cliente postgrest-js.
 *
 * TypeScript no asigna interfaces a Record<string, unknown> de forma
 * implícita (excess property checks), así que aquí añadimos un index
 * signature vía intersection.
 */
type WithIndexSignature<T> = { [K in keyof T]: T[K] } & {
  [key: string]: unknown;
};

type TableDef<Row> = {
  Row: WithIndexSignature<Row>;
  Insert: WithIndexSignature<Partial<Row>>;
  Update: WithIndexSignature<Partial<Row>>;
  Relationships: [];
};

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      profiles:             TableDef<Profile>;
      pacientes:            TableDef<Paciente>;
      servicios:            TableDef<Servicio>;
      citas:                TableDef<Cita>;
      agenda_bloqueos:      TableDef<AgendaBloqueo>;
      pagos:                TableDef<Pago>;
      bonos_pacientes:      TableDef<BonoPaciente>;
      bonos_config:         TableDef<BonoConfig>;
      recursos:             TableDef<Recurso>;
      recurso_asignaciones: TableDef<RecursoAsignacion>;
      notificaciones_prefs: TableDef<NotificacionesPrefs>;
      conversaciones:       TableDef<Conversacion>;
      mensajes:             TableDef<Mensaje>;
      historial_sesiones:   TableDef<HistorialSesion>;
      facturacion_nota:              TableDef<FacturacionNota>;
      horario_plantillas:            TableDef<HorarioPlantilla>;
      agenda_plantilla_aplicaciones: TableDef<AgendaPlantillaAplicacion>;
      rgpd_requests:                 TableDef<RgpdRequest>;
      citas_notas_paciente:          TableDef<CitaNotaPaciente>;
      mensajes_adjuntos:             TableDef<MensajeAdjunto>;
      paciente_diagnosticos:         TableDef<PacienteDiagnostico>;
      paciente_medicacion:           TableDef<PacienteMedicacion>;
      paciente_adjuntos:             TableDef<PacienteAdjunto>;
      admin_lookups:                 TableDef<AdminLookup>;
    };
    Views: {
      v_citas_expandidas: {
        Row: WithIndexSignature<Cita & {
          servicio_nombre: string;
          duracion_minutos: number;
          precio_centimos: number;
          paciente_user_id: string | null;
          paciente_display_name: string | null;
        }>;
        Relationships: [];
      };
      v_conversaciones_admin: {
        Row: WithIndexSignature<{
          conversacion_id: string;
          paciente_id: string;
          paciente_display_name: string | null;
          paciente_email: string | null;
          last_message_at: string | null;
          estado: ConversacionEstado;
          unread_admin: number;
          unread_paciente: number;
        }>;
        Relationships: [];
      };
      v_pacientes_resumen_admin: {
        Row: WithIndexSignature<{
          id: string;
          user_id: string | null;
          fecha_alta: string;
          fecha_nacimiento: string | null;
          activo: boolean;
          tags: readonly string[];
          color_etiqueta: string | null;
          avatar_url: string | null;
          consentimiento_rgpd: boolean;
          created_at: string;
          updated_at: string;
          has_dni: boolean;
          has_telefono: boolean;
          has_email: boolean;
          has_direccion: boolean;
          has_contacto_emergencia: boolean;
          has_alergias: boolean;
          has_medicacion_base: boolean;
          has_objetivos: boolean;
          diagnosticos_activos: number;
          medicaciones_activas: number;
          adjuntos_total: number;
          sesiones_completadas: number;
          ultima_cita: string | null;
          proxima_cita: string | null;
        }>;
        Relationships: [];
      };
      v_mensajes_chat: {
        Row: WithIndexSignature<{
          id: string;
          conversation_id: string;
          sender_user_id: string;
          body: string | null;
          encryption_version: string;
          read_at: string | null;
          created_at: string;
        }>;
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      current_paciente_id: { Args: Record<string, never>; Returns: string | null };
      obtener_disponibilidad: {
        Args: { p_fecha: string; p_servicio_id: string };
        Returns: Array<{ slot_inicio: string; slot_fin: string }>;
      };
      obtener_cuadricula_reserva: {
        Args: { p_fecha: string; p_servicio_id: string };
        Returns: Array<{ slot_inicio: string; slot_fin: string; permite_reserva: boolean }>;
      };
      reservar_cita: {
        Args: { p_servicio_id: string; p_slot_inicio: string };
        Returns: Array<{
          cita_id: string;
          estado: CitaEstado;
          consumio_bono: boolean;
        }>;
      };
      chat_mi_conversacion: { Args: Record<string, never>; Returns: string };
      /** Avatar del terapeuta (primer admin); solo paciente autenticado. Migración 0062. */
      terapeuta_public_profile: {
        Args: Record<string, never>;
        Returns: Array<{ avatar_url: string | null; display_name: string | null }>;
      };
      chat_enviar_mensaje: {
        Args: { p_conversacion_id: string; p_contenido: string };
        Returns: Array<{
          id: string;
          conversation_id: string;
          sender_user_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
        }>;
      };
      chat_marcar_leidos: { Args: { p_conversacion_id: string }; Returns: boolean };
      chat_descifrar_mensaje: {
        Args: { p_id: string };
        Returns: Array<{
          id: string;
          conversation_id: string;
          sender_user_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
        }>;
      };
      registrar_consulta_sensible: {
        Args: {
          p_paciente_id: string;
          p_campo: string;
          p_justificacion?: string | null;
          p_ip?: string | null;
          p_user_agent?: string | null;
        };
        Returns: string;
      };
      // ─── F5 cifrado (0022 + 0023 + 0024) ─────────────────────────────
      paciente_alta_cifrada: {
        Args: {
          p_nombre_completo: string;
          p_dni_nie: string;
          p_telefono: string | null;
          p_email: string | null;
          p_fecha_nacimiento: string | null;
          p_fecha_alta: string;
          p_direccion: string | null;
          p_contacto_emergencia_nombre: string | null;
          p_contacto_emergencia_telefono: string | null;
          p_alergias: string | null;
          p_medicacion_base: string | null;
          p_objetivos: string | null;
          p_motivo_consulta_inicial: string | null;
          p_experiencia_terapia: string | null;
          p_consentimiento_rgpd: boolean;
          p_tags: readonly string[] | null;
          p_color_etiqueta: string | null;
        };
        Returns: string;
      };
      paciente_autoregistro_cifrada: {
        Args: {
          p_nombre_completo: string;
          p_dni_nie: string;
          p_telefono?: string | null;
          p_email?: string | null;
          p_fecha_nacimiento?: string | null;
          p_direccion?: string | null;
          p_contacto_emergencia_nombre?: string | null;
          p_contacto_emergencia_telefono?: string | null;
          p_alergias?: string | null;
          p_medicacion_base?: string | null;
          p_objetivos?: string | null;
          p_motivo_consulta_inicial?: string | null;
          p_experiencia_terapia?: string | null;
          p_consentimiento_rgpd?: boolean;
        };
        Returns: string;
      };
      paciente_actualizar_cifrado: {
        Args: { p_id: string; p_cambios: Record<string, string | null> };
        Returns: boolean;
      };
      paciente_revelar_campo: {
        Args: {
          p_id: string;
          p_campo: string;
          p_justificacion?: string | null;
          p_ip?: string | null;
          p_user_agent?: string | null;
        };
        Returns: string | null;
      };
      paciente_buscar_por_campo: {
        Args: { p_campo: 'email' | 'dni_nie' | 'telefono'; p_valor: string };
        Returns: string | null;
      };
      diagnostico_crear_cifrado: {
        Args: {
          p_paciente_id: string;
          p_titulo: string;
          p_cie_code: string | null;
          p_descripcion: string | null;
          p_notas: string | null;
          p_severidad: 'leve' | 'moderado' | 'severo' | null;
          p_estado: string;
          p_fecha_inicio: string;
        };
        Returns: string;
      };
      medicacion_crear_cifrada: {
        Args: {
          p_paciente_id: string;
          p_nombre: string;
          p_dosis: string | null;
          p_frecuencia: string | null;
          p_via: string | null;
          p_prescrita_por: string | null;
          p_notas: string | null;
          p_fecha_inicio: string;
          p_fecha_fin: string | null;
        };
        Returns: string;
      };
      nota_cita_guardar_cifrada: {
        Args: {
          p_cita_id: string;
          p_paciente_id: string;
          p_contenido: string;
        };
        Returns: string;
      };
      registro_clinico_descifrar: {
        Args: {
          p_tabla: string;
          p_id: string;
          p_campo: string;
          p_paciente_id: string | null;
          p_justificacion: string | null;
        };
        Returns: string | null;
      };
      paciente_dx_med_bulk_descifrar: {
        Args: { p_paciente_id: string };
        Returns: {
          diagnosticos: Array<{
            id: string;
            titulo: string | null;
            notas: string | null;
            cie_code: string | null;
            severidad: 'leve' | 'moderado' | 'severo' | null;
            estado: string | null;
            fecha_inicio: string | null;
            fecha_fin: string | null;
            activo: boolean;
            created_at: string;
          }>;
          medicacion: Array<{
            id: string;
            nombre: string;
            dosis: string | null;
            frecuencia: string | null;
            via: string | null;
            prescrita_por: string | null;
            notas: string | null;
            fecha_inicio: string | null;
            fecha_fin: string | null;
            activo: boolean;
            created_at: string;
          }>;
        };
      };
      bono_asignar_manual: {
        Args: {
          p_paciente_id: string;
          p_servicio_id: string;
          p_sesiones: number;
          p_metodo: 'tarjeta' | 'transferencia' | 'regalo' | 'efectivo' | 'klarna';
          p_importe_centimos: number;
          p_validez_dias: number;
          p_notas: string | null;
          p_excluir_facturacion: boolean;
        };
        Returns: {
          bono_id: string;
          pago_id: string;
        };
      };
      append_auditoria: {
        Args: {
          p_usuario_id: string;
          p_accion: string;
          p_tabla_afectada: string | null;
          p_registro_id: string | null;
          p_detalles: Record<string, unknown> | null;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      cita_estado: CitaEstado;
      pago_estado: PagoEstado;
      bono_estado: BonoEstado;
      conversacion_estado: ConversacionEstado;
      recurso_tipo: RecursoTipo;
      recurso_categoria: RecursoCategoria;
    };
    CompositeTypes: Record<string, never>;
  };
}
