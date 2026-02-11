import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner } from '../../components/ui';
import { ImageIcon, Sun, Zap, Thermometer, Layers, Droplet, Wind, ClipboardList, Battery, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
  { value: 'active', label: 'Publier', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  { value: 'paused', label: 'En pause', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
];

const DEFAULT_IMAGES = {
  'panneaux-solaires': 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80',
  'bornes-recharge': 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80',
  'pompe-chaleur': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80',
  'isolation': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
  'chauffe-eau-thermo': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80',
  'eolienne': 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=800&q=80',
  'audit-energetique': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
  'batterie-stockage': 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=800&q=80',
};

const CATEGORY_ICONS = {
  'panneaux-solaires': Sun,
  'bornes-recharge': Zap,
  'pompe-chaleur': Thermometer,
  'isolation': Layers,
  'chauffe-eau-thermo': Droplet,
  'eolienne': Wind,
  'audit-energetique': ClipboardList,
  'batterie-stockage': Battery,
};

export default function AdForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', slug: '', category: '', description: '',
    price: '', price_type: 'quote', city: '', postal_code: '', service_area: '',
    status: 'draft', duration_estimate: '', warranty_info: '', requirements: '',
    image_url: '',
  });

  useEffect(() => {
    adsAPI.getCategories().then(({ data }) => setCategories(data)).catch(() => {});
    if (isEdit) {
      setLoading(true);
      adsAPI.getAd(id).then(({ data }) => {
        setForm({
          title: data.title || '', slug: data.slug || '', category: data.category || '',
          description: data.description || '',
          price: data.price || '', price_type: data.price_type || 'quote',
          city: data.city || '', postal_code: data.postal_code || '',
          service_area: data.service_area || '', status: data.status || 'draft',
          duration_estimate: data.duration_estimate || '', warranty_info: data.warranty_info || '',
          requirements: data.requirements || '',
          image_url: data.image_url || '',
        });
      }).catch(() => toast.error('Erreur de chargement'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const generateSlug = (title) => {
    return title.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  // When category changes via grid button, auto-suggest title & image
  const handleCategorySelect = (catId) => {
    const cat = categories.find(c => c.id === Number(catId));
    const newForm = { ...form, category: String(catId) };

    // Auto-generate title from category if title is empty or was auto-generated
    if (cat && !isEdit && !form.title) {
      newForm.title = cat.name;
      newForm.slug = generateSlug(cat.name);
    }

    // Auto-set default Unsplash image if no image set
    if (cat && !form.image_url) {
      newForm.image_url = DEFAULT_IMAGES[cat.slug] || '';
    }

    setForm(newForm);
  };

  const isQuoteType = form.price_type === 'quote' || form.price_type === 'free_estimate';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...form };
      if (!data.slug) data.slug = generateSlug(data.title);
      if (!data.price || isQuoteType) delete data.price;
      if (data.category) data.category = Number(data.category);

      if (isEdit) {
        await adsAPI.updateAd(id, data);
        toast.success('Annonce mise à jour');
      } else {
        await adsAPI.createAd(data);
        toast.success('Annonce créée');
      }
      navigate('/dashboard/ads');
    } catch (err) {
      const errors = err.response?.data;
      if (errors) {
        toast.error(Object.values(errors).flat().join('. '));
      } else {
        toast.error('Erreur lors de l\'enregistrement');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-300 outline-none bg-white dark:bg-gray-900 text-black dark:text-white";

  return (
    <DashboardLayout>
      <PageHeader title={isEdit ? 'Modifier l\'annonce' : 'Nouvelle annonce'} />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category grid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Catégorie *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map((c) => {
                const IconComp = CATEGORY_ICONS[c.slug] || HelpCircle;
                const isSelected = String(form.category) === String(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategorySelect(c.id)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      isSelected
                        ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <IconComp className={`h-6 w-6 mx-auto ${isSelected ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                    <p className={`mt-2 text-sm font-medium ${isSelected ? 'text-black dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{c.name}</p>
                  </button>
                );
              })}
            </div>
            {!form.category && (
              <p className="text-xs text-gray-400 mt-2">Sélectionnez la catégorie de votre service</p>
            )}
          </div>

          {/* Title (auto-generated from category, editable) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre *</label>
            <input
              type="text" required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value, slug: generateSlug(e.target.value) })}
              className={inputClass}
              placeholder="Ex: Installation Panneaux Solaires"
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-gray-400 text-xs">(optionnel)</span>
            </label>
            <textarea rows={6} value={form.description} onChange={set('description')}
              className={inputClass}
              placeholder="Détaillez votre service..." />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <ImageIcon className="h-4 w-4 inline mr-1" />
              Image (URL)
            </label>
            <input type="url" value={form.image_url} onChange={set('image_url')}
              className={inputClass}
              placeholder="https://images.unsplash.com/..." />
            {form.image_url && (
              <img src={form.image_url} alt="Aperçu" className="mt-2 h-32 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
            )}
          </div>

          {/* Price type + Price */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de prix</label>
              <select value={form.price_type} onChange={(e) => setForm({ ...form, price_type: e.target.value, ...(e.target.value === 'quote' || e.target.value === 'free_estimate' ? { price: '' } : {}) })}
                className={inputClass}>
                <option value="quote">Sur devis</option>
                <option value="fixed">Prix fixe</option>
                <option value="hourly">Taux horaire</option>
                <option value="free_estimate">Estimation gratuite</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix (€)</label>
              <input type="number" step="0.01" value={form.price} onChange={set('price')}
                className={`${inputClass} ${isQuoteType ? 'opacity-40 cursor-not-allowed' : ''}`}
                placeholder={isQuoteType ? '—' : '0.00'}
                disabled={isQuoteType} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durée estimée</label>
              <input type="text" value={form.duration_estimate} onChange={set('duration_estimate')}
                className={inputClass}
                placeholder="Ex: 2-3 jours" />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ville *</label>
              <input type="text" required value={form.city} onChange={set('city')}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code postal</label>
              <input type="text" value={form.postal_code} onChange={set('postal_code')}
                className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zone d'intervention</label>
              <input type="text" value={form.service_area} onChange={set('service_area')}
                className={inputClass}
                placeholder="Ex: Rhône-Alpes" />
            </div>
          </div>

          {/* Extra */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Garantie</label>
            <textarea rows={2} value={form.warranty_info} onChange={set('warranty_info')}
              className={inputClass} />
          </div>

          {/* Status as buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statut</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, status: opt.value })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition border-2 ${
                    form.status === opt.value
                      ? `${opt.color} border-current`
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button type="button" onClick={() => navigate('/dashboard/ads')} className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 font-medium">
              {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer l\'annonce'}
            </button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
