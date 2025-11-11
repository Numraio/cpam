import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { unparse } from 'papaparse';
import { ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface AuditTrailEntry {
  date: string;
  mechanismIndexValue: number;
  componentName: string;
  actualValue: number;
  normalizedValue: number;
}

interface DataAuditTableProps {
  auditTrail: AuditTrailEntry[];
  averagingRule?: string;
}

export default function DataAuditTable({
  auditTrail,
  averagingRule,
}: DataAuditTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Filter audit trail by search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return auditTrail;

    const term = searchTerm.toLowerCase();
    return auditTrail.filter(
      (entry) =>
        entry.componentName.toLowerCase().includes(term) ||
        format(new Date(entry.date), 'MMM dd, yyyy').toLowerCase().includes(term)
    );
  }, [auditTrail, searchTerm]);

  // Paginate data
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCSV = () => {
    const csvData = auditTrail.map((entry) => ({
      Date: format(new Date(entry.date), 'yyyy-MM-dd'),
      'Mechanism Index Value': entry.mechanismIndexValue.toFixed(2),
      'Component Name': entry.componentName,
      'Actual Raw Index Value': entry.actualValue.toFixed(2),
      'Normalized Value': entry.normalizedValue.toFixed(2),
    }));

    const csv = unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `pam-historical-data-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-base-100 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Data Audit Trail: Raw Index Values Used</h3>
        <button
          className="btn btn-sm btn-primary"
          onClick={handleExportCSV}
          disabled={auditTrail.length === 0}
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
          Export CSV
        </button>
      </div>

      {/* Search Bar */}
      <div className="form-control mb-4">
        <div className="input-group">
          <span className="bg-base-200">
            <MagnifyingGlassIcon className="h-5 w-5" />
          </span>
          <input
            type="text"
            placeholder="Search by component name or date..."
            className="input input-bordered w-full"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="alert alert-warning">
          <span>
            {searchTerm
              ? 'No matching data found.'
              : 'No audit trail data available.'}
          </span>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mechanism Index Value</th>
                  <th>Component Name</th>
                  <th>Actual Raw Index Value</th>
                  <th>Normalized Value</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((entry, index) => (
                  <tr key={index}>
                    <td className="text-sm">
                      {format(new Date(entry.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="text-sm font-semibold">
                      {entry.mechanismIndexValue.toFixed(2)}
                    </td>
                    <td className="text-sm">{entry.componentName}</td>
                    <td className="text-sm">${entry.actualValue.toFixed(2)}</td>
                    <td className="text-sm">
                      <span className="badge badge-sm badge-primary">
                        {entry.normalizedValue.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredData.length)} of{' '}
                {filteredData.length} entries
              </div>
              <div className="btn-group">
                <button
                  className="btn btn-sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  «
                </button>
                <button className="btn btn-sm">Page {currentPage}</button>
                <button
                  className="btn btn-sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer Note */}
      {averagingRule && (
        <div className="mt-6 p-4 bg-base-200 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Averaging Rule Applied:</strong> {averagingRule}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            All calculations for indices adhere to this rule for consistency and
            contract compliance.
          </p>
        </div>
      )}
    </div>
  );
}
