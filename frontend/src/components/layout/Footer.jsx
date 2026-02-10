import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <Logo />
            </div>
            <p className="text-gray-400 max-w-md">
              La marketplace qui connecte les professionnels de l'énergie verte avec les propriétaires. 
              Panneaux solaires, bornes de recharge, pompes à chaleur et plus encore.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li><Link to="/services" className="text-gray-400 hover:text-brand-300 transition">Services</Link></li>
              <li><Link to="/providers" className="text-gray-400 hover:text-brand-300 transition">Prestataires</Link></li>
              <li><Link to="/register" className="text-gray-400 hover:text-brand-300 transition">Inscription</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-400">
              <li>contact@bigwatts.fr</li>
              <li>France</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} BigWatts. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
