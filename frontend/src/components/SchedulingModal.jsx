import { useState, useEffect, useMemo } from 'react';
import { bookingsAPI } from '../services/api';
import { LoadingSpinner, EmptyState } from './ui';
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const SLOT_H = 40;

function getMonday(d) {
  const date = new Date(d); const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0); return date;
}
function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function fmt(h, m = 0) { return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }

export default function SchedulingModal({ quoteId, onClose, onBooked }) {
  const [allSlots, setAllSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  useEffect(() => {
    setLoading(true);
    bookingsAPI.getSlots({ quote: quoteId })
      .then(({ data }) => {
        const available = data.results || data;
        setAllSlots(available);
        if (available.length > 0) {
          const providerId = available[0].provider;
          if (providerId) {
            bookingsAPI.getSlots({ provider: providerId, include_booked: true })
              .then(({ data: d2 }) => {
                const all = d2.results || d2;
                setBookedSlots(all.filter(s => s.is_booked));
              }).catch(() => {});
          }
        }
      })
      .catch(() => toast.error('Impossible de charger les créneaux.'))
      .finally(() => setLoading(false));
  }, [quoteId]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      const { data } = await bookingsAPI.createBooking({ quote_id: quoteId, slot_id: selectedSlot, notes });
      toast.success('Réservation créée !');
      onBooked?.(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la réservation.');
    } finally { setSubmitting(false); }
  };

  const prevWeek = () => setWeekStart(p => { const d = new Date(p); d.setDate(d.getDate() - 7); return d; });
  const nextWeek = () => setWeekStart(p => { const d = new Date(p); d.setDate(d.getDate() + 7); return d; });

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  }), [weekStart]);

  const weekLabel = useMemo(() => {
    const f = weekDays[0], l = weekDays[6];
    return f.getMonth() === l.getMonth()
      ? `${f.getDate()} – ${l.getDate()} ${MONTHS_FR[f.getMonth()]}`
      : `${f.getDate()} ${MONTHS_FR[f.getMonth()]} – ${l.getDate()} ${MONTHS_FR[l.getMonth()]}`;
  }, [weekDays]);

  useEffect(() => {
    if (allSlots.length > 0) {
      const first = new Date(allSlots[0].start);
      setWeekStart(getMonday(first));
    }
  }, [allSlots]);

  const getDaySlots = (day, list) => list.filter(s => isSameDay(new Date(s.start), day));

  const renderSlotBlock = (slot, type) => {
    const st = new Date(slot.start), en = new Date(slot.end);
    const sMin = st.getHours() * 60 + st.getMinutes() - 420;
    const eMin = en.getHours() * 60 + en.getMinutes() - 420;
    const top = (sMin / 60) * SLOT_H, height = Math.max(((eMin - sMin) / 60) * SLOT_H, 10);
    const label = `${fmt(st.getHours(), st.getMinutes())} – ${fmt(en.getHours(), en.getMinutes())}`;
    const isSelected = selectedSlot === slot.id;

    if (type === 'booked') {
      return (
        <div key={`b-${slot.id}`} title={`${label} — Déjà réservé`}
          className="absolute left-0.5 right-0.5 rounded bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-1 text-[10px] text-gray-400 dark:text-gray-500 overflow-hidden pointer-events-none"
          style={{ top: `${top}px`, height: `${height}px` }}>
          {height >= 20 && <span className="block truncate">{label}</span>}
          {height >= 32 && <span className="block text-[9px] opacity-70">Déjà réservé</span>}
        </div>
      );
    }
    return (
      <button key={slot.id} title={label} onClick={() => setSelectedSlot(isSelected ? null : slot.id)}
        className={`absolute left-0.5 right-0.5 rounded px-1 text-[10px] overflow-hidden border-2 transition-all cursor-pointer ${
          isSelected
            ? 'bg-brand-100 dark:bg-brand-900/50 border-brand-500 ring-2 ring-brand-300 text-brand-700 dark:text-brand-200 z-10'
            : 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30'
        }`}
        style={{ top: `${top}px`, height: `${height}px` }}>
        {height >= 20 && <span className="block truncate font-medium">{label}</span>}
        {height >= 32 && <span className="block text-[9px] opacity-70">Disponible</span>}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-500" /> Choisir un créneau
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Cliquez sur un créneau vert pour le sélectionner</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-semibold text-black dark:text-white">{weekLabel}</span>
          <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><ChevronRight className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? <LoadingSpinner /> : allSlots.length === 0 ? (
            <EmptyState icon={Calendar} title="Aucun créneau disponible" description="Le prestataire n'a pas encore publié de créneaux. Revenez plus tard." />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-[44px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-800">
                  <div />
                  {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={i} className="text-center py-1.5 border-l border-gray-200 dark:border-gray-800">
                        <div className="text-[10px] font-medium text-gray-400 uppercase">{DAYS_FR[i]}</div>
                        <div className={`text-sm font-bold ${isToday ? 'text-white bg-brand-500 w-6 h-6 rounded-full flex items-center justify-center mx-auto' : 'text-black dark:text-white'}`}>{day.getDate()}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-[44px_repeat(7,1fr)] relative">
                  <div>
                    {HOURS.map(h => (
                      <div key={h} className="text-[10px] text-gray-400 pr-1 text-right pt-0.5 border-b border-gray-50 dark:border-gray-800/30" style={{ height: `${SLOT_H}px` }}>
                        {fmt(h)}
                      </div>
                    ))}
                  </div>
                  {weekDays.map((day, i) => {
                    const available = getDaySlots(day, allSlots);
                    const booked = getDaySlots(day, bookedSlots);
                    return (
                      <div key={i} className="relative border-l border-gray-200 dark:border-gray-800" style={{ height: `${HOURS.length * SLOT_H}px` }}>
                        {HOURS.map(h => <div key={h} className="absolute left-0 right-0 border-b border-gray-50 dark:border-gray-800/30" style={{ top: `${(h - 7) * SLOT_H}px`, height: `${SLOT_H}px` }} />)}
                        {booked.map(s => renderSlotBlock(s, 'booked'))}
                        {available.map(s => renderSlotBlock(s, 'available'))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {allSlots.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes (optionnel)</label>
              <textarea rows={2} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                placeholder="Instructions d'accès, précisions..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          )}

          {allSlots.length > 0 && (
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> Disponible</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-200 border border-gray-300" /> Déjà réservé</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-brand-100 border-2 border-brand-500" /> Sélectionné</div>
            </div>
          )}
        </div>

        {allSlots.length > 0 && (
          <div className="p-5 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Annuler</button>
            <button onClick={handleBook} disabled={!selectedSlot || submitting}
              className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50">
              {submitting ? 'Réservation...' : 'Réserver ce créneau'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
