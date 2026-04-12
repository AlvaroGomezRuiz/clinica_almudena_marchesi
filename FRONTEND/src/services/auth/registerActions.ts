"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

function redirectRegistroError(message: string, plan: string): never {
  const params = new URLSearchParams();
  if (plan) params.set("plan", plan);
  params.set("error", message);
  redirect(`/registro-paciente?${params.toString()}`);
}

function redirectOtpError(message: string, plan: string): never {
  const params = new URLSearchParams();
  if (plan) params.set("plan", plan);
  params.set("error", message);
  redirect(`/registro-paciente/verificar?${params.toString()}`);
}

export async function startRegistrationAction(
  formData: FormData
): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const nombreCompleto = String(formData.get("nombre_completo") ?? "").trim();
  const dniNie = String(formData.get("dni_nie") ?? "").trim();
  const telefonoRaw = String(formData.get("telefono") ?? "").trim();
  const experienciaTerapiaRaw = String(
    formData.get("experiencia_terapia") ?? ""
  ).trim();
  const motivoConsulta = String(
    formData.get("motivo_consulta_inicial") ?? ""
  ).trim();
  const fechaNacimientoRaw = String(formData.get("fecha_nacimiento") ?? "").trim();
  const planRaw = String(formData.get("plan") ?? "").trim();
  const plan = /^[a-zA-Z0-9_-]{1,64}$/.test(planRaw) ? planRaw : "";

  if (!email) {
    redirectRegistroError("Email obligatorio.", plan);
  }

  if (!nombreCompleto) {
    redirectRegistroError("Nombre completo obligatorio.", plan);
  }

  if (!dniNie) {
    redirectRegistroError("DNI/NIE obligatorio.", plan);
  }

  const backendUrl =
    process.env.BACKEND_URL ?? "http://localhost:8000/api/v1/auth";

  const res = await fetch(`${backendUrl}/register/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
    cache: "no-store",
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const detail =
      typeof (data as any)?.detail === "string" ? (data as any).detail : null;
    const message =
      typeof (data as any)?.message === "string" ? (data as any).message : null;

    redirectRegistroError(
      detail ?? message ?? `Registro fallido (${res.status})`,
      plan
    );
  }

  cookies().set("draft_email", email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 15 * 60,
  });

  cookies().set("draft_paciente_nombre", nombreCompleto.slice(0, 100), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 15 * 60,
  });

  cookies().set("draft_paciente_dni", dniNie.slice(0, 32), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 15 * 60,
  });

  const telefono = telefonoRaw ? telefonoRaw.replace(/\s+/g, "") : "";
  if (telefono) {
    cookies().set("draft_paciente_telefono", telefono.slice(0, 20), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
    });
  }

  if (motivoConsulta) {
    cookies().set("draft_paciente_motivo", motivoConsulta.slice(0, 2000), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
    });
  }

  const experienciaTerapia = /^[a-zA-Z0-9_-]{1,64}$/.test(experienciaTerapiaRaw)
    ? experienciaTerapiaRaw
    : "";

  if (experienciaTerapia) {
    cookies().set("draft_paciente_experiencia", experienciaTerapia, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
    });
  }

  if (fechaNacimientoRaw) {
    cookies().set("draft_paciente_fn", fechaNacimientoRaw.slice(0, 32), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
    });
  }

  if (plan) {
    cookies().set("draft_plan", plan, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
    });
  }

  redirect(
    plan
      ? `/registro-paciente/verificar?plan=${encodeURIComponent(plan)}`
      : "/registro-paciente/verificar"
  );
}

export async function verifyOtpAction(
  formData: FormData
): Promise<void> {
  const draftEmail = cookies().get("draft_email")?.value;
  const draftPlanRaw = cookies().get("draft_plan")?.value ?? "";
  const draftPlan = /^[a-zA-Z0-9_-]{1,64}$/.test(draftPlanRaw) ? draftPlanRaw : "";

  const draftNombre = cookies().get("draft_paciente_nombre")?.value ?? "";
  const draftDni = cookies().get("draft_paciente_dni")?.value ?? "";
  const draftTelefono = cookies().get("draft_paciente_telefono")?.value ?? "";
  const draftMotivo = cookies().get("draft_paciente_motivo")?.value ?? "";
  const draftExperiencia = cookies().get("draft_paciente_experiencia")?.value ?? "";
  const draftFn = cookies().get("draft_paciente_fn")?.value ?? "";

  const code = String(formData.get("code") ?? "")
    .trim()
    .replace(/\s+/g, "");

  const password = String(formData.get("password") ?? "").trim();
  const passwordConfirm = String(formData.get("password_confirm") ?? "").trim();

  if (!draftEmail) {
    redirectRegistroError("Sesión de registro expirada. Reinicia el registro.", draftPlan);
  }

  if (!code) {
    redirectOtpError("Código obligatorio.", draftPlan);
  }

  if (!password || !passwordConfirm) {
    redirectOtpError("Contraseña y confirmación obligatorias.", draftPlan);
  }

  const backendUrl =
    process.env.BACKEND_URL ?? "http://localhost:8000/api/v1/auth";

  const res = await fetch(`${backendUrl}/register/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: draftEmail,
      code,
      password,
      password_confirm: passwordConfirm,
    }),
    cache: "no-store",
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const detail =
      typeof (data as any)?.detail === "string" ? (data as any).detail : null;
    const message =
      typeof (data as any)?.message === "string" ? (data as any).message : null;

    redirectOtpError(detail ?? message ?? `OTP inválido (${res.status})`, draftPlan);
  }

  const h = headers();
  const userAgent = h.get("user-agent") ?? "";
  const forwardedFor = h.get("x-forwarded-for") ?? h.get("X-Forwarded-For") ?? "";
  const realIp = h.get("x-real-ip") ?? h.get("X-Real-IP") ?? "";

  const loginRes = await fetch(`${backendUrl}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userAgent ? { "User-Agent": userAgent } : {}),
      ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
      ...(realIp ? { "X-Real-IP": realIp } : {}),
    },
    body: JSON.stringify({
      username: draftEmail,
      password,
      trust_device: false,
      device_fingerprint: null,
    }),
    cache: "no-store",
  });

  const loginData: unknown = await loginRes.json().catch(() => null);

  if (!loginRes.ok) {
    const detail =
      typeof (loginData as any)?.detail === "string" ? (loginData as any).detail : null;
    const message =
      typeof (loginData as any)?.message === "string" ? (loginData as any).message : null;

    redirectOtpError(
      detail ?? message ?? `Login fallido tras OTP (${loginRes.status})`,
      draftPlan
    );
  }

  const jwt =
    typeof (loginData as any)?.access_token === "string"
      ? (loginData as any).access_token
      : typeof (loginData as any)?.jwt === "string"
        ? (loginData as any).jwt
        : typeof (loginData as any)?.token === "string"
          ? (loginData as any).token
          : null;

  if (!jwt) {
    redirectOtpError("JWT ausente tras OTP.", draftPlan);
  }

  // Crea el perfil Paciente (cifrado en backend) para habilitar el checkout.
  const backendApiUrl =
    process.env.BACKEND_API_URL ?? "http://localhost:8000/api/v1";

  const parseFechaNacimiento = (raw: string): string | null => {
    const v = raw.trim();
    if (!v) return null;

    const cleaned = v.replace(/\s+/g, "");

    // YYYY-MM-DD (input type=date)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

    // DD/MM/YYYY o DD-MM-YYYY
    const m = cleaned.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (!m) return null;
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    if (dd < 1 || dd > 31 || mm < 1 || mm > 12 || yyyy < 1900) return null;
    const iso = `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    return iso;
  };

  const pacientePayload: Record<string, unknown> = {
    dni_nie: draftDni,
    nombre_completo: draftNombre,
    email: draftEmail,
  };

  if (draftTelefono) pacientePayload.telefono = draftTelefono;
  if (draftMotivo) {
    pacientePayload.motivo_consulta_inicial = draftMotivo;
    pacientePayload.motivo_consulta = draftMotivo;
  }
  if (draftExperiencia) pacientePayload.experiencia_terapia = draftExperiencia;
  const fnIso = parseFechaNacimiento(draftFn);
  if (fnIso) pacientePayload.fecha_nacimiento = fnIso;

  const pacienteRes = await fetch(`${backendApiUrl}/pacientes/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(pacientePayload),
    cache: "no-store",
  });

  if (!pacienteRes.ok) {
    const pacienteData: unknown = await pacienteRes.json().catch(() => null);
    const detail =
      typeof (pacienteData as any)?.detail === "string"
        ? (pacienteData as any).detail
        : null;

    const isConflict =
      pacienteRes.status === 400 && typeof detail === "string" && detail.includes("Conflicto");

    if (!isConflict) {
      redirectOtpError(
        detail ?? `Alta de paciente fallida (${pacienteRes.status})`,
        draftPlan
      );
    }
  }

  cookies().set("auth_token", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  cookies().delete("draft_email");
  cookies().delete("draft_plan");
  cookies().delete("draft_paciente_nombre");
  cookies().delete("draft_paciente_dni");
  cookies().delete("draft_paciente_telefono");
  cookies().delete("draft_paciente_motivo");
  cookies().delete("draft_paciente_experiencia");
  cookies().delete("draft_paciente_fn");

  redirect(draftPlan ? `/pagos?plan=${encodeURIComponent(draftPlan)}` : "/pagos");
}
