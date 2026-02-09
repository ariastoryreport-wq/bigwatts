import { Link } from 'react-router-dom';
import { MapPin, Star, CheckCircle, Briefcase } from 'lucide-react';

export default function ProviderCard({ provider }) {
  const profile = provider.prestataire_profile || {};

  return (
    <Link to={`/providers/${provider.id}`} className="group">
      <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 hover:border-primary-400/30 hover:shadow-neon-sm transition-all duration-300">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-lg bg-navy-800 border border-dark-600 flex items-center justify-center shrink-0">
            {provider.avatar ? (
              <img src={provider.avatar} alt="" className="w-14 h-14 rounded-lg object-cover" />
            ) : (
              <span className="text-xl font-bold text-primary-400">
                {(provider.first_name?.[0] || provider.username[0]).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white group-hover:text-primary-400 transition truncate">
                {profile.company_name || `${provider.first_name} ${provider.last_name}`}
              </h3>
              {provider.is_verified && (
                <CheckCircle className="h-4 w-4 text-primary-400 shrink-0" />
              )}
            </div>

            {provider.city && (
              <div className="flex items-center text-sm text-dark-400 mt-1">
                <MapPin className="h-3.5 w-3.5 mr-1" />
                {provider.city}
              </div>
            )}

            {/* Rating & stats */}
            <div className="flex items-center gap-4 mt-2">
              {profile.average_rating > 0 && (
                <div className="flex items-center text-sm">
                  <Star className="h-4 w-4 fill-primary-400 text-primary-400 mr-1" />
                  <span className="font-medium text-white">{Number(profile.average_rating).toFixed(1)}</span>
                  <span className="text-dark-500 ml-1">({profile.total_reviews})</span>
                </div>
              )}
              {profile.completed_projects > 0 && (
                <div className="flex items-center text-sm text-dark-400">
                  <Briefcase className="h-3.5 w-3.5 mr-1" />
                  {profile.completed_projects} projets
                </div>
              )}
            </div>

            {/* Specialties */}
            {profile.specialties && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profile.specialties.split(',').slice(0, 3).map((s, i) => (
                  <span key={i} className="text-xs bg-primary-400/10 text-primary-400 px-2 py-0.5 rounded-md border border-primary-400/20">
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
