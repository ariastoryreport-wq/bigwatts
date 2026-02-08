import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adsAPI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner } from '../../components/ui';
import toast from 'react-hot-toast';

export default function AdForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', slug: '', category: '', description: '', short_description: '',
    price: '', price_type: 'quote', city: '', postal_code: '', service_area: '',
    status: 'draft', duration_estimate: '', warranty_info: '', requirements: ''
  });

  useEffect(() => {
    adsAPI.getCategories().then(({ data }) => setCategories(data)).catch(() => {});
    if (isEdit) {
      setLoading(true);
      adsAPI.getAd(id).then(({ data }) => {
        setForm({
          title: data.title || '', slug: data.slug || '', category: data.category || '',
          description: data.description || '', short_description: data.short_description || '',
          price: data.price || '', price_type: data.price_type || 'quote',
          city: data.city || '', postal_code: data.postal_code || '',
          service_area: data.service_area || '', status: data.status || 'draft',
          duration_estimate: data.duration_estimate || '', warranty_info: data.warranty_info || '',
          requirements: data.requirements || ''
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...form };
      if (!data.slug) data.slug = generateSlug(data.title);
      if (!data.price) delete data.price;
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

  return (
    <DashboardLayout>
      <PageHeader title={isEdit ? 'Modifier l\'annonce' : 'Nouvelle annonce'} />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <input
                type="text" required value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value, slug: generateSlug(e.target.value) })}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ex: Installation Panneaux Solaires"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
              <select required value={form.category} onChange={set('category')}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="">Choisir...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Short description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description courte</label>
            <input type="text" value={form.short_description} onChange={set('short_description')}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Résumé en une phrase" maxLength={300} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description complète *</label>
            <textarea required rows={6} value={form.description} onChange={set('description')}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Détaillez votre service..." />
          </div>

          {/* Price */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de prix</label>
              <select value={form.price_type} onChange={set('price_type')}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="quote">Sur devis</option>
                <option value="fixed">Prix fixe</option>
                <option value="hourly">Taux horaire</option>
                <option value="free_estimate">Estimation gratuite</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
              <input type="number" step="0.01" value={form.price} onChange={set('price')}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durée estimée</label>
              <input type="text" value={form.duration_estimate} onChange={set('duration_estimate')}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ex: 2-3 jours" />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
              <input type="text" required value={form.city} onChange={set('city')}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
              <input type="text" value={form.postal_code} onChange={set('postal_code')}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone d'intervention</label>
              <input type="text" value={form.service_area} onChange={set('service_area')}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Ex: Rhône-Alpes" />
            </div>
          </div>

          {/* Extra */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Garantie</label>
            <textarea rows={2} value={form.warranty_info} onChange={set('warranty_info')}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select value={form.status} onChange={set('status')}
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none md:w-48">
              <option value="draft">Brouillon</option>
              <option value="active">Publier</option>
              <option value="paused">En pause</option>
            </select>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={() => navigate('/dashboard/ads')} className="px-6 py-2.5 border rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium">
              {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer l\'annonce'}
            </button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
