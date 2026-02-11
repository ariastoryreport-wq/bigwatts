import { Link } from 'react-router-dom';
import { MapPin, Eye, Star } from 'lucide-react';
import { PriceDisplay, Badge } from '../ui';

export default function AdCard({ ad }) {
  return (
    <Link to={`/services/${ad.id}`} className="group">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-300">
        {/* Image */}
        <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
          {(ad.image_1 || ad.image_url) ? (
            <img src={ad.image_1 || ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">⚡</span>
            </div>
          )}
          {ad.category_name && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-black/80 text-white border border-white/10 backdrop-blur-sm">
                {ad.category_name}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-black dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-300 transition line-clamp-2 mb-2">
            {ad.title}
          </h3>
          
          {ad.short_description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{ad.short_description}</p>
          )}

          <div className="flex items-center justify-between mb-3">
            <PriceDisplay price={ad.price} priceType={ad.price_type} currency={ad.currency || 'EUR'} currencySymbol={ad.currency_symbol || '€'} />
            {ad.provider_rating > 0 && (
              <div className="flex items-center text-sm text-gray-500">
                <Star className="h-4 w-4 fill-brand-300 text-brand-300 mr-1" />
                {Number(ad.provider_rating).toFixed(1)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <MapPin className="h-3.5 w-3.5 mr-1" />
              {ad.city}
            </div>
            <div className="flex items-center">
              <Eye className="h-3.5 w-3.5 mr-1" />
              {ad.views_count}
            </div>
          </div>

          {ad.provider_name && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500">
              Par <span className="font-medium text-gray-700 dark:text-gray-300">{ad.provider_name || ad.provider_username}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
