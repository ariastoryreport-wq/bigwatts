import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { isProfileComplete } from './Onboarding';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, PageHeader, LoadingSpinner } from '../../components/ui';
import { ImageIcon, Sun, Zap, Thermometer, Layers, Droplet, Wind, ClipboardList, Battery, HelpCircle, Upload, X, Plus, Link2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import CityAutocomplete from '../../components/ui/CityAutocomplete';
import PostalCodeAutocomplete from '../../components/ui/PostalCodeAutocomplete';

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
  const { user } = useAuth();
  const profileComplete = isProfileComplete(user);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState({ image_1: null, image_2: null, image_3: null });
  const [imagePreviews, setImagePreviews] = useState({ image_1: null, image_2: null, image_3: null });
  const [existingImages, setExistingImages] = useState({ image_1: null, image_2: null, image_3: null });
  const [imagesToClear, setImagesToClear] = useState(new Set());
  const [imageUrls, setImageUrls] = useState(['']);
  const [form, setForm] = useState({
    title: '', slug: '', category: '', description: '',
    price: '', price_max: '', price_type: 'quote', city: '', postal_code: '', service_area: '',
    status: 'draft', warranty_info: '', requirements: '',
  });

  useEffect(() => {
    adsAPI.getCategories().then(({ data }) => setCategories(data)).catch(() => {});
    if (isEdit) {
      setLoading(true);
      adsAPI.getAd(id).then(({ data }) => {
        setForm({
          title: data.title || '', slug: data.slug || '', category: data.category || '',
          description: data.description || '',
          price: data.price || '', price_max: data.price_max || '', price_type: data.price_type || 'quote',
          city: data.city || '', postal_code: data.postal_code || '',
          service_area: data.service_area || '', status: data.status || 'draft',
          warranty_info: data.warranty_info || '',
          requirements: data.requirements || '',
        });
        // Load existing image URLs into array
        if (data.image_url) {
          setImageUrls(data.image_url.split(',').map(u => u.trim()).filter(Boolean).concat(['']));
        }
        // Load existing uploaded images for preview
        setExistingImages({
          image_1: data.image_1 || null,
          image_2: data.image_2 || null,
          image_3: data.image_3 || null,
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

  // When category changes via grid button, always auto-suggest title & image
  const handleCategorySelect = (catId) => {
    const cat = categories.find(c => c.id === Number(catId));
    const newForm = { ...form, category: String(catId) };

    // Always auto-generate title from category name
    if (cat) {
      newForm.title = cat.name;
      newForm.slug = generateSlug(cat.name);
    }

    // Always auto-set default image from category
    if (cat) {
      const defaultUrl = DEFAULT_IMAGES[cat.slug] || '';
      if (defaultUrl) setImageUrls([defaultUrl, '']);
    }

    setForm(newForm);
  };

  const isQuoteType = form.price_type === 'quote' || form.price_type === 'free_estimate';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && !profileComplete) {
      toast.error('Veuillez compléter votre profil avant de créer une annonce');
      return;
    }
    setLoading(true);
    try {
      const hasFiles = Object.values(imageFiles).some(f => f !== null);
      const hasClearImages = imagesToClear.size > 0;
      let payload;

      // Combine image URLs into comma-separated string
      const combinedImageUrl = imageUrls.filter(u => u.trim()).join(',');

      if (hasFiles || hasClearImages) {
        payload = new FormData();
        const data = { ...form, image_url: combinedImageUrl };
        if (!data.slug) data.slug = generateSlug(data.title);
        if (!data.price || isQuoteType) { delete data.price; delete data.price_max; }
        if (data.price_type !== 'fixed') delete data.price_max;
        if (data.category) data.category = Number(data.category);
        Object.entries(data).forEach(([k, v]) => {
          if (v !== '' && v !== null && v !== undefined) payload.append(k, v);
        });
        Object.entries(imageFiles).forEach(([k, file]) => {
          if (file) payload.append(k, file);
        });
        // Send empty value for images that should be cleared
        imagesToClear.forEach((key) => {
          if (!imageFiles[key]) payload.append(key, '');
        });
      } else {
        payload = { ...form, image_url: combinedImageUrl };
        if (!payload.slug) payload.slug = generateSlug(payload.title);
        if (!payload.price || isQuoteType) { delete payload.price; delete payload.price_max; }
        if (payload.price_type !== 'fixed') delete payload.price_max;
        if (payload.category) payload.category = Number(payload.category);
      }

      if (isEdit) {
        await adsAPI.updateAd(id, payload);
        toast.success('Annonce mise à jour');
      } else {
        await adsAPI.createAd(payload);
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

      {/* Block new ad creation if profile is incomplete */}
      {!isEdit && !profileComplete && (
        <Card className="p-5 mb-6 border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                Profil incomplet
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                Vous devez compléter votre profil (nom, prénom, téléphone) avant de pouvoir publier une annonce.
              </p>
              <Link
                to="/dashboard/profile"
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-semibold hover:bg-yellow-700 transition"
              >
                Compléter mon profil
              </Link>
            </div>
          </div>
        </Card>
      )}

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
              autoComplete="off"
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

          {/* Image URLs (multiple) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Link2 className="h-4 w-4 inline mr-1" />
              Images (URL)
            </label>
            <div className="space-y-2">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const next = [...imageUrls];
                        next[idx] = e.target.value;
                        setImageUrls(next);
                      }}
                      className={inputClass}
                      placeholder="https://images.unsplash.com/..."
                    />
                    {url && (
                      <img src={url} alt={`URL ${idx + 1}`} className="mt-1.5 h-24 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                    )}
                  </div>
                  {/* Delete button — always shown if there's content or more than 1 row */}
                  {(url || imageUrls.length > 1) && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = imageUrls.filter((_, i) => i !== idx);
                        if (next.length === 0) next.push('');
                        setImageUrls(next);
                      }}
                      className="mt-2 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Supprimer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setImageUrls([...imageUrls, ''])}
                className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-200 font-medium mt-1"
              >
                <Plus className="h-4 w-4" /> Ajouter une URL d'image
              </button>
            </div>
          </div>

          {/* File Upload Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Upload className="h-4 w-4 inline mr-1" />
              Photos (upload)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['image_1', 'image_2', 'image_3'].map((key, idx) => {
                const hasNewFile = !!imagePreviews[key];
                const hasExisting = !!existingImages[key] && !imagesToClear.has(key);
                const previewSrc = hasNewFile ? imagePreviews[key] : hasExisting ? existingImages[key] : null;

                return (
                  <div key={key} className="relative">
                    {previewSrc ? (
                      <div className="relative group">
                        <img src={previewSrc} alt={`Photo ${idx + 1}`}
                          className="h-28 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                        <button type="button" onClick={() => {
                          if (hasNewFile) {
                            setImageFiles(p => ({ ...p, [key]: null }));
                            setImagePreviews(p => ({ ...p, [key]: null }));
                          } else if (hasExisting) {
                            setImagesToClear(prev => new Set([...prev, key]));
                          }
                        }}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                          <X className="h-3 w-3" />
                        </button>
                        {hasExisting && !hasNewFile && (
                          <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">En ligne</span>
                        )}
                      </div>
                    ) : (
                    <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition">
                      <Upload className="h-5 w-5 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-400">Photo {idx + 1}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 Mo par image'); return; }
                        setImageFiles(p => ({ ...p, [key]: file }));
                        const reader = new FileReader();
                        reader.onload = (ev) => setImagePreviews(p => ({ ...p, [key]: ev.target.result }));
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                  )}
                </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1">Formats acceptés : JPG, PNG, WebP · Max 5 Mo par image</p>
          </div>

          {/* Price type + Price */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de prix</label>
                <select value={form.price_type} onChange={(e) => setForm({ ...form, price_type: e.target.value, ...(e.target.value === 'quote' || e.target.value === 'free_estimate' ? { price: '', price_max: '' } : { price_max: '' }) })}
                  className={inputClass}>
                  <option value="quote">Sur devis</option>
                  <option value="fixed">Prix fixe</option>
                  <option value="hourly">Taux horaire</option>
                  <option value="free_estimate">Estimation gratuite</option>
                </select>
              </div>

              {/* Conditional price inputs based on type */}
              {form.price_type === 'fixed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fourchette de prix (€)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">Entre</span>
                    <input type="number" step="0.01" value={form.price} onChange={set('price')}
                      className={inputClass}
                      placeholder="Min" />
                    <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">et</span>
                    <input type="number" step="0.01" value={form.price_max} onChange={(e) => setForm({ ...form, price_max: e.target.value })}
                      className={inputClass}
                      placeholder="Max" />
                    <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">€</span>
                  </div>
                </div>
              )}

              {form.price_type === 'hourly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taux horaire</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.01" value={form.price} onChange={set('price')}
                      className={inputClass}
                      placeholder="0.00" />
                    <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0 font-medium">€ / heure</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ville *</label>
              <CityAutocomplete
                value={form.city}
                onChange={(val) => setForm({ ...form, city: val })}
                className={inputClass}
                required
                compact
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code postal</label>
              <PostalCodeAutocomplete
                value={form.postal_code}
                onChange={(val) => setForm(f => ({ ...f, postal_code: val }))}
                onCityResolved={(city) => setForm(f => ({ ...f, city: city }))}
                className={inputClass}
                compact
              />
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
