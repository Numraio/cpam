import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';
import { Button } from '@/components/ui/Button';
import { ArrowLeftIcon, DocumentArrowUpIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import useTeams from '@/hooks/useTeams';
import { Loading } from '@/components/shared';
import PageHeader from '@/components/navigation/PageHeader';

const ImportItemsPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { teams, isLoading } = useTeams();
  const teamSlug = teams?.[0]?.slug;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<any[]>([]);

  if (isLoading) {
    return <Loading />;
  }

  if (!teamSlug) {
    return (
      <div className="p-6">
        <div className="alert alert-warning">
          <span>No team found. Please create or join a team first.</span>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(null);

      // Parse and preview CSV
      parseCSVPreview(selectedFile);
    }
  };

  const parseCSVPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj: any, header, index) => {
          obj[header] = values[index];
          return obj;
        }, {});
      });
      setPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/teams/${teamSlug}/items/import`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import items');
      }

      setSuccess(`Successfully imported ${result.imported} items`);
      setFile(null);
      setPreview([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Redirect to items list after 2 seconds
      setTimeout(() => {
        router.push('/items');
      }, 2000);
    } catch (err: any) {
      console.error('Error importing items:', err);
      setError(err.message || 'Failed to import items. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'sku,name,description,basePrice,baseCurrency,uom,contractId,fxPolicy\n' +
      'PROD-001,Sample Product 1,Sample description,100.50,USD,kg,CONTRACT-UUID-HERE,PERIOD_AVG\n' +
      'PROD-002,Sample Product 2,Another description,250.75,EUR,MT,CONTRACT-UUID-HERE,EOP';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'items-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Import Items from CSV"
        subtitle="Bulk import portfolio items from a CSV file"
        sticky
        secondaryActions={
          <Button
            variant="ghost"
            size="md"
            leftIcon={<ArrowLeftIcon className="h-5 w-5" />}
            onClick={() => router.push('/items')}
          >
            Back to Items
          </Button>
        }
      />

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success mb-6">
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Upload CSV File</h2>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Select CSV file</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="file-input file-input-bordered w-full"
                />
              </div>

              {file && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600">Selected file: {file.name}</p>
                  <p className="text-sm text-gray-600">Size: {(file.size / 1024).toFixed(2)} KB</p>
                </div>
              )}

              {preview.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Preview (first 5 rows):</h3>
                  <div className="overflow-x-auto">
                    <table className="table table-compact w-full">
                      <thead>
                        <tr>
                          {Object.keys(preview[0]).map((header) => (
                            <th key={header}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value: any, i) => (
                              <td key={i}>{value}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="card-actions justify-end mt-4">
                <Button
                  color="primary"
                  size="md"
                  leftIcon={<DocumentArrowUpIcon className="h-5 w-5" />}
                  onClick={handleUpload}
                  loading={isUploading}
                  disabled={!file || isUploading}
                >
                  Import Items
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-sm">CSV Format</h2>
              <div className="text-sm space-y-2">
                <p className="font-semibold">Required columns:</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li>sku</li>
                  <li>name</li>
                  <li>basePrice</li>
                  <li>baseCurrency</li>
                  <li>uom</li>
                  <li>contractId</li>
                </ul>
                <p className="font-semibold mt-4">Optional columns:</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li>description</li>
                  <li>fxPolicy (PERIOD_AVG, EOP, EFFECTIVE_DATE)</li>
                  <li>pamId</li>
                </ul>
              </div>
              <div className="card-actions justify-start mt-4">
                <Button
                  size="md"
                  variant="ghost"
                  leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                  onClick={downloadTemplate}
                >
                  Download Template
                </Button>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl mt-4">
            <div className="card-body">
              <h2 className="card-title text-sm">Important Notes</h2>
              <div className="text-xs space-y-2 text-gray-600">
                <p>• SKU must be unique within your team</p>
                <p>• Duplicate SKUs will be skipped</p>
                <p>• Contract IDs must exist in your system</p>
                <p>• Invalid rows will be reported after import</p>
                <p>• Maximum file size: 10 MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ImportItemsPage.getLayout = function getLayout(page: ReactElement) {
  return <AccountLayout>{page}</AccountLayout>;
};

export default ImportItemsPage;
