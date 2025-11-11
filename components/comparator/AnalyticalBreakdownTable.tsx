import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { unparse } from 'papaparse';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';

interface BreakdownRow {
  detail: string;
  mechanismA: string | number;
  mechanismB: string | number;
  isDifferent: boolean;
}

interface AnalyticalBreakdownTableProps {
  breakdownData: BreakdownRow[];
  mechanismAName: string;
  mechanismBName: string;
}

export default function AnalyticalBreakdownTable({
  breakdownData,
  mechanismAName,
  mechanismBName,
}: AnalyticalBreakdownTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  const handleExportCSV = () => {
    const csvData = breakdownData.map((row) => ({
      Detail: row.detail,
      [mechanismAName]: row.mechanismA,
      [mechanismBName]: row.mechanismB,
      Different: row.isDifferent ? 'Yes' : 'No',
    }));

    const csv = unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `comparison-breakdown-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!tableRef.current) return;

    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`comparison-report-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="bg-base-100 rounded-lg shadow-lg p-6" ref={tableRef}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-lg">Analytical Breakdown</h3>
          <p className="text-sm text-gray-600">Component-level comparison of formula configurations</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleExportCSV}
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            CSV
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={handleExportPDF}
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            PDF
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Detail</th>
              <th>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  {mechanismAName}
                </div>
              </th>
              <th>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  {mechanismBName}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {breakdownData.map((row, index) => (
              <tr key={index}>
                <td className="font-medium">{row.detail}</td>
                <td
                  className={
                    row.isDifferent
                      ? 'bg-blue-50 font-semibold'
                      : ''
                  }
                >
                  {row.mechanismA}
                </td>
                <td
                  className={
                    row.isDifferent
                      ? 'bg-orange-50 font-semibold'
                      : ''
                  }
                >
                  {row.mechanismB}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-base-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Legend:</strong> Cells with light blue or orange backgrounds indicate differences between the two mechanisms.
          These differences are the primary drivers of divergence in the comparison chart above.
        </p>
      </div>
    </div>
  );
}
