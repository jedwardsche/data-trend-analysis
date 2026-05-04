import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { printPage } from '@/lib/pdf';

export function PdfButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={printPage}
      title="Print / Save as PDF"
      data-print-hide
    >
      <Printer className="h-4 w-4" />
    </Button>
  );
}
