import { Star } from 'lucide-react';

export function StarRating({ rating, max = 5, size = 16, interactive = false, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={`${
            i < Math.round(rating) ? 'fill-brand-300 text-brand-300' : 'text-gray-300 dark:text-gray-600'
          } ${interactive ? 'cursor-pointer hover:text-brand-300' : ''}`}
          onClick={() => interactive && onChange?.(i + 1)}
        />
      ))}
    </div>
  );
}

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
    primary: 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800',
    success: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    danger: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
    info: 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    active: { label: 'Actif', variant: 'success' },
    draft: { label: 'Brouillon', variant: 'default' },
    paused: { label: 'En pause', variant: 'warning' },
    archived: { label: 'Archivé', variant: 'default' },
    pending: { label: 'En attente', variant: 'warning' },
    counter_offer: { label: 'Contre-offre', variant: 'info' },
    accepted: { label: 'Acceptée', variant: 'success' },
    declined: { label: 'Refusée', variant: 'danger' },
    completed: { label: 'Terminée', variant: 'primary' },
    cancelled: { label: 'Annulée', variant: 'default' },
    deposit_paid: { label: 'Acompte payé', variant: 'success' },
    open: { label: 'Ouvert', variant: 'info' },
    in_progress: { label: 'En cours', variant: 'warning' },
    waiting: { label: 'En attente', variant: 'warning' },
    resolved: { label: 'Résolu', variant: 'success' },
    closed: { label: 'Fermé', variant: 'default' },
  };
  const item = map[status] || { label: status, variant: 'default' };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function LoadingSpinner({ className = '' }) {
  return (
    <div className={`flex justify-center py-12 ${className}`}>
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-gray-700 border-t-brand-300"></div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
      {description && <p className="text-gray-500 dark:text-gray-400 mb-6">{description}</p>}
      {action}
    </div>
  );
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-black dark:text-white">{title}</h1>
        {description && <p className="text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PriceDisplay({ price, priceType, currency = 'EUR', currencySymbol }) {
  if (!price && priceType === 'quote') return <span className="text-brand-600 dark:text-brand-300 font-semibold">Sur devis</span>;
  if (!price && priceType === 'free_estimate') return <span className="text-brand-600 dark:text-brand-300 font-semibold">Estimation gratuite</span>;
  if (!price) return <span className="text-gray-400">Prix non renseigné</span>;
  let formatted;
  try {
    formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price);
  } catch {
    formatted = `${currencySymbol || '€'}${Number(price).toFixed(2)}`;
  }
  const suffix = priceType === 'hourly' ? '/h' : '';
  return <span className="text-black dark:text-white font-bold text-lg">{formatted}{suffix}</span>;
}
