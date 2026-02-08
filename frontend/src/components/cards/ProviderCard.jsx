import { Link } from 'react-router-dom';
import { MapPin, Star, CheckCircle, Briefcase } from 'lucide-react';

export default function ProviderCard({ provider }) {
  const profile = provider.prestataire_profile || {};

  return (
    <Link to={`/providers/${provider.id}`} className="group">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            {provider.avatar ? (
              <img src={provider.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-primary-600">
                {(provider.first_name?.[0] || provider.username[0]).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition truncate">
                {profile.company_name || `${provider.first_name} ${provider.last_name}`}
              </h3>
              {provider.is_verified && (
                <CheckCircle className="h-4 w-4 text-primary-500 shrink-0" />
              )}
            </div>

            {provider.city && (
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <MapPin className="h-3.5 w-3.5 mr-1" />
                {provider.city}
              </div>
            )}

            {/* Rating & stats */}
            <div className="flex items-center gap-4 mt-2">
              {profile.average_rating > 0 && (
                <div className="flex items-center text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="font-medium">{Number(profile.average_rating).toFixed(1)}</span>
                  <span className="text-gray-400 ml-1">({profile.total_reviews})</span>
                </div>
              )}
              {profile.completed_projects > 0 && (
                <div className="flex items-center text-sm text-gray-500">
                  <Briefcase className="h-3.5 w-3.5 mr-1" />
                  {profile.completed_projects} projets
                </div>
              )}
            </div>

            {/* Specialties */}
            {profile.specialties && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profile.specialties.split(',').slice(0, 3).map((s, i) => (
                  <span key={i} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                    {s.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
