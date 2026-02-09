import { Link } from 'react-router-dom';
import { MapPin, Eye, Star } from 'lucide-react';
import { PriceDisplay, Badge } from '../ui';

export default function AdCard({ ad }) {
  return (
    <Link to={`/services/${ad.id}`} className="group">
      <div className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden hover:border-primary-400/30 hover:shadow-neon-sm transition-all duration-300">
        {/* Image */}
        <div className="aspect-video bg-gradient-to-br from-navy-900 to-dark-800 relative">
          {(ad.image_1 || ad.image_url) ? (
            <img src={ad.image_1 || ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">⚡</span>
            </div>
          )}
          {ad.category_name && (
            <div className="absolute top-3 left-3">
              <Badge variant="primary">{ad.category_name}</Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-white group-hover:text-primary-400 transition line-clamp-2 mb-2">
            {ad.title}
          </h3>
          
          {ad.short_description && (
            <p className="text-sm text-dark-400 line-clamp-2 mb-3">{ad.short_description}</p>
          )}

          <div className="flex items-center justify-between mb-3">
            <PriceDisplay price={ad.price} priceType={ad.price_type} />
            {ad.provider_rating > 0 && (
              <div className="flex items-center text-sm text-dark-400">
                <Star className="h-4 w-4 fill-primary-400 text-primary-400 mr-1" />
                {Number(ad.provider_rating).toFixed(1)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-dark-400">
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
            <div className="mt-3 pt-3 border-t border-dark-700 text-sm text-dark-400">
              Par <span className="font-medium text-dark-300">{ad.provider_name || ad.provider_username}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
