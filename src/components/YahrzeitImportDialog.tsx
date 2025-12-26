import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Download, Check, X, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  parseCsvOrXlsx,
  validateYahrzeits,
  simulateYahrzeitImport,
  commitYahrzeitImport,
  type YahrzeitInput,
  type ParseResult,
} from "@/hooks/useImport";
import * as XLSX from "xlsx";

interface YahrzeitImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

const yahrzeitFields = [
  { id: "phone", label: "Phone", required: true },
  { id: "deceasedName", label: "Deceased Name", required: true },
  { id: "hebrewDate", label: "Hebrew Date", required: true },
  { id: "secularDate", label: "Secular Date (YYYY-MM-DD)", required: true },
  { id: "relationship", label: "Relationship", required: false },
  { id: "notes", label: "Notes", required: false },
  { id: "contactEmail", label: "Contact Email", required: false },
  { id: "contactPhone", label: "Contact Phone", required: false },
];

export const YahrzeitImportDialog = ({ open, onOpenChange, onImportComplete }: YahrzeitImportDialogProps) => {
  const [step, setStep] = useState<"upload" | "map" | "validate" | "simulate" | "commit" | "complete">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParseResult<Record<string, string>> | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<Awaited<ReturnType<typeof validateYahrzeits>> | null>(null);
  const [simulation, setSimulation] = useState<Awaited<ReturnType<typeof simulateYahrzeitImport>> | null>(null);
  const [commitProgress, setCommitProgress] = useState({ processed: 0, added: 0, skipped: 0 });
  const [importResult, setImportResult] = useState<Awaited<ReturnType<typeof commitYahrzeitImport>> | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const result = await parseCsvOrXlsx(selectedFile);
    setParsed(result);
    setStep("map");
  };

  const handleMapping = async () => {
    if (!parsed) return;

    const mapped: YahrzeitInput[] = parsed.rows.map((row) => ({
      phone: row[mapping.phone] || "",
      deceasedName: row[mapping.deceasedName] || "",
      hebrewDate: row[mapping.hebrewDate] || "",
      secularDate: row[mapping.secularDate] || "",
      relationship: row[mapping.relationship] || undefined,
      notes: row[mapping.notes] || undefined,
      contactEmail: row[mapping.contactEmail] || undefined,
      contactPhone: row[mapping.contactPhone] || undefined,
    }));

    const validated = await validateYahrzeits(mapped);
    setValidation(validated);
    setStep("validate");
  };

  const handleSimulation = async () => {
    if (!validation) return;

    const sim = await simulateYahrzeitImport({ valid: validation.valid });
    setSimulation(sim);
    setStep("simulate");
  };

  const handleCommit = async () => {
    if (!validation) return;

    setStep("commit");
    const result = await commitYahrzeitImport({
      valid: validation.valid,
      onProgress: setCommitProgress,
    });
    setImportResult(result);
    setStep("complete");
    onImportComplete?.();
  };

  const downloadTemplate = () => {
    const template = [
      {
        Phone: "555-1234",
        "Deceased Name": "John Doe",
        "Hebrew Date": "15 Tishrei 5784",
        "Secular Date": "2024-09-30",
        Relationship: "Father",
        Notes: "Example note",
        "Contact Email": "family@example.com",
        "Contact Phone": "+1 555-5678",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "yahrzeit_import_template.xlsx");
  };

  const resetDialog = () => {
    setStep("upload");
    setFile(null);
    setParsed(null);
    setMapping({});
    setValidation(null);
    setSimulation(null);
    setCommitProgress({ processed: 0, added: 0, skipped: 0 });
    setImportResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetDialog(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Yahrzeits</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Upload CSV or Excel File</Label>
              <Input id="file" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
        )}

        {step === "map" && parsed && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Map your file columns to the required fields
              </AlertDescription>
            </Alert>

            {yahrzeitFields.map((field) => (
              <div key={field.id}>
                <Label>
                  {field.label} {field.required && <span className="text-destructive">*</span>}
                </Label>
                <Select value={mapping[field.id]} onValueChange={(v) => setMapping({ ...mapping, [field.id]: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {parsed.headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            <Button onClick={handleMapping} disabled={!mapping.phone || !mapping.deceasedName || !mapping.hebrewDate || !mapping.secularDate}>
              Continue to Validation
            </Button>
          </div>
        )}

        {step === "validate" && validation && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Valid: {validation.valid.length}</span>
                </div>
              </div>
              <div className="p-4 border rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span>Link Failed: {validation.linkFailed.length}</span>
                </div>
              </div>
              <div className="p-4 border rounded">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-600" />
                  <span>Errors: {validation.errors.length}</span>
                </div>
              </div>
            </div>

            {validation.linkFailed.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some records could not be linked (missing donor or invalid data). They will be skipped.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSimulation} disabled={validation.valid.length === 0}>
                Continue to Simulation
              </Button>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === "simulate" && simulation && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ready to import {simulation.toAdd} yahrzeits
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={handleCommit}>
                <Upload className="mr-2 h-4 w-4" />
                Commit Import
              </Button>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === "commit" && (
          <div className="space-y-4">
            <Progress value={(commitProgress.processed / (validation?.valid.length || 1)) * 100} />
            <div className="text-center">
              <p>Processing: {commitProgress.processed} / {validation?.valid.length}</p>
              <p>Added: {commitProgress.added}, Skipped: {commitProgress.skipped}</p>
            </div>
          </div>
        )}

        {step === "complete" && importResult && (
          <div className="space-y-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Import complete! Added: {importResult.added}, Skipped: {importResult.skipped}
              </AlertDescription>
            </Alert>

            <Button onClick={resetDialog}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
