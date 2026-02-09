import { useState, useEffect } from 'react';
import { adsAPI, bookingsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner, StatusBadge, EmptyState } from '../../components/ui';
import { FileText, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import SchedulingModal from '../../components/SchedulingModal';
import toast from 'react-hot-toast';

export default function MyQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [bookings, setBookings] = useState({});
  const [loading, setLoading] = useState(true);
  const [schedulingQuoteId, setSchedulingQuoteId] = useState(null);
  const [payingBookingId, setPayingBookingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quotesRes, bookingsRes] = await Promise.all([
        adsAPI.getMyQuotes(),
        bookingsAPI.getBookings(),
      ]);
      const qList = quotesRes.data.results || quotesRes.data;
      const bList = bookingsRes.data.results || bookingsRes.data;
      setQuotes(qList);
      const bMap = {};
      bList.forEach(b => { bMap[b.quote] = b; });
      setBookings(bMap);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleBooked = () => { setSchedulingQuoteId(null); fetchData(); };

  const handlePayDeposit = async (bookingId) => {
    setPayingBookingId(bookingId);
    try {
      const { data } = await bookingsAPI.payDeposit(bookingId);
      if (data.mock) {
        toast.success(`Acompte de ${data.amount}€ payé (mode test) !`);
      } else {
        toast.success('Paiement initié. Redirection Stripe...');
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du paiement.');
    } finally { setPayingBookingId(null); }
  };

  const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);

  return (
    <DashboardLayout>
      <PageHeader title="Mes demandes de devis" description="Suivez l'état de vos demandes, réservez et payez" />

      {loading ? <LoadingSpinner /> : quotes.length === 0 ? (
        <EmptyState icon={FileText} title="Aucune demande" description="Parcourez les services et demandez un devis." />
      ) : (
        <div className="space-y-4">
          {quotes.map((q) => {
            const booking = bookings[q.id];
            return (
              <Card key={q.id} className="p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-semibold text-black dark:text-white">{q.ad_title}</h3>
                        <StatusBadge status={q.status} />
                        {booking && <StatusBadge status={booking.status} />}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{q.message}</p>
                      {q.quoted_price && (
                        <p className="text-sm mt-2 text-brand-600 dark:text-brand-300 font-medium">
                          Devis : {fmt(q.quoted_price)}
                        </p>
                      )}
                      {q.provider_response && (
                        <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Réponse :</span> {q.provider_response}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">
                      {new Date(q.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  {/* Slot info */}
                  {booking?.slot_details && (
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                      <Calendar className="h-4 w-4 text-brand-500" />
                      <span>
                        Créneau : {new Date(booking.slot_details.start).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })} de {new Date(booking.slot_details.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} à {new Date(booking.slot_details.end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Payment info */}
                  {booking?.payments?.some(p => p.status === 'paid') && (
                    <div className="flex items-center gap-4 text-sm bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Acompte payé : {fmt(booking.payments.find(p => p.status === 'paid').amount)} ✓
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {q.status === 'accepted' && !booking && (
                      <button
                        onClick={() => setSchedulingQuoteId(q.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition"
                      >
                        <Calendar className="h-4 w-4" />
                        Choisir un créneau
                      </button>
                    )}
                    {booking?.status === 'confirmed' && (
                      <button
                        onClick={() => handlePayDeposit(booking.id)}
                        disabled={payingBookingId === booking.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-50"
                      >
                        <CreditCard className="h-4 w-4" />
                        {payingBookingId === booking.id ? 'Paiement...' : `Payer l'acompte (${booking.deposit_amount ? fmt(booking.deposit_amount) : '30%'})`}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {schedulingQuoteId && (
        <SchedulingModal
          quoteId={schedulingQuoteId}
          onClose={() => setSchedulingQuoteId(null)}
          onBooked={handleBooked}
        />
      )}
    </DashboardLayout>
  );
}
