export interface FreeSlotsQuery {
  from_iso: string;
  to_iso: string;
  duration_min: number;
  servicio_id?: string;
}

export interface FreeSlotItem {
  inicio_iso: string;
  fin_iso: string;
}

export interface FreeSlotsResponse {
  items: FreeSlotItem[];
}

export interface CitaReserveRequest {
  servicio_id: string;
  inicio_iso: string;
}

export interface CitaReserveResponse {
  cita_id: string;
  inicio_iso: string;
  fin_iso: string;
  estado: string;
}

