import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { PlusCircle } from 'lucide-react';
import { itemsApi, getErrorMessage } from '../lib/api';
import { CATEGORIES } from '../lib/constants';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ImageUpload from '../components/ui/ImageUpload';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  category: z.enum([
    'electronics', 'clothing', 'accessories', 'books', 'documents',
    'keys', 'bags', 'sports', 'other',
  ]),
  type: z.enum(['lost', 'found']),
  locationName: z.string().min(2, 'Location is required'),
  locationBuilding: z.string().optional(),
  dateLostFound: z.string().min(1, 'Date is required'),
});

type FormData = z.infer<typeof schema>;

export default function PostItemPage() {
  const navigate = useNavigate();
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('category', data.category);
      formData.append('type', data.type);
      formData.append('dateLostFound', data.dateLostFound);
      formData.append(
        'location',
        JSON.stringify({
          name: data.locationName,
          building: data.locationBuilding || undefined,
        })
      );
      images.forEach((file) => formData.append('images', file));

      const { data: res } = await itemsApi.create(formData);
      toast.success('Item posted successfully!');
      if (res.suggestedMatches?.length) {
        toast.success(`Found ${res.suggestedMatches.length} potential match(es)!`);
      }
      navigate(`/items/${res.item._id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Post an Item</h1>
        </div>
        <p className="text-text-secondary">Report a lost or found item on campus</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Type"
              options={[
                { value: 'lost', label: 'Lost — I lost something' },
                { value: 'found', label: 'Found — I found something' },
              ]}
              error={errors.type?.message}
              {...register('type')}
            />
            <Select
              label="Category"
              placeholder="Select category"
              options={CATEGORIES}
              error={errors.category?.message}
              {...register('category')}
            />
          </div>

          <Input
            label="Title"
            placeholder="e.g. Black MacBook Pro 14"
            error={errors.title?.message}
            {...register('title')}
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
            <textarea
              className="w-full px-4 py-2.5 bg-surface-overlay border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 transition-all min-h-[120px] resize-y"
              placeholder="Describe the item in detail — color, brand, distinguishing features..."
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Location"
              placeholder="e.g. Library, 2nd floor"
              error={errors.locationName?.message}
              {...register('locationName')}
            />
            <Input
              label="Building (optional)"
              placeholder="e.g. Main Library"
              error={errors.locationBuilding?.message}
              {...register('locationBuilding')}
            />
          </div>

          <Input
            label="Date Lost / Found"
            type="date"
            error={errors.dateLostFound?.message}
            {...register('dateLostFound')}
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Photos</label>
            <ImageUpload images={images} onChange={setImages} />
          </div>

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Post Item
          </Button>
        </form>
      </Card>
    </div>
  );
}
