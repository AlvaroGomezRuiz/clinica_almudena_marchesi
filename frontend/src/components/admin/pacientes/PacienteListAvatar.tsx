export interface PacienteListAvatarProps {
  readonly imageUrl: string | null;
  readonly initials: string;
  /** Color hex/rgba de etiqueta clínica (fallback iniciales). */
  readonly colorEtiqueta: string | null;
  /** `md` = 40px (listado pacientes), `lg` = 48px (p. ej. bandeja mensajes). */
  readonly size?: 'md' | 'lg';
  readonly className?: string;
}

const SIZE_CLASS: { readonly [K in 'md' | 'lg']: string } = {
  md: 'h-10 w-10 text-[0.82rem]',
  lg: 'h-12 w-12 text-[0.88rem]',
};

const SIZE_PX: { readonly [K in 'md' | 'lg']: number } = {
  md: 40,
  lg: 48,
};

const BASE =
  'shrink-0 rounded-full object-cover font-display font-medium text-ink ring-1 ring-inset ring-ink/10 tabular-nums dark:text-white dark:ring-white/15';

/**
 * Avatar de fila en el listado admin: foto si hay URL, si no iniciales con tinte suave.
 */
export default function PacienteListAvatar({
  imageUrl,
  initials,
  colorEtiqueta,
  size = 'md',
  className,
}: PacienteListAvatarProps): JSX.Element {
  const dim = SIZE_PX[size];
  const dimCls = SIZE_CLASS[size];
  const trimmed = imageUrl?.trim();
  if (trimmed) {
    return (
      // Listado: URLs de Storage/portal; se validan en RLS, no se inyecta HTML.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={trimmed}
        alt=""
        width={dim}
        height={dim}
        className={`object-cover ${BASE} ${dimCls} ${className ?? ''}`.trim()}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      className={`grid place-items-center ${BASE} ${dimCls} ${className ?? ''}`.trim()}
      style={{
        background: colorEtiqueta
          ? `${colorEtiqueta}20`
          : 'rgba(75, 100, 95, 0.12)',
      }}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  );
}
