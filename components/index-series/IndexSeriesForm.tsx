import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import BLSSeriesSelector from '@/components/integrations/BLSSeriesSelector';
import BLSPreviewModal from '@/components/integrations/BLSPreviewModal';

interface IndexSeriesFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const IndexSeriesForm = ({ initialData, onSubmit, onCancel }: IndexSeriesFormProps) => {
  const [formData, setFormData] = useState({
    seriesCode: '',
    name: '',
    description: '',
    provider: 'MANUAL',
    dataType: 'INDEX',
    unit: '',
    frequency: 'DAILY',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBLSSelector, setShowBLSSelector] = useState(false);
  const [showBLSPreview, setShowBLSPreview] = useState(false);
  const [selectedBLSSeries, setSelectedBLSSeries] = useState<any>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        seriesCode: initialData.seriesCode || '',
        name: initialData.name || '',
        description: initialData.description || '',
        provider: initialData.provider || 'MANUAL',
        dataType: initialData.dataType || 'INDEX',
        unit: initialData.unit || '',
        frequency: initialData.frequency || 'DAILY',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Show BLS selector when BLS provider is selected
    if (name === 'provider' && value === 'BLS') {
      setShowBLSSelector(true);
    } else if (name === 'provider' && value !== 'BLS') {
      setShowBLSSelector(false);
      setSelectedBLSSeries(null);
    }

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleBLSSeriesSelect = (seriesId: string, seriesInfo: any) => {
    setSelectedBLSSeries(seriesInfo);
    setFormData((prev) => ({
      ...prev,
      seriesCode: `BLS_${seriesId}`,
      name: seriesInfo.label,
      description: seriesInfo.description,
      dataType: seriesInfo.category === 'FX' ? 'FX' : 'INDEX',
      frequency: seriesInfo.frequency === 'MONTHLY' ? 'MONTHLY' : seriesInfo.frequency === 'QUARTERLY' ? 'MONTHLY' : 'DAILY',
    }));
    setShowBLSPreview(true);
  };

  const handleBLSPreviewConfirm = () => {
    setShowBLSPreview(false);
    // Form data is already populated from handleBLSSeriesSelect
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.seriesCode.trim()) {
      newErrors.seriesCode = 'Series code is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.provider.trim()) {
      newErrors.provider = 'Provider is required';
    }
    if (!formData.dataType.trim()) {
      newErrors.dataType = 'Data type is required';
    }
    if (!formData.frequency.trim()) {
      newErrors.frequency = 'Frequency is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card variant="elevated">
        <CardBody>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Series Code <span className="text-error">*</span>
              </label>
              <Input
                name="seriesCode"
                type="text"
                value={formData.seriesCode}
                onChange={handleChange}
                error={errors.seriesCode}
                placeholder="e.g., PLATTS_BRENT, USD_EUR"
                disabled={!!initialData}
                required
              />
              {errors.seriesCode && (
                <p className="mt-1 text-sm text-error">{errors.seriesCode}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name <span className="text-error">*</span>
              </label>
              <Input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="Descriptive name"
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-error">{errors.name}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-normal"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description"
            />
          </div>
        </CardBody>
      </Card>

      <Card variant="elevated">
        <CardBody>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Provider <span className="text-error">*</span>
              </label>
              <select
                name="provider"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-normal bg-white"
                value={formData.provider}
                onChange={handleChange}
                required
              >
                <option value="MANUAL">Manual Entry</option>
                <option value="BLS">BLS (Bureau of Labor Statistics)</option>
                <option value="PLATTS">Platts</option>
                <option value="OANDA">Oanda (FX)</option>
                <option value="ARGUS">Argus</option>
                <option value="LME">London Metal Exchange</option>
                <option value="CME">Chicago Mercantile Exchange</option>
                <option value="API">Custom API</option>
              </select>
              {errors.provider && (
                <p className="mt-1 text-sm text-error">{errors.provider}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Data Type <span className="text-error">*</span>
              </label>
              <select
                name="dataType"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-normal bg-white"
                value={formData.dataType}
                onChange={handleChange}
                required
              >
                <option value="INDEX">Index / Commodity Price</option>
                <option value="FX">Foreign Exchange Rate</option>
                <option value="CUSTOM">Custom / Other</option>
              </select>
              {errors.dataType && (
                <p className="mt-1 text-sm text-error">{errors.dataType}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Unit (Optional)
              </label>
              <Input
                name="unit"
                type="text"
                value={formData.unit}
                onChange={handleChange}
                placeholder="e.g., USD/bbl, EUR/USD"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Frequency <span className="text-error">*</span>
              </label>
              <select
                name="frequency"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-normal bg-white"
                value={formData.frequency}
                onChange={handleChange}
                required
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
              {errors.frequency && (
                <p className="mt-1 text-sm text-error">{errors.frequency}</p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card variant="elevated">
        <CardBody>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Provider Configuration</h2>

          {formData.provider === 'BLS' && showBLSSelector ? (
            <div>
              <Card variant="bordered" className="border-l-4 border-l-primary mb-4">
                <CardBody className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6 text-primary-600 mt-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-sm text-gray-700">
                    Select a BLS series from the catalog below. Data will be automatically imported from the Bureau of Labor Statistics API.
                  </p>
                </CardBody>
              </Card>

              <BLSSeriesSelector
                onSelect={handleBLSSeriesSelect}
                selectedSeriesId={selectedBLSSeries?.value}
              />
            </div>
          ) : (
            <Card variant="bordered" className="border-l-4 border-l-primary">
              <CardBody className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6 text-primary-600 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p className="text-sm text-gray-700">
                  Provider-specific configuration (API credentials, sync schedule, field mapping)
                  will be available after creating the series.
                </p>
              </CardBody>
            </Card>
          )}
        </CardBody>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {initialData ? 'Update Index Series' : 'Create Index Series'}
        </Button>
      </div>

      {/* BLS Preview Modal */}
      {selectedBLSSeries && (
        <BLSPreviewModal
          isOpen={showBLSPreview}
          onClose={() => setShowBLSPreview(false)}
          onConfirm={handleBLSPreviewConfirm}
          seriesId={selectedBLSSeries.value}
          seriesName={selectedBLSSeries.label}
          yearsBack={2}
        />
      )}
    </form>
  );
};

export default IndexSeriesForm;
