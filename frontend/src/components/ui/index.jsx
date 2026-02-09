import { Star } from 'lucide-react';

export function StarRating({ rating, max = 5, size = 16, interactive = false, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={`${
            i < Math.round(rating) ? 'fill-primary-400 text-primary-400' : 'text-dark-600'
          } ${interactive ? 'cursor-pointer hover:text-primary-400' : ''}`}
          onClick={() => interactive && onChange?.(i + 1)}
        />
      ))}
    </div>
  );
}

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-dark-700 text-dark-200 border border-dark-600',
    primary: 'bg-primary-400/10 text-primary-400 border border-primary-400/20',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
    info: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
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
    accepted: { label: 'Acceptée', variant: 'success' },
    declined: { label: 'Refusée', variant: 'danger' },
    completed: { label: 'Terminée', variant: 'primary' },
    cancelled: { label: 'Annulée', variant: 'default' },
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
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-dark-600 border-t-primary-400"></div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      {Icon && <Icon className="mx-auto h-12 w-12 text-dark-500 mb-4" />}
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      {description && <p className="text-dark-400 mb-6">{description}</p>}
      {action}
    </div>
  );
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-dark-800 rounded-lg border border-dark-700 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {description && <p className="text-dark-400 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PriceDisplay({ price, priceType }) {
  if (!price && priceType === 'quote') return <span className="text-primary-400 font-semibold">Sur devis</span>;
  if (!price && priceType === 'free_estimate') return <span className="text-primary-400 font-semibold">Estimation gratuite</span>;
  if (!price) return <span className="text-dark-400">Prix non renseigné</span>;
  const formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  const suffix = priceType === 'hourly' ? '/h' : '';
  return <span className="text-primary-400 font-bold text-lg">{formatted}{suffix}</span>;
}
