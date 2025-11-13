import { useState, useEffect } from 'react';
import { Button } from 'react-daisyui';
import { InputWithLabel } from '@/components/shared';
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
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel
              label="Series Code"
              name="seriesCode"
              type="text"
              value={formData.seriesCode}
              onChange={handleChange}
              error={errors.seriesCode}
              placeholder="e.g., PLATTS_BRENT, USD_EUR"
              disabled={!!initialData} // Series code cannot be changed after creation
              required
            />
            <InputWithLabel
              label="Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="Descriptive name"
              required
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              name="description"
              className="textarea textarea-bordered w-full"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description"
            />
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Data Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Provider</span>
              </label>
              <select
                name="provider"
                className="select select-bordered w-full"
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
                <label className="label">
                  <span className="label-text-alt text-error">{errors.provider}</span>
                </label>
              )}
            </div>

            <div>
              <label className="label">
                <span className="label-text">Data Type</span>
              </label>
              <select
                name="dataType"
                className="select select-bordered w-full"
                value={formData.dataType}
                onChange={handleChange}
                required
              >
                <option value="INDEX">Index / Commodity Price</option>
                <option value="FX">Foreign Exchange Rate</option>
                <option value="CUSTOM">Custom / Other</option>
              </select>
              {errors.dataType && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.dataType}</span>
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel
              label="Unit (Optional)"
              name="unit"
              type="text"
              value={formData.unit}
              onChange={handleChange}
              placeholder="e.g., USD/bbl, EUR/USD"
            />

            <div>
              <label className="label">
                <span className="label-text">Frequency</span>
              </label>
              <select
                name="frequency"
                className="select select-bordered w-full"
                value={formData.frequency}
                onChange={handleChange}
                required
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
              {errors.frequency && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.frequency}</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Provider Configuration</h2>

          {formData.provider === 'BLS' && showBLSSelector ? (
            <div>
              <div className="alert alert-info mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>
                  Select a BLS series from the catalog below. Data will be automatically imported from the Bureau of Labor Statistics API.
                </span>
              </div>

              <BLSSeriesSelector
                onSelect={handleBLSSeriesSelect}
                selectedSeriesId={selectedBLSSeries?.value}
              />
            </div>
          ) : (
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>
                Provider-specific configuration (API credentials, sync schedule, field mapping)
                will be available after creating the series.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          color="ghost"
          size="md"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          color="primary"
          size="md"
          loading={isSubmitting}
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
