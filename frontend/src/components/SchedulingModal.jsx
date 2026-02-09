import { useState, useEffect } from 'react';
import { bookingsAPI } from '../services/api';
import { Card, LoadingSpinner, EmptyState } from './ui';
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * SchedulingModal — lets a homeowner pick an available slot for a given quote,
 * then creates a booking.
 *
 * Props:
 *   quoteId   – quote PK (must be "accepted")
 *   onClose   – close callback
 *   onBooked  – called with booking data after successful creation
 */
export default function SchedulingModal({ quoteId, onClose, onBooked }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    bookingsAPI.getSlots({ quote: quoteId })
      .then(({ data }) => setSlots(data.results || data))
      .catch(() => toast.error('Impossible de charger les créneaux.'))
      .finally(() => setLoading(false));
  }, [quoteId]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      const { data } = await bookingsAPI.createBooking({
        quote_id: quoteId,
        slot_id: selectedSlot,
        notes,
      });
      toast.success('Réservation créée !');
      onBooked?.(data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur lors de la réservation.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Group slots by date
  const grouped = {};
  slots.forEach(s => {
    const day = new Date(s.start).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(s);
  });
  const sortedDays = Object.keys(grouped);

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-500" />
              Choisir un créneau
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Sélectionnez un créneau disponible pour votre intervention
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <LoadingSpinner />
          ) : slots.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Aucun créneau disponible"
              description="Le prestataire n'a pas encore publié de créneaux. Revenez plus tard."
            />
          ) : (
            <div className="space-y-5">
              {sortedDays.map(day => (
                <div key={day}>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {day}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {grouped[day].map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot.id === selectedSlot ? null : slot.id)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          selectedSlot === slot.id
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 ring-2 ring-brand-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>{formatTime(slot.start)} – {formatTime(slot.end)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes (optionnel)
                </label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                  placeholder="Instructions d'accès, précisions..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {slots.length > 0 && (
          <div className="p-5 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleBook}
              disabled={!selectedSlot || submitting}
              className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50"
            >
              {submitting ? 'Réservation...' : 'Réserver ce créneau'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
