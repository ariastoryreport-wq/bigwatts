import { Star } from 'lucide-react';

export function StarRating({ rating, max = 5, size = 16, interactive = false, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={`${
            i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
          onClick={() => interactive && onChange?.(i + 1)}
        />
      ))}
    </div>
  );
}

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
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
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-6">{description}</p>}
      {action}
    </div>
  );
}

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-gray-500 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PriceDisplay({ price, priceType }) {
  if (!price && priceType === 'quote') return <span className="text-primary-600 font-semibold">Sur devis</span>;
  if (!price && priceType === 'free_estimate') return <span className="text-primary-600 font-semibold">Estimation gratuite</span>;
  if (!price) return <span className="text-gray-500">Prix non renseigné</span>;
  const formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  const suffix = priceType === 'hourly' ? '/h' : '';
  return <span className="text-primary-700 font-bold text-lg">{formatted}{suffix}</span>;
}
