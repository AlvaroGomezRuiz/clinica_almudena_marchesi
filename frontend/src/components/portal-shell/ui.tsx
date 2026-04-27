/**
 * Primitivas UI compartidas entre portal-paciente y portal-admin.
 *
 * Filosofía "Editorial Serenity":
 *   - Sin bordes duros (1px) — usamos shifts de surface-container
 *   - Glass panels con backdrop-blur 16-20px
 *   - Radios generosos (rounded-3xl) para empatía
 *   - Tipografía serif para headlines, sans para datos
 *   - Sombras teñidas con primary (#4b645f) en lugar de negro
 */
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// SurfaceCard — panel base liquid glass con arquitectura Double-Bezel opcional
// ---------------------------------------------------------------------------
interface SurfaceCardProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly as?: 'div' | 'section' | 'article';
  readonly variant?: 'glass' | 'solid' | 'outline' | 'hero';
  readonly interactive?: boolean;
  readonly bezel?: boolean;
  readonly glow?: 'none' | 'sage' | 'warm';
}

export function SurfaceCard({
  children,
  className = '',
  as: Tag = 'div',
  variant = 'glass',
  interactive = false,
  bezel = false,
  glow = 'none',
}: SurfaceCardProps) {
  const inner =
    variant === 'hero'
      ? 'relative rounded-[1.75rem] p-7 md:p-10 bg-gradient-to-br from-white/85 via-white/70 to-[#F1ECE0]/60 dark:from-white/[0.06] dark:via-white/[0.03] dark:to-white/[0.02] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_28px_70px_-32px_rgba(28,28,25,0.22)]'
      : variant === 'glass'
        ? 'relative rounded-[1.625rem] p-6 md:p-7 bg-white/60 dark:bg-white/[0.035] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_20px_48px_-24px_rgba(75,100,95,0.14)]'
        : variant === 'solid'
          ? 'relative rounded-[1.625rem] p-6 md:p-7 bg-white dark:bg-canvas-alt shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_32px_-16px_rgba(75,100,95,0.12)]'
          : 'relative rounded-[1.625rem] p-6 md:p-7 ring-1 ring-ink/8';

  const motion =
    'transition-[transform,box-shadow,background-color] duration-[600ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]';
  const hover = interactive
    ? 'hover:-translate-y-[3px] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_30px_70px_-20px_rgba(75,100,95,0.22)] cursor-pointer'
    : '';

  const glowLayer =
    glow === 'sage'
      ? 'before:pointer-events-none before:absolute before:-inset-px before:rounded-[inherit] before:bg-[radial-gradient(120%_80%_at_0%_0%,rgba(75,100,95,0.10),transparent_55%)]'
      : glow === 'warm'
        ? 'before:pointer-events-none before:absolute before:-inset-px before:rounded-[inherit] before:bg-[radial-gradient(120%_80%_at_100%_0%,rgba(200,155,90,0.12),transparent_55%)]'
        : '';

  const core = `${inner} ${motion} ${hover} ${glowLayer} ${className}`;

  if (!bezel) {
    return <Tag className={core}>{children}</Tag>;
  }

  return (
    <Tag className="relative rounded-[2rem] p-[5px] bg-[linear-gradient(140deg,rgba(255,255,255,0.7),rgba(255,255,255,0.25)_40%,rgba(75,100,95,0.08))] dark:bg-[linear-gradient(140deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_40%,rgba(255,255,255,0.04))] shadow-[0_40px_90px_-40px_rgba(28,28,25,0.28)]">
      <div className={core}>{children}</div>
    </Tag>
  );
}

// ---------------------------------------------------------------------------
// PageHeader — título seccional editorial
// ---------------------------------------------------------------------------
interface PageHeaderProps {
  readonly eyebrow?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-12 flex flex-col gap-7 md:mb-14 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink/8 bg-white/50 px-3 py-1 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary dark:bg-primary-fixed-dim" aria-hidden="true" />
            <span className="font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-soft dark:text-white/65">
              {eyebrow}
            </span>
          </div>
        ) : null}
        <h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] italic leading-[1.02] text-ink text-balance tracking-[-0.025em] dark:text-white">
          {title}
        </h1>
        {description ? (
          <p className="mt-5 max-w-xl font-body text-[0.98rem] leading-[1.65] text-ink-soft dark:text-white/70">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-3 md:w-auto">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

// ---------------------------------------------------------------------------
// StatCard — métrica editorial con delta
// ---------------------------------------------------------------------------
interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly delta?: {
    readonly value: string;
    readonly trend: 'up' | 'down' | 'flat';
  };
  readonly icon?: string;
  readonly footnote?: string;
}

export function StatCard({ label, value, delta, icon, footnote }: StatCardProps) {
  const trendCls =
    delta?.trend === 'up'
      ? 'bg-primary/10 text-primary dark:bg-primary/25 dark:text-white'
      : delta?.trend === 'down'
        ? 'bg-[#b2675e]/12 text-[#8c4d44] dark:bg-[#b2675e]/25 dark:text-[#f3b3aa]'
        : 'bg-ink/8 text-ink-soft dark:bg-white/10 dark:text-white/70';
  const trendIcon =
    delta?.trend === 'up' ? 'trending_up' : delta?.trend === 'down' ? 'trending_down' : 'trending_flat';

  return (
    <SurfaceCard>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-body text-[0.65rem] uppercase tracking-[0.22em] text-ink-muted dark:text-white/55">
            {label}
          </p>
          <p className="mt-4 font-display text-[clamp(2.25rem,3.5vw,2.875rem)] leading-[0.95] italic text-ink tabular-nums tracking-[-0.02em] dark:text-white">
            {value}
          </p>
          {delta ? (
            <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${trendCls}`}>
              <span className="material-symbols-outlined text-[0.95rem]" aria-hidden="true">
                {trendIcon}
              </span>
              <span className="font-body text-[0.72rem] font-medium tracking-tight">{delta.value}</span>
            </div>
          ) : null}
          {footnote ? (
            <p className="mt-3 font-body text-[0.72rem] text-ink-muted dark:text-white/55 tracking-tight">{footnote}</p>
          ) : null}
        </div>
        {icon ? (
          <span
            className="relative grid h-10 w-10 flex-shrink-0 place-items-center rounded-2xl bg-white/70 dark:bg-white/[0.04] ring-1 ring-inset ring-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-[1.2rem] text-primary/85">
              {icon}
            </span>
          </span>
        ) : null}
      </div>
    </SurfaceCard>
  );
}

// ---------------------------------------------------------------------------
// EmptyState — cuando no hay datos
// ---------------------------------------------------------------------------
interface EmptyStateProps {
  readonly icon?: string;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <SurfaceCard className="py-16 text-center">
      <span
        className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/70 ring-1 ring-inset ring-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:bg-white/[0.06] dark:ring-white/10"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-[1.5rem] text-primary/70 dark:text-primary-fixed-dim">{icon}</span>
      </span>
      <h3 className="mt-5 font-display text-[1.5rem] italic text-ink tracking-[-0.01em] dark:text-white">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm font-body text-[0.9rem] leading-[1.6] text-ink-soft dark:text-white/65">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
    </SurfaceCard>
  );
}

// ---------------------------------------------------------------------------
// SectionTitle — cabecera de sección con accent rule
// ---------------------------------------------------------------------------
interface SectionTitleProps {
  readonly kicker?: string;
  readonly title: string;
  readonly action?: ReactNode;
}

export function SectionTitle({ kicker, title, action }: SectionTitleProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {kicker ? (
          <p className="mb-2 font-body text-[0.62rem] uppercase tracking-[0.22em] text-ink-muted dark:text-white/55">
            {kicker}
          </p>
        ) : null}
        <h2 className="font-display text-[clamp(1.5rem,2.4vw,1.875rem)] italic text-ink leading-none tracking-[-0.015em] dark:text-white">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Button — botón editorial (primary/ghost/destructive)
// ---------------------------------------------------------------------------
interface BtnProps {
  readonly children: ReactNode;
  readonly variant?: 'primary' | 'ghost' | 'destructive' | 'surface';
  readonly size?: 'sm' | 'md' | 'lg';
  /** Nombre de glifo Material (subset); ignorado si `iconNode` está definido. */
  readonly icon?: string;
  /** Sustituye el glifo Material del extremo (p. ej. SVG local). */
  readonly iconNode?: ReactNode;
  readonly type?: 'button' | 'submit' | 'reset';
  readonly className?: string;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly name?: string;
  readonly value?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconNode,
  type = 'button',
  className = '',
  onClick,
  disabled,
  name,
  value,
}: BtnProps) {
  const sizeCls =
    size === 'sm'
      ? 'pl-4 pr-1.5 py-1.5 text-[0.78rem] gap-2'
      : size === 'lg'
        ? 'pl-7 pr-2 py-2 text-[0.9rem] gap-3'
        : 'pl-5 pr-1.5 py-1.5 text-[0.84rem] gap-2.5';

  const sizeNoIcon =
    size === 'sm' ? 'px-4 py-2' : size === 'lg' ? 'px-7 py-3.5' : 'px-5 py-2.5';

  const variantCls =
    variant === 'primary'
      ? 'bg-primary text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_28px_-10px_rgba(75,100,95,0.45)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_36px_-10px_rgba(75,100,95,0.55)] hover:bg-primary-dim dark:bg-primary-fixed dark:text-[#1C1C19] dark:hover:bg-primary-fixed-dim'
      : variant === 'destructive'
        ? 'bg-[#b2675e] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_28px_-10px_rgba(178,103,94,0.45)] hover:bg-[#9e5a53]'
        : variant === 'surface'
          ? 'bg-white/75 text-ink ring-1 ring-inset ring-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_22px_-10px_rgba(75,100,95,0.18)] hover:bg-white backdrop-blur-md dark:bg-white/[0.06] dark:text-white dark:ring-white/10 dark:hover:bg-white/[0.1]'
          : 'text-ink-soft hover:text-ink hover:bg-ink/5 ring-1 ring-inset ring-ink/10 hover:ring-ink/20 dark:bg-white/[0.04] dark:text-white/80 dark:hover:text-white dark:hover:bg-white/[0.08] dark:ring-white/15 dark:hover:ring-white/25';

  const iconPillCls =
    variant === 'primary'
      ? 'bg-white/15 text-on-primary group-hover:bg-white/25 dark:bg-black/20 dark:text-[#1C1C19] dark:group-hover:bg-black/30'
      : variant === 'destructive'
        ? 'bg-white/15 text-white group-hover:bg-white/25'
        : variant === 'surface'
          ? 'bg-primary/10 text-primary group-hover:bg-primary/15 dark:bg-primary/30 dark:text-white dark:group-hover:bg-primary/40'
          : 'bg-ink/8 text-ink group-hover:bg-ink/12 dark:bg-white/10 dark:text-white dark:group-hover:bg-white/15';

  const motion =
    'transition-[transform,box-shadow,background-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      name={name}
      value={value}
      className={`group relative inline-flex items-center rounded-full font-display font-medium tracking-tight disabled:opacity-50 disabled:cursor-not-allowed ${icon || iconNode ? sizeCls : sizeNoIcon} ${variantCls} ${motion} ${className}`}
    >
      <span className="whitespace-nowrap">{children}</span>
      {iconNode ? (
        <span
          className={`ml-auto grid h-7 w-7 place-items-center rounded-full text-current transition-[transform,background-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[2px] group-hover:-translate-y-[1px] ${iconPillCls}`}
          aria-hidden="true"
        >
          {iconNode}
        </span>
      ) : icon ? (
        <span
          className={`ml-auto grid h-7 w-7 place-items-center rounded-full transition-[transform,background-color] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[2px] group-hover:-translate-y-[1px] ${iconPillCls}`}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[1rem] normal-case">{icon}</span>
        </span>
      ) : null}
    </button>
  );
}

// ---------------------------------------------------------------------------
// SectionDivider — separador editorial (sin línea)
// ---------------------------------------------------------------------------
export function SectionDivider({ label }: { label?: string }) {
  return (
    <div className="my-10 flex items-center gap-4">
      <span className="h-px flex-1 bg-ink/10 dark:bg-white/10" />
      {label ? (
        <span className="font-body text-[0.7rem] uppercase tracking-[0.2em] text-ink-muted dark:text-white/55">
          {label}
        </span>
      ) : null}
      <span className="h-px flex-1 bg-ink/10 dark:bg-white/10" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chip — estado / badge
// ---------------------------------------------------------------------------
interface ChipProps {
  readonly children: ReactNode;
  readonly tone?: 'neutral' | 'positive' | 'warning' | 'critical' | 'info';
}

export function Chip({ children, tone = 'neutral' }: ChipProps) {
  const toneCls =
    tone === 'positive'
      ? 'bg-primary/10 text-primary ring-primary/15 dark:bg-primary/25 dark:text-white dark:ring-primary/30'
      : tone === 'warning'
        ? 'bg-[#c89b5a]/15 text-[#8a6530] ring-[#c89b5a]/25 dark:bg-[#c89b5a]/20 dark:text-[#e9c88a] dark:ring-[#c89b5a]/35'
        : tone === 'critical'
          ? 'bg-[#b2675e]/12 text-[#8c4d44] ring-[#b2675e]/22 dark:bg-[#b2675e]/22 dark:text-[#f3b3aa] dark:ring-[#b2675e]/35'
          : tone === 'info'
            ? 'bg-[#456377]/10 text-[#456377] ring-[#456377]/18 dark:bg-[#456377]/28 dark:text-[#c5e4fc] dark:ring-[#456377]/40'
            : 'bg-ink/6 text-ink-soft ring-ink/10 dark:bg-white/8 dark:text-white/70 dark:ring-white/12';

  const dotCls =
    tone === 'positive'
      ? 'bg-primary'
      : tone === 'warning'
        ? 'bg-[#c89b5a]'
        : tone === 'critical'
          ? 'bg-[#b2675e]'
          : tone === 'info'
            ? 'bg-[#456377]'
            : 'bg-ink-muted';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset px-2.5 py-1 font-body text-[0.68rem] font-medium tracking-[0.02em] ${toneCls}`}
    >
      <span className={`h-1 w-1 rounded-full ${dotCls}`} aria-hidden="true" />
      {children}
    </span>
  );
}
