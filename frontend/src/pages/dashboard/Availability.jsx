import { useState, useEffect, useRef, useCallback } from 'react';
import { bookingsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner } from '../../components/ui';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h–20h
const SLOT_HEIGHT = 48; // px per hour
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmt(h, m = 0) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function roundQ(min) { return Math.round(min / 15) * 15; }

export default function Availability() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [dragging, setDragging] = useState(null);
  const gridRef = useRef(null);

  const fetchSlots = useCallback(() => {
    setLoading(true);
    bookingsAPI.getSlots()
      .then(({ data }) => setSlots(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const prevWeek = () => setWeekStart(p => { const d = new Date(p); d.setDate(d.getDate() - 7); return d; });
  const nextWeek = () => setWeekStart(p => { const d = new Date(p); d.setDate(d.getDate() + 7); return d; });
  const goToday  = () => setWeekStart(getMonday(new Date()));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  });

  const weekLabel = (() => {
    const f = weekDays[0], l = weekDays[6];
    return f.getMonth() === l.getMonth()
      ? `${f.getDate()} – ${l.getDate()} ${MONTHS_FR[f.getMonth()]} ${f.getFullYear()}`
      : `${f.getDate()} ${MONTHS_FR[f.getMonth()]} – ${l.getDate()} ${MONTHS_FR[l.getMonth()]} ${l.getFullYear()}`;
  })();

  const daySlots = (day) => slots.filter(s => isSameDay(new Date(s.start), day));

  const yToTime = useCallback((y) => {
    const total = (y / SLOT_HEIGHT) * 60 + 7 * 60;
    const h = Math.floor(total / 60);
    let m = roundQ(total % 60);
    if (m >= 60) { return { hour: Math.min(h + 1, 21), min: 0 }; }
    return { hour: Math.max(7, Math.min(21, h)), min: m };
  }, []);

  const handleMouseDown = (e, dayIdx) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const { hour, min } = yToTime(e.clientY - rect.top);
    setDragging({ dayIdx, sH: hour, sM: min, eH: hour, eM: min + 15 });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const cols = gridRef.current?.querySelectorAll('[data-day-col]');
    if (!cols?.[dragging.dayIdx]) return;
    const rect = cols[dragging.dayIdx].getBoundingClientRect();
    const y = Math.max(0, Math.min(e.clientY - rect.top, HOURS.length * SLOT_HEIGHT));
    const { hour, min } = yToTime(y);
    setDragging(p => ({ ...p, eH: hour, eM: min }));
  }, [dragging, yToTime]);

  const handleMouseUp = useCallback(async () => {
    if (!dragging) return;
    let { dayIdx, sH, sM, eH, eM } = dragging;
    setDragging(null);
    let s = sH * 60 + sM, e2 = eH * 60 + eM;
    if (e2 < s) [s, e2] = [e2, s];
    if (e2 - s < 15) return;
    sH = Math.floor(s / 60); sM = s % 60; eH = Math.floor(e2 / 60); eM = e2 % 60;
    const day = weekDays[dayIdx];
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    const ds = `${yyyy}-${mm}-${dd}`;
    const start = `${ds}T${fmt(sH, sM)}:00`, end = `${ds}T${fmt(eH, eM)}:00`;
    if (new Date(start) < new Date()) { toast.error('Impossible de créer un créneau dans le passé.'); return; }
    try { await bookingsAPI.createSlot({ start, end }); toast.success('Créneau ajouté !'); fetchSlots(); }
    catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error
        || err.response?.data?.start?.[0] || err.response?.data?.end?.[0]
        || err.response?.data?.non_field_errors?.[0]
        || 'Erreur lors de la création. Vérifiez que le backend est accessible.';
      toast.error(msg);
    }
  }, [dragging, weekDays, fetchSlots]);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce créneau ?')) return;
    try { await bookingsAPI.deleteSlot(id); toast.success('Créneau supprimé'); fetchSlots(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Erreur.'); }
  };

  const renderSlot = (slot) => {
    const st = new Date(slot.start), en = new Date(slot.end);
    const sMin = st.getHours() * 60 + st.getMinutes() - 420;
    const eMin = en.getHours() * 60 + en.getMinutes() - 420;
    const top = (sMin / 60) * SLOT_HEIGHT;
    const height = Math.max(((eMin - sMin) / 60) * SLOT_HEIGHT, 12);
    const label = `${fmt(st.getHours(), st.getMinutes())} – ${fmt(en.getHours(), en.getMinutes())}`;
    return (
      <div key={slot.id} title={`${label}${slot.is_booked ? ' (Réservé)' : ''}`}
        className={`absolute left-1 right-1 rounded-md px-2 py-1 text-xs cursor-default group overflow-hidden border ${
          slot.is_booked
            ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
            : 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
        }`} style={{ top: `${top}px`, height: `${height}px` }}>
        <div className="flex items-center justify-between h-full">
          <div className="truncate">
            <span className="font-medium">{label}</span>
            {height >= 36 && <span className="block text-[10px] opacity-70">{slot.is_booked ? 'Réservé' : 'Disponible'}</span>}
          </div>
          {!slot.is_booked && (
            <button onClick={(e) => handleDelete(e, slot.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600 transition flex-shrink-0">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDragPreview = (dayIdx) => {
    if (!dragging || dragging.dayIdx !== dayIdx) return null;
    const s = dragging.sH * 60 + dragging.sM, e2 = dragging.eH * 60 + dragging.eM;
    const topM = Math.min(s, e2) - 420, botM = Math.max(s, e2) - 420;
    const top = (topM / 60) * SLOT_HEIGHT, h = Math.max(((botM - topM) / 60) * SLOT_HEIGHT, 4);
    const sH2 = Math.floor((topM + 420) / 60), sM2 = (topM + 420) % 60;
    const eH2 = Math.floor((botM + 420) / 60), eM2 = (botM + 420) % 60;
    return (
      <div className="absolute left-1 right-1 rounded-md bg-brand-200/60 dark:bg-brand-700/40 border-2 border-brand-400 dark:border-brand-500 border-dashed z-10 pointer-events-none flex items-center justify-center"
        style={{ top: `${top}px`, height: `${h}px` }}>
        {h >= 24 && <span className="text-[11px] font-semibold text-brand-700 dark:text-brand-200">{fmt(sH2, sM2)} – {fmt(eH2, eM2)}</span>}
      </div>
    );
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <DashboardLayout>
      <PageHeader title="Mes disponibilités" description="Cliquez et glissez sur le calendrier pour créer des créneaux" />

      {/* Week nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition">Aujourd'hui</button>
          <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <h2 className="text-lg font-bold text-black dark:text-white">{weekLabel}</h2>
      </div>

      {loading ? <LoadingSpinner /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto" ref={gridRef}>
            <div className="min-w-[700px]">
              {/* Header */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-800">
                <div className="p-2" />
                {weekDays.map((day, i) => {
                  const isToday = isSameDay(day, new Date());
                  const isPast = day < today;
                  return (
                    <div key={i} className={`p-2 text-center border-l border-gray-200 dark:border-gray-800 ${isPast ? 'opacity-40' : ''}`}>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{DAYS_FR[i]}</div>
                      <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-white bg-brand-500 w-8 h-8 rounded-full flex items-center justify-center mx-auto' : 'text-black dark:text-white'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
                <div className="relative">
                  {HOURS.map(h => (
                    <div key={h} className="border-b border-gray-100 dark:border-gray-800/50 text-[11px] text-gray-400 dark:text-gray-500 pr-2 text-right flex items-start justify-end pt-0.5" style={{ height: `${SLOT_HEIGHT}px` }}>
                      {fmt(h)}
                    </div>
                  ))}
                </div>
                {weekDays.map((day, dayIdx) => {
                  const isPast = day < today;
                  return (
                    <div key={dayIdx} data-day-col={dayIdx}
                      className={`relative border-l border-gray-200 dark:border-gray-800 ${isPast ? 'bg-gray-50 dark:bg-gray-900/50 cursor-not-allowed' : 'cursor-crosshair'}`}
                      style={{ height: `${HOURS.length * SLOT_HEIGHT}px` }}
                      onMouseDown={isPast ? undefined : (e) => handleMouseDown(e, dayIdx)}>
                      {HOURS.map(h => (
                        <div key={h} className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-800/50" style={{ top: `${(h - 7) * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}>
                          <div className="absolute left-0 right-0 border-b border-dashed border-gray-50 dark:border-gray-800/30" style={{ top: `${SLOT_HEIGHT / 2}px` }} />
                        </div>
                      ))}
                      {daySlots(day).map(renderSlot)}
                      {renderDragPreview(dayIdx)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700" /> Disponible</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700" /> Réservé</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-brand-200/60 dark:bg-brand-700/40 border-2 border-dashed border-brand-400 dark:border-brand-500" /> Nouveau (glisser)</div>
      </div>
    </DashboardLayout>
  );
}
