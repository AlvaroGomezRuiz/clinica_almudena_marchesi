import Link from 'next/link';
import { Fragment } from 'react';

type AgendaPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

type Day = {
  id: string;
  label: string;
};

type TimeSlot = {
  id: string;
  label: string;
};

const DAYS: Day[] = [
  { id: 'lun', label: 'Lunes' },
  { id: 'mar', label: 'Martes' },
  { id: 'mie', label: 'Miércoles' },
  { id: 'jue', label: 'Jueves' },
  { id: 'vie', label: 'Viernes' },
];

const TIMES: TimeSlot[] = [
  { id: '10:00', label: '10:00' },
  { id: '11:00', label: '11:00' },
  { id: '12:00', label: '12:00' },
  { id: '16:00', label: '16:00' },
  { id: '17:00', label: '17:00' },
  { id: '18:00', label: '18:00' },
];

function slotId(dayId: string, timeId: string): string {
  return `${dayId}_${timeId}`;
}

function isOccupied(id: string): boolean {
  // Vista anónima: solo estados "Libre"/"Ocupado" (sin datos de pacientes).
  // Patrón determinista (no depende de datos sensibles).
  const occupied = new Set<string>([
    'lun_10:00',
    'lun_17:00',
    'mar_11:00',
    'mie_12:00',
    'jue_16:00',
    'vie_18:00',
  ]);
  return occupied.has(id);
}

export default function AgendaPage({ searchParams }: AgendaPageProps) {
  const selectedSlotRaw = searchParams?.slot;
  const selectedSlot =
    typeof selectedSlotRaw === 'string' ? selectedSlotRaw : '';

  return (
    <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto min-h-screen bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container">
      <header className="mb-12 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 leading-tight">
          Agenda
        </h1>
        <p className="text-secondary font-body text-lg leading-relaxed">
          Disponibilidad anónima: solo verás huecos <strong>Libres</strong> u{' '}
          <strong>Ocupados</strong>.
        </p>
      </header>

      <section className="bg-surface-container-lowest rounded-xl editorial-shadow border border-outline-variant/10 overflow-hidden">
        <div className="grid grid-cols-6">
          <div className="p-4 bg-surface-container-low border-b border-outline-variant/10" />
          {DAYS.map((d) => (
            <div
              key={d.id}
              className="p-4 bg-surface-container-low border-b border-outline-variant/10 text-center"
            >
              <span className="font-label text-xs uppercase tracking-widest text-secondary font-bold">
                {d.label}
              </span>
            </div>
          ))}

          {TIMES.map((t) => (
            <Fragment key={t.id}>
              <div
                key={t.id}
                className="p-4 bg-surface-container-low border-b border-outline-variant/10 flex items-center justify-center"
              >
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                  {t.label}
                </span>
              </div>

              {DAYS.map((d) => {
                const id = slotId(d.id, t.id);
                const occupied = isOccupied(id);
                const isSelected = selectedSlot === id;

                const baseClass =
                  'p-4 border-b border-outline-variant/10 flex items-center justify-center';

                if (occupied) {
                  return (
                    <div
                      key={id}
                      className={`${baseClass} bg-surface-container-low`}
                    >
                      <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
                        Ocupado
                      </span>
                    </div>
                  );
                }

                const nextPath = `/agenda?slot=${encodeURIComponent(id)}`;
                const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;

                return (
                  <Link
                    key={id}
                    href={loginHref}
                    className={
                      isSelected
                        ? `${baseClass} bg-primary-container/60 ring-2 ring-primary/60`
                        : `${baseClass} bg-surface hover:bg-primary-container/30 transition-colors`
                    }
                  >
                    <span className="font-label text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
                      Libre
                    </span>
                  </Link>
                );
              })}
            </Fragment>
          ))}
        </div>
      </section>
    </main>
  );
}
