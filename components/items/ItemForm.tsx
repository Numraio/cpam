import { useState, useEffect } from 'react';
import { Button } from 'react-daisyui';
import { InputWithLabel } from '@/components/shared';

interface ItemFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const ItemForm = ({ initialData, onSubmit, onCancel }: ItemFormProps) => {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    basePrice: '',
    baseCurrency: 'USD',
    uom: '',
    fxPolicy: 'PERIOD_AVG',
    contractId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        sku: initialData.sku || '',
        name: initialData.name || '',
        description: initialData.description || '',
        basePrice: initialData.basePrice?.toString() || '',
        baseCurrency: initialData.baseCurrency || 'USD',
        uom: initialData.uom || '',
        fxPolicy: initialData.fxPolicy || 'PERIOD_AVG',
        contractId: initialData.contractId || '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.basePrice || parseFloat(formData.basePrice) < 0) {
      newErrors.basePrice = 'Valid base price is required';
    }
    if (!formData.baseCurrency.trim()) {
      newErrors.baseCurrency = 'Currency is required';
    }
    if (!formData.uom.trim()) {
      newErrors.uom = 'Unit of measure is required';
    }
    if (!formData.contractId.trim()) {
      newErrors.contractId = 'Contract is required';
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
      await onSubmit({
        ...formData,
        basePrice: parseFloat(formData.basePrice),
      });
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
              label="SKU"
              name="sku"
              type="text"
              value={formData.sku}
              onChange={handleChange}
              error={errors.sku}
              placeholder="e.g., PROD-001"
              disabled={!!initialData} // SKU cannot be changed after creation
              required
            />
            <InputWithLabel
              label="Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="Product name"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel
              label="Unit of Measure"
              name="uom"
              type="text"
              value={formData.uom}
              onChange={handleChange}
              error={errors.uom}
              placeholder="e.g., kg, lb, MT, barrel"
              required
            />
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel
              label="Base Price"
              name="basePrice"
              type="number"
              step="0.000000000001"
              value={formData.basePrice}
              onChange={handleChange}
              error={errors.basePrice}
              placeholder="0.00"
              required
            />
            <div>
              <label className="label">
                <span className="label-text">Base Currency</span>
              </label>
              <select
                name="baseCurrency"
                className="select select-bordered w-full"
                value={formData.baseCurrency}
                onChange={handleChange}
                required
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="JPY">JPY - Japanese Yen</option>
                <option value="CNY">CNY - Chinese Yuan</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
              </select>
              {errors.baseCurrency && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.baseCurrency}</span>
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="label">
              <span className="label-text">FX Policy</span>
              <span className="label-text-alt text-gray-500">How to calculate FX rates</span>
            </label>
            <select
              name="fxPolicy"
              className="select select-bordered w-full"
              value={formData.fxPolicy}
              onChange={handleChange}
            >
              <option value="PERIOD_AVG">Period Average - Average FX rate over calculation period</option>
              <option value="EOP">End of Period - Last business day rate</option>
              <option value="EFFECTIVE_DATE">Effective Date - Rate on specific effective date</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Contract Association</h2>
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>For now, enter a contract ID directly. Contract management UI coming soon.</span>
          </div>
          <InputWithLabel
            label="Contract ID"
            name="contractId"
            type="text"
            value={formData.contractId}
            onChange={handleChange}
            error={errors.contractId}
            placeholder="Enter contract UUID"
            required
          />
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Price Adjustment Formula (PAM)</h2>
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>PAM formula builder is not yet implemented. You can assign a PAM after creating the item.</span>
          </div>
          <p className="text-sm text-gray-500">
            The Price Adjustment Mechanism (PAM) defines how this item's price is calculated based on index series and other factors.
          </p>
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
          {initialData ? 'Update Item' : 'Create Item'}
        </Button>
      </div>
    </form>
  );
};

export default ItemForm;
