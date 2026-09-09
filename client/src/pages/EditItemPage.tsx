import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Pencil, ChevronLeft } from 'lucide-react';
import { itemsApi, getErrorMessage } from '../lib/api';
import { CATEGORIES, ITEM_CONDITIONS } from '../lib/constants';
import { getImageUrl } from '../lib/utils';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ImageUpload from '../components/ui/ImageUpload';
import Spinner from '../components/ui/Spinner';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  category: z.enum([
    'electronics', 'clothing', 'accessories', 'books', 'documents',
    'keys', 'bags', 'sports', 'other',
  ]),
  locationName: z.string().min(2, 'Location is required'),
  locationBuilding: z.string().optional(),
  dateLostFound: z.string().min(1, 'Date is required'),
  color: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
  condition: z.enum(['new', 'excellent', 'good', 'fair', 'poor']),
  uniqueMarks: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [verificationQuestions, setVerificationQuestions] = useState([
    { question: '', answer: '' },
  ]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!id) return;
    itemsApi
      .getById(id)
      .then(({ data }) => {
        const item = data.item;
        setExistingImages(item.images || []);
        reset({
          title: item.title,
          description: item.description,
          category: item.category,
          locationName: item.location.name,
          locationBuilding: item.location.building || '',
          dateLostFound: item.dateLostFound?.slice(0, 10),
          color: item.color || '',
          brand: item.brand || '',
          size: item.size || '',
          condition: item.condition || 'good',
          uniqueMarks: item.uniqueMarks || '',
        });
        if (item.verificationQuestions?.length) {
          setVerificationQuestions(
            item.verificationQuestions.map((q) => ({ question: q.question, answer: '' }))
          );
        }
      })
      .catch(() => {
        toast.error('Could not load item');
        navigate('/browse');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, reset]);

  const onSubmit = async (data: FormData) => {
    if (!id) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('category', data.category);
      formData.append('dateLostFound', data.dateLostFound);
      formData.append('color', data.color || '');
      formData.append('brand', data.brand || '');
      formData.append('size', data.size || '');
      formData.append('condition', data.condition);
      formData.append('uniqueMarks', data.uniqueMarks || '');
      formData.append(
        'location',
        JSON.stringify({
          name: data.locationName,
          building: data.locationBuilding || undefined,
        })
      );
      const filledQuestions = verificationQuestions.filter((q) => q.question.trim() && q.answer.trim());
      if (filledQuestions.length) {
        formData.append('verificationQuestions', JSON.stringify(filledQuestions));
      }
      newImages.forEach((file) => formData.append('images', file));

      await itemsApi.update(id, formData);
      toast.success('Item updated');
      navigate(`/items/${id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to={`/items/${id}`} className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to item
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Pencil className="w-5 h-5 text-accent" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-text-primary">Edit item</h1>
        </div>
        <p className="text-text-secondary">Update details anytime — clearer posts get better matches.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Select
            label="Category"
            options={CATEGORIES}
            error={errors.category?.message}
            {...register('category')}
          />

          <Input label="Title" error={errors.title?.message} {...register('title')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Color" {...register('color')} />
            <Input label="Brand" {...register('brand')} />
            <Input label="Size" {...register('size')} />
            <Select label="Condition" options={ITEM_CONDITIONS} {...register('condition')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
            <textarea
              className="w-full px-4 py-2.5 bg-surface-overlay border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-[120px] resize-y"
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Unique characteristics</label>
            <textarea
              className="w-full px-4 py-2.5 bg-surface-overlay border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-[90px] resize-y"
              {...register('uniqueMarks')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Location" error={errors.locationName?.message} {...register('locationName')} />
            <Input label="Building (optional)" {...register('locationBuilding')} />
          </div>

          <Input label="Date Lost / Found" type="date" {...register('dateLostFound')} />

          {existingImages.length > 0 && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Current photos</p>
              <div className="flex flex-wrap gap-2">
                {existingImages.map((src) => (
                  <div key={src} className="w-16 h-16 rounded-xl overflow-hidden border border-border">
                    <img src={getImageUrl(src)!} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Add more photos</label>
            <ImageUpload images={newImages} onChange={setNewImages} />
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-text-secondary">Update verification questions</h3>
              <p className="text-xs text-text-muted mt-1">
                Re-enter answers to replace questions (leave blank to keep existing ones).
              </p>
            </div>
            {verificationQuestions.map((entry, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={`Question ${index + 1}`}
                  value={entry.question}
                  onChange={(e) =>
                    setVerificationQuestions((current) =>
                      current.map((q, i) => (i === index ? { ...q, question: e.target.value } : q))
                    )
                  }
                />
                <Input
                  label={`Answer ${index + 1}`}
                  value={entry.answer}
                  onChange={(e) =>
                    setVerificationQuestions((current) =>
                      current.map((q, i) => (i === index ? { ...q, answer: e.target.value } : q))
                    )
                  }
                />
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full" size="lg" loading={saving}>
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
