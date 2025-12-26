import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  parseCsvOrXlsx,
  validateDonors,
  commitDonorImport,
  type DonorInput,
} from '@/hooks/useImport';
import * as XLSX from 'xlsx';
import { downloadBlob } from '@/hooks/useReports';

const donorFields = ['phone', 'firstName', 'lastName', 'displayName', 'email', 'addressCity', 'notes'];

interface DonorImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DonorImportDialog({ open, onOpenChange, onSuccess }: DonorImportDialogProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    try {
      setFile(uploadedFile);
      const parsedData = await parseCsvOrXlsx(uploadedFile);
      setParsed(parsedData);
      setStep(1);
      
      if (parsedData.warnings.length > 0) {
        toast.warning(`${t('import.parsedWith')} ${parsedData.warnings.length} ${t('import.warnings')}`);
      }
    } catch (error: any) {
      toast.error(error.message || t('import.parseFailed'));
    }
  };

  const handleMapping = async () => {
    if (!parsed) return;

    const mappedRows: DonorInput[] = parsed.rows.map((row: any) => {
      const mapped: any = {};
      Object.entries(mapping).forEach(([field, column]) => {
        if (column && column !== 'unmapped') {
          mapped[field] = row[column];
        }
      });
      return mapped;
    });

    try {
      const validationResult = await validateDonors(mappedRows);
      setValidation(validationResult);
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || t('import.validationFailed'));
    }
  };

  const handleImport = async () => {
    if (!validation) return;

    try {
      setImporting(true);
      const result = await commitDonorImport({
        valid: validation.valid,
        toMerge: validation.toMerge,
        onProgress: setProgress,
      });
      
      toast.success(`${t('import.done')}: ${result.added} added, ${result.merged} merged`);
      
      // Invalidate donors query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['donors'] });
      
      onSuccess();
      handleReset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || t('import.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setFile(null);
    setParsed(null);
    setMapping({});
    setValidation(null);
    setProgress(null);
  };

  const downloadTemplate = () => {
    const template = [
      { phone: '0501234567', firstName: 'John', lastName: 'Doe', displayName: 'John Doe', email: 'john@example.com', addressCity: 'Tel Aviv', notes: 'Sample donor' }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Donors');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlob(new Blob([buffer]), 'donor-template.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleReset();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl border-border/50 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('import.tab.donors')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Step {step + 1} of 3: {['Upload file', 'Map columns', 'Import'][step]}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {step === 0 && (
            <>
              <div className="bg-accent/20 border border-border/50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm">Required Fields</h4>
                <p className="text-sm text-muted-foreground">
                  Your Excel sheet or CSV file must include the following fields:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  <li><span className="font-medium">name</span> - Donor name</li>
                  <li><span className="font-medium">phone number</span> - Contact phone (required)</li>
                  <li><span className="font-medium">email</span> - Email address</li>
                  <li><span className="font-medium">city</span> - City/Location</li>
                  <li><span className="font-medium">notes</span> - Additional notes</li>
                </ul>
              </div>
              
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <div className="space-y-2">
                <Label htmlFor="donor-file">Upload CSV or Excel file</Label>
                <Input
                  id="donor-file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                />
              </div>
            </>
          )}

          {step === 1 && parsed && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {parsed.rows.length} rows found. Map columns to fields:
              </p>
              {donorFields.map((field) => (
                <div key={field} className="flex items-center gap-4">
                  <Label className="w-40">
                    {field} {field === 'phone' && <Badge variant="destructive" className="ml-2">Required</Badge>}
                  </Label>
                  <Select
                    value={mapping[field] || 'unmapped'}
                    onValueChange={(v) => setMapping({ ...mapping, [field]: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unmapped">Not mapped</SelectItem>
                      {parsed.headers.map((h: string) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                <Button onClick={handleMapping} disabled={!mapping.phone}>
                  Next: Validate
                </Button>
              </div>
            </div>
          )}

          {step === 2 && validation && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="text-green-600 flex items-center gap-2 text-2xl font-bold">
                    <CheckCircle2 className="h-5 w-5" />
                    {validation.valid.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Valid</p>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-yellow-600 flex items-center gap-2 text-2xl font-bold">
                    <AlertCircle className="h-5 w-5" />
                    {validation.toMerge.length}
                  </div>
                  <p className="text-sm text-muted-foreground">To Merge</p>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-red-600 flex items-center gap-2 text-2xl font-bold">
                    <AlertCircle className="h-5 w-5" />
                    {validation.errors.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>

              {progress && (
                <div className="space-y-2">
                  <Progress value={(progress.processed / (validation.valid.length + validation.toMerge.length)) * 100} />
                  <p className="text-sm text-muted-foreground text-center">
                    Processing: {progress.processed} / {validation.valid.length + validation.toMerge.length}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} disabled={importing}>Back</Button>
                <Button onClick={handleImport} disabled={importing}>
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? 'Importing...' : `Import ${validation.valid.length + validation.toMerge.length} donors`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
