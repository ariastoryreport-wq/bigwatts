import { useState, useEffect } from 'react';
import { notificationsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader, LoadingSpinner } from '../../components/ui';
import { Bell, Settings } from 'lucide-react';

export default function Notifications() {
  const [notifPrefs, setNotifPrefs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsAPI.getPreferences()
      .then(({ data }) => setNotifPrefs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const PREFS = [
    { key: 'email_quotes', label: 'Devis', desc: 'Demandes et réponses de devis' },
    { key: 'email_messages', label: 'Messages', desc: 'Nouveaux messages reçus' },
    { key: 'email_reviews', label: 'Avis', desc: 'Nouveaux avis sur votre profil' },
    { key: 'email_favorites', label: 'Favoris', desc: 'Quand quelqu\'un vous ajoute en favori' },
    { key: 'email_system', label: 'Système', desc: 'Badges, mises à jour et annonces' },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Gestion des notifications"
        description="Configurez vos préférences de notification"
      />

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/30">
              <Settings className="h-5 w-5 text-brand-600 dark:text-brand-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-white">Préférences de notification</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choisissez les notifications que vous souhaitez recevoir.</p>
            </div>
          </div>

          {notifPrefs ? (
            <div className="space-y-1">
              {PREFS.map(({ key, label, desc }) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition"
                >
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">{label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notifPrefs[key]}
                      onChange={async () => {
                        const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
                        setNotifPrefs(updated);
                        try {
                          await notificationsAPI.updatePreferences({ [key]: updated[key] });
                        } catch {
                          setNotifPrefs(notifPrefs);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer-checked:bg-brand-400 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Impossible de charger les préférences de notification.
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
