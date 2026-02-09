import { useState, useEffect } from 'react';
import { bookingsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner, EmptyState } from '../../components/ui';
import { CalendarDays, Plus, X, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Availability() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', start_time: '', end_time: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchSlots = () => {
    setLoading(true);
    bookingsAPI.getSlots()
      .then(({ data }) => setSlots(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSlots(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.date || !form.start_time || !form.end_time) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }
    setSubmitting(true);
    try {
      const start = `${form.date}T${form.start_time}:00`;
      const end = `${form.date}T${form.end_time}:00`;

      if (new Date(end) <= new Date(start)) {
        toast.error('L\'heure de fin doit être après l\'heure de début.');
        setSubmitting(false);
        return;
      }

      await bookingsAPI.createSlot({ start, end });
      toast.success('Créneau ajouté !');
      setShowForm(false);
      setForm({ date: '', start_time: '', end_time: '' });
      fetchSlots();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce créneau ?')) return;
    try {
      await bookingsAPI.deleteSlot(id);
      toast.success('Créneau supprimé');
      fetchSlots();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression.');
    }
  };

  // Group by date
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

  // Generate default date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  return (
    <DashboardLayout>
      <PageHeader
        title="Mes disponibilités"
        description="Gérez vos créneaux disponibles pour les réservations"
        action={
          <button
            onClick={() => { setShowForm(!showForm); if (!form.date) setForm({ ...form, date: defaultDate }); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Annuler' : 'Ajouter un créneau'}
          </button>
        }
      />

      {/* Quick-add form */}
      {showForm && (
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-black dark:text-white mb-4">Nouveau créneau</h3>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white outline-none focus:ring-2 focus:ring-brand-300"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Début</label>
              <input
                type="time"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white outline-none focus:ring-2 focus:ring-brand-300"
                value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fin</label>
              <input
                type="time"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white outline-none focus:ring-2 focus:ring-brand-300"
                value={form.end_time}
                onChange={e => setForm({ ...form, end_time: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? 'Ajout...' : 'Ajouter'}
            </button>
          </form>
        </Card>
      )}

      {/* Slots list */}
      {loading ? <LoadingSpinner /> : slots.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucun créneau"
          description="Ajoutez des créneaux pour que vos clients puissent réserver."
          action={
            !showForm && (
              <button
                onClick={() => { setShowForm(true); setForm({ ...form, date: defaultDate }); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition"
              >
                <Plus className="h-4 w-4" /> Ajouter un créneau
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {sortedDays.map(day => (
            <div key={day}>
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {day}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grouped[day].map(slot => (
                  <Card key={slot.id} className={`p-4 ${slot.is_booked ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          slot.is_booked
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                        }`}>
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-black dark:text-white">
                            {formatTime(slot.start)} – {formatTime(slot.end)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {slot.is_booked ? 'Réservé' : 'Disponible'}
                          </p>
                        </div>
                      </div>
                      {!slot.is_booked && (
                        <button
                          onClick={() => handleDelete(slot.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
