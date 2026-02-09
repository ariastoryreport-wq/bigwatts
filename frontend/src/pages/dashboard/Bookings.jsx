import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { bookingsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner, StatusBadge, EmptyState } from '../../components/ui';
import { Briefcase, Calendar, CreditCard, Clock, ArrowRight, CheckCircle, XCircle, Play } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_FLOW = ['pending', 'confirmed', 'deposit_paid', 'in_progress', 'completed'];

export default function Bookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchBookings = () => {
    setLoading(true);
    const params = {};
    if (filter) params.status = filter;
    bookingsAPI.getBookings(params)
      .then(({ data }) => setBookings(data.results || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [filter]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await bookingsAPI.updateBooking(id, { status: newStatus });
      toast.success('Réservation mise à jour');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  const handlePayDeposit = async (bookingId) => {
    try {
      const { data } = await bookingsAPI.payDeposit(bookingId);
      if (data.mock) {
        toast.success(`Acompte de ${data.amount}€ payé (mode test) !`);
      } else {
        toast.success('Paiement initié via Stripe.');
      }
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du paiement.');
    }
  };

  const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);

  const formatSlot = (slot) => {
    if (!slot) return null;
    const d = new Date(slot.start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    const t1 = new Date(slot.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const t2 = new Date(slot.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${d}, ${t1} – ${t2}`;
  };

  const statusFilters = [
    { value: '', label: 'Toutes' },
    { value: 'pending', label: 'En attente' },
    { value: 'confirmed', label: 'Confirmées' },
    { value: 'deposit_paid', label: 'Acompte payé' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminées' },
    { value: 'cancelled', label: 'Annulées' },
  ];

  const isProvider = user?.role === 'prestataire';

  return (
    <DashboardLayout>
      <PageHeader
        title="Réservations"
        description={isProvider ? 'Gérez vos réservations clients' : 'Suivez vos réservations de services'}
      />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statusFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f.value
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : bookings.length === 0 ? (
        <EmptyState icon={Briefcase} title="Aucune réservation" description="Les réservations apparaîtront ici une fois créées." />
      ) : (
        <div className="space-y-4">
          {bookings.map(b => (
            <Card key={b.id} className="p-5">
              <div className="flex flex-col gap-3">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-semibold text-black dark:text-white">{b.ad_title}</h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isProvider
                        ? `Client : ${b.homeowner_name || '—'}`
                        : `Prestataire : ${b.provider_name || '—'}`
                      }
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500 dark:text-gray-400 shrink-0">
                    <div className="font-medium text-black dark:text-white">
                      {b.quoted_price ? fmt(b.quoted_price) : '—'}
                    </div>
                    <div className="text-xs">
                      {new Date(b.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>

                {/* Slot */}
                {b.slot_details && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4 text-brand-500" />
                    <span>{formatSlot(b.slot_details)}</span>
                  </div>
                )}

                {/* Notes */}
                {b.notes && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">{b.notes}</p>
                )}

                {/* Payment status */}
                {b.payments?.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {b.payments.map(p => (
                      <div key={p.id} className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${
                        p.status === 'paid'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      }`}>
                        {p.status === 'paid' ? <CheckCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        {p.payment_type === 'deposit' ? 'Acompte' : 'Solde'} : {fmt(p.amount)}
                        {p.status === 'paid' && ' ✓'}
                      </div>
                    ))}
                  </div>
                )}

                {/* Status progress bar */}
                <div className="flex items-center gap-1 mt-1">
                  {STATUS_FLOW.map((s, i) => {
                    const currentIdx = STATUS_FLOW.indexOf(b.status);
                    const isDone = i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div key={s} className="flex items-center gap-1 flex-1">
                        <div className={`h-1.5 w-full rounded-full transition ${
                          isDone ? 'bg-brand-400' : 'bg-gray-200 dark:bg-gray-700'
                        }`} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 -mt-1">
                  <span>En attente</span>
                  <span>Confirmé</span>
                  <span>Acompte</span>
                  <span>En cours</span>
                  <span>Terminé</span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {/* Provider: confirm pending booking */}
                  {isProvider && b.status === 'pending' && (
                    <>
                      <button onClick={() => handleStatusChange(b.id, 'confirmed')} className="inline-flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition">
                        <CheckCircle className="h-4 w-4" /> Confirmer
                      </button>
                      <button onClick={() => handleStatusChange(b.id, 'cancelled')} className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        <XCircle className="h-4 w-4" /> Refuser
                      </button>
                    </>
                  )}

                  {/* Homeowner: pay deposit when confirmed */}
                  {!isProvider && b.status === 'confirmed' && (
                    <button onClick={() => handlePayDeposit(b.id)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition">
                      <CreditCard className="h-4 w-4" /> Payer l'acompte ({b.deposit_amount ? fmt(b.deposit_amount) : '30%'})
                    </button>
                  )}

                  {/* Provider: start work after deposit */}
                  {isProvider && b.status === 'deposit_paid' && (
                    <button onClick={() => handleStatusChange(b.id, 'in_progress')} className="inline-flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition">
                      <Play className="h-4 w-4" /> Démarrer les travaux
                    </button>
                  )}

                  {/* Provider: mark complete */}
                  {isProvider && b.status === 'in_progress' && (
                    <button onClick={() => handleStatusChange(b.id, 'completed')} className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
                      <CheckCircle className="h-4 w-4" /> Marquer terminé
                    </button>
                  )}

                  {/* Cancel (both parties, if applicable) */}
                  {['pending', 'confirmed', 'deposit_paid'].includes(b.status) && (
                    <button onClick={() => handleStatusChange(b.id, 'cancelled')} className="inline-flex items-center gap-1.5 px-3 py-2 text-red-500 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                      <XCircle className="h-4 w-4" /> Annuler
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
