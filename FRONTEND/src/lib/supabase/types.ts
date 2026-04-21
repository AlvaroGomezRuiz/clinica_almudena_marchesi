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
  activo: boolean;
  created_at: string;
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

export interface NotificacionesPrefs {
  user_id: string;
  welcome: boolean;
  booking_confirmed: boolean;
  booking_cancelled: boolean;
  reminder_24h: boolean;
  nueva_asignacion: boolean;
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

/**
 * Shape mínimo del schema para `createClient<Database>()`.
 * Una vez generemos types con el CLI, reemplazar por la versión completa.
 *
 * Nota: `Relationships: []` es REQUERIDO por supabase-js para inferencia correcta.
 */
type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
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
    };
    Views: {
      v_citas_expandidas: {
        Row: Cita & {
          servicio_nombre: string;
          duracion_minutos: number;
          precio_centimos: number;
          paciente_user_id: string | null;
        };
        Relationships: [];
      };
      v_conversaciones_admin: {
        Row: {
          conversacion_id: string;
          paciente_id: string;
          paciente_display_name: string | null;
          paciente_email: string | null;
          last_message_at: string | null;
          estado: ConversacionEstado;
          unread_admin: number;
          unread_paciente: number;
        };
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
      reservar_cita: {
        Args: { p_servicio_id: string; p_slot_inicio: string };
        Returns: Array<{
          cita_id: string;
          estado: CitaEstado;
          consumio_bono: boolean;
        }>;
      };
      chat_mi_conversacion: { Args: Record<string, never>; Returns: string };
      chat_enviar_mensaje: {
        Args: { p_conversacion_id: string; p_body: string };
        Returns: Array<{ mensaje_id: string }>;
      };
      chat_marcar_leidos: { Args: { p_conversacion_id: string }; Returns: boolean };
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
