import { Bill } from '../types';

// Escapes a value for use in a CSV cell
function escapeCsvCell(value: any): string {
  const stringValue = String(value ?? '').replace(/"/g, '""');
  // Enclose in double quotes if it contains a comma, newline, or double quote
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue}"`;
  }
  return stringValue;
}

export function downloadBillsAsCSV(bills: Bill[], date: string): void {
  if (!bills || bills.length === 0) return;

  const headers = ['BILL_KIND', 'BILL_NAME', 'PROC_RESULT_CD', 'PROC_DT', 'BILL_ID', 'COMMITTEE', 'PROPOSER', 'LINK_URL'];
  
  const csvHeader = headers.join(',');
  
  const csvRows = bills.map(bill => 
    headers.map(header => escapeCsvCell(bill[header])).join(',')
  );

  const csvContent = [csvHeader, ...csvRows].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `passed_bills_${date}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
