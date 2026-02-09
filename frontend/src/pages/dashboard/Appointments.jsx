import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, LoadingSpinner, PageHeader, StatusBadge, EmptyState } from '../../components/ui';
import { Calendar, Clock, MapPin, Plus, X, Check, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', date: '', start_time: '', end_time: '', location: '',
    owner: '', provider: '',
  });

  const fetchAppointments = () => {
    setLoading(true);
    authAPI.getAppointments()
      .then(({ data }) => setAppointments(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await authAPI.createAppointment(form);
      toast.success('Rendez-vous créé !');
      setShowForm(false);
      setForm({ title: '', description: '', date: '', start_time: '', end_time: '', location: '', owner: '', provider: '' });
      fetchAppointments();
    } catch (err) {
      toast.error('Erreur lors de la création.');
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await authAPI.updateAppointment(id, { status: newStatus });
      toast.success('Rendez-vous mis à jour !');
      fetchAppointments();
    } catch {
      toast.error('Erreur.');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const formatTime = (t) => t?.slice(0, 5);

  // Group by date
  const grouped = {};
  appointments.forEach(a => {
    const key = a.date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });
  const sortedDates = Object.keys(grouped).sort();

  return (
    <DashboardLayout>
      <PageHeader
        title="Rendez-vous"
        description="Gérez vos rendez-vous avec vos clients et prestataires"
        action={
          <button onClick={() => setShowForm(!showForm)} className="btn-brand btn-sm">
            {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showForm ? 'Annuler' : 'Nouveau'}
          </button>
        }
      />

      {/* Create form */}
      {showForm && (
        <Card className="p-6 mb-6">
          <h3 className="heading-section mb-4">Nouveau rendez-vous</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Titre</label>
              <input className="input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Visite technique - Installation solaire" />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="label">Début</label>
                <input type="time" className="input" required value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="flex-1">
                <label className="label">Fin</label>
                <input type="time" className="input" required value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Lieu</label>
              <input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Adresse" />
            </div>
            {user?.role === 'prestataire' && (
              <div>
                <label className="label">ID Propriétaire</label>
                <input type="number" className="input" required value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} placeholder="ID du propriétaire" />
              </div>
            )}
            {user?.role === 'proprietaire' && (
              <div>
                <label className="label">ID Prestataire</label>
                <input type="number" className="input" required value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="ID du prestataire" />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Notes supplémentaires..." />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-brand">Créer le rendez-vous</button>
            </div>
          </form>
        </Card>
      )}

      {loading ? <LoadingSpinner /> : appointments.length === 0 ? (
        <EmptyState icon={Calendar} title="Aucun rendez-vous" description="Créez votre premier rendez-vous." />
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <h3 className="text-sm font-bold text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" /> {formatDate(date)}
              </h3>
              <div className="space-y-3">
                {grouped[date].map(apt => (
                  <Card key={apt.id} className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-black dark:text-white">{apt.title}</h4>
                          <StatusBadge status={apt.status} />
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                          </span>
                          {apt.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {apt.location}
                            </span>
                          )}
                          <span>
                            Avec : {user?.role === 'prestataire' ? apt.owner_name : apt.provider_name}
                          </span>
                        </div>
                        {apt.description && <p className="text-sm text-muted mt-2">{apt.description}</p>}
                      </div>

                      {apt.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => updateStatus(apt.id, 'confirmed')} className="btn-brand btn-sm" title="Confirmer">
                            <Check className="h-4 w-4 mr-1" /> Confirmer
                          </button>
                          <button onClick={() => updateStatus(apt.id, 'cancelled')} className="btn-danger btn-sm" title="Annuler">
                            <XCircle className="h-4 w-4 mr-1" /> Annuler
                          </button>
                        </div>
                      )}
                      {apt.status === 'confirmed' && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => updateStatus(apt.id, 'completed')} className="btn-brand btn-sm">
                            <Check className="h-4 w-4 mr-1" /> Terminé
                          </button>
                          <button onClick={() => updateStatus(apt.id, 'cancelled')} className="btn-ghost btn-sm text-red-500">
                            <XCircle className="h-4 w-4 mr-1" /> Annuler
                          </button>
                        </div>
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
