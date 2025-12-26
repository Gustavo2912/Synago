import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  parseCsvOrXlsx,
  validatePledges,
  simulatePledgeImport,
  commitPledgeImport,
  type PledgeInput,
} from "@/hooks/useImport";
import * as XLSX from "xlsx";

interface PledgeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

const pledgeFields = [
  { key: "phone", label: "Phone" },
  { key: "totalAmount", label: "Total Amount" },
  { key: "startDate", label: "Start Date" },
  { key: "frequency", label: "Frequency" },
  { key: "notes", label: "Notes" },
];

export function PledgeImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: PledgeImportDialogProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<"upload" | "map" | "validate" | "simulate" | "commit" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<any>(null);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [commitProgress, setCommitProgress] = useState({ processed: 0, added: 0, skipped: 0 });
  const [finalResult, setFinalResult] = useState<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const result = await parseCsvOrXlsx(uploadedFile);
    setParsedData(result);
    setStep("map");
  };

  const handleMapping = async () => {
    const mapped: PledgeInput[] = parsedData.rows.map((row: any) => ({
      phone: row[columnMapping.phone] || "",
      totalAmount: parseFloat(row[columnMapping.totalAmount]) || 0,
      startDate: row[columnMapping.startDate] || undefined,
      frequency: row[columnMapping.frequency] || undefined,
      notes: row[columnMapping.notes] || undefined,
    }));

    const validation = await validatePledges(mapped);
    setValidationResult(validation);
    setStep("validate");
  };

  const handleSimulation = async () => {
    const simulation = await simulatePledgeImport({
      valid: validationResult.valid,
    });
    setSimulationResult(simulation);
    setStep("simulate");
  };

  const handleCommit = async () => {
    setStep("commit");
    const result = await commitPledgeImport({
      valid: validationResult.valid,
      onProgress: setCommitProgress,
    });
    setFinalResult(result);
    setStep("done");
    onImportComplete?.();
  };

  const downloadTemplate = () => {
    const template = [
      {
        Phone: "1234567890",
        "Total Amount": "1000",
        "Start Date": "2025-01-01",
        Frequency: "monthly",
        Notes: "Example pledge",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pledge Template");
    XLSX.writeFile(workbook, "pledge_import_template.xlsx");
  };

  const resetDialog = () => {
    setStep("upload");
    setFile(null);
    setParsedData(null);
    setColumnMapping({});
    setValidationResult(null);
    setSimulationResult(null);
    setCommitProgress({ processed: 0, added: 0, skipped: 0 });
    setFinalResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Pledges</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file with pledge data
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Upload File (CSV or XLSX)</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="mt-2"
              />
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
        )}

        {step === "map" && parsedData && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Map Columns</AlertTitle>
              <AlertDescription>
                Found {parsedData.rows.length} rows. Map your file columns to pledge fields.
              </AlertDescription>
            </Alert>

            {pledgeFields.map((field) => (
              <div key={field.key}>
                <Label>{field.label}</Label>
                <Select
                  value={columnMapping[field.key]}
                  onValueChange={(value) =>
                    setColumnMapping({ ...columnMapping, [field.key]: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {parsedData.headers.map((header: string) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            <Button onClick={handleMapping} className="w-full">
              Validate Mapping
            </Button>
          </div>
        )}

        {step === "validate" && validationResult && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Validation Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-600">✓ Valid:</span>
                  <span className="font-bold">{validationResult.valid.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-600">⚠ Link Failed:</span>
                  <span className="font-bold">{validationResult.linkFailed.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">✗ Errors:</span>
                  <span className="font-bold">{validationResult.errors.length}</span>
                </div>
              </CardContent>
            </Card>

            {validationResult.linkFailed.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Link Failed</AlertTitle>
                <AlertDescription>
                  Some pledges could not be linked to existing donors. Make sure donors exist before importing pledges.
                </AlertDescription>
              </Alert>
            )}

            {validationResult.valid.length > 0 && (
              <Button onClick={handleSimulation} className="w-full">
                Continue to Simulation
              </Button>
            )}
          </div>
        )}

        {step === "simulate" && simulationResult && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Import Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Pledges to Add:</span>
                  <span className="font-bold text-green-600">{simulationResult.toAdd}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("map")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleCommit} className="flex-1">
                <Upload className="mr-2 h-4 w-4" />
                Commit Import
              </Button>
            </div>
          </div>
        )}

        {step === "commit" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Importing...</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress
                  value={
                    (commitProgress.processed / validationResult.valid.length) * 100
                  }
                />
                <div className="space-y-1 text-sm">
                  <div>Processed: {commitProgress.processed}</div>
                  <div className="text-green-600">Added: {commitProgress.added}</div>
                  <div className="text-red-600">Skipped: {commitProgress.skipped}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "done" && finalResult && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Import Complete</AlertTitle>
              <AlertDescription>
                Successfully added {finalResult.added} pledges.
                {finalResult.skipped > 0 && ` ${finalResult.skipped} failed.`}
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              onClick={() => {
                const url = URL.createObjectURL(finalResult.resultCsv);
                const a = document.createElement("a");
                a.href = url;
                a.download = "pledge_import_results.csv";
                a.click();
              }}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Results
            </Button>

            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
