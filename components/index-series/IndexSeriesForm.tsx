import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Select';
import { Card, CardBody } from '@/components/ui/Card';
import BLSSeriesSelector from '@/components/integrations/BLSSeriesSelector';
import BLSPreviewModal from '@/components/integrations/BLSPreviewModal';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

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

  // Select options
  const providerOptions: SelectOption[] = [
    { value: 'MANUAL', label: 'Manual Entry' },
    { value: 'BLS', label: 'BLS (Bureau of Labor Statistics)' },
    { value: 'PLATTS', label: 'Platts' },
    { value: 'OANDA', label: 'Oanda (FX)' },
    { value: 'ARGUS', label: 'Argus' },
    { value: 'LME', label: 'London Metal Exchange' },
    { value: 'CME', label: 'Chicago Mercantile Exchange' },
    { value: 'API', label: 'Custom API' },
  ];

  const dataTypeOptions: SelectOption[] = [
    { value: 'INDEX', label: 'Index / Commodity Price' },
    { value: 'FX', label: 'Foreign Exchange Rate' },
    { value: 'CUSTOM', label: 'Custom / Other' },
  ];

  const frequencyOptions: SelectOption[] = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
  ];

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Show BLS selector when BLS provider is selected
    if (name === 'provider' && value === 'BLS') {
      setShowBLSSelector(true);
    } else if (name === 'provider' && value !== 'BLS') {
      setShowBLSSelector(false);
      setSelectedBLSSeries(null);
    }

    // Clear error for this field
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Series Code"
              name="seriesCode"
              type="text"
              value={formData.seriesCode}
              onChange={handleChange}
              error={errors.seriesCode}
              helperText="e.g., PLATTS_BRENT, USD_EUR"
              disabled={!!initialData}
              required
              autoComplete="off"
            />
            <Input
              label="Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              helperText="Descriptive name for this series"
              required
              autoComplete="off"
            />
          </div>

          <div className="mt-4">
            <Textarea
              label="Description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              helperText="Optional description of this index series"
            />
          </div>
        </CardBody>
      </Card>

      <Card variant="elevated">
        <CardBody>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Data Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Provider"
              value={formData.provider}
              onValueChange={handleSelectChange('provider')}
              options={providerOptions}
              error={errors.provider}
              required
            />

            <Select
              label="Data Type"
              value={formData.dataType}
              onValueChange={handleSelectChange('dataType')}
              options={dataTypeOptions}
              error={errors.dataType}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Input
              label="Unit"
              name="unit"
              type="text"
              value={formData.unit}
              onChange={handleChange}
              helperText="e.g., USD/bbl, EUR/USD (Optional)"
              autoComplete="off"
            />

            <Select
              label="Frequency"
              value={formData.frequency}
              onValueChange={handleSelectChange('frequency')}
              options={frequencyOptions}
              error={errors.frequency}
              required
            />
          </div>
        </CardBody>
      </Card>

      <Card variant="elevated">
        <CardBody>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Provider Configuration</h2>

          {formData.provider === 'BLS' && showBLSSelector ? (
            <div>
              <div className="flex items-start gap-3 p-4 mb-4 bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600 rounded-lg">
                <InformationCircleIcon className="h-5 w-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Select a BLS series from the catalog below. Data will be automatically imported from the Bureau of Labor Statistics API.
                </p>
              </div>

              <BLSSeriesSelector
                onSelect={handleBLSSeriesSelect}
                selectedSeriesId={selectedBLSSeries?.value}
              />
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600 rounded-lg">
              <InformationCircleIcon className="h-5 w-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Provider-specific configuration (API credentials, sync schedule, field mapping)
                will be available after creating the series.
              </p>
            </div>
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
          yearsBack={20}
        />
      )}
    </form>
  );
};

export default IndexSeriesForm;
