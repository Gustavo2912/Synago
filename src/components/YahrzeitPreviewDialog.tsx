import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { format } from "date-fns";

interface YahrzeitPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  yahrzeits: any[];
  onPrint: () => void;
}

export const YahrzeitPreviewDialog = ({ open, onOpenChange, yahrzeits, onPrint }: YahrzeitPreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yahrzeit Announcement Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {yahrzeits.map((yahrzeit) => (
            <div
              key={yahrzeit.id}
              className="border-2 border-border p-8 rounded-lg bg-card"
              style={{ fontFamily: "'Times New Roman', serif" }}
            >
              <h1 className="text-center text-3xl font-bold mb-6 pb-4 border-b-2 border-double border-border">
                יזכור / Yahrzeit Remembrance
              </h1>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xl">
                  <span className="font-bold">Deceased Name:</span>
                  <span>{yahrzeit.deceased_name}</span>
                </div>

                <div className="flex justify-between items-center text-xl text-right" dir="rtl">
                  <span>{yahrzeit.deceased_name}</span>
                  <span className="font-bold">:שם הנפטר</span>
                </div>

                {yahrzeit.relationship && (
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-bold">Relationship:</span>
                    <span>{yahrzeit.relationship}</span>
                  </div>
                )}

                <div className="border-t border-border my-4"></div>

                <div className="flex justify-between items-center text-xl text-right" dir="rtl">
                  <span>{yahrzeit.hebrew_date}</span>
                  <span className="font-bold">:תאריך עברי</span>
                </div>

                <div className="flex justify-between items-center text-xl">
                  <span className="font-bold">Hebrew Date:</span>
                  <span>{yahrzeit.hebrew_date}</span>
                </div>

                <div className="flex justify-between items-center text-xl">
                  <span className="font-bold">Secular Date:</span>
                  <span>
                    {format(new Date(yahrzeit.secular_date), "MMMM d, yyyy")}
                  </span>
                </div>

                {yahrzeit.include_service_times && (yahrzeit.shacharit_time || yahrzeit.mincha_time || yahrzeit.maariv_time) && (
                  <>
                    <div className="border-t border-border my-4"></div>
                    <div className="bg-muted/50 p-4 rounded">
                      <h3 className="text-xl font-bold mb-3">
                        קדיש יאמר בתפילות / Kaddish Will Be Recited:
                      </h3>
                      <div className="space-y-2">
                        {yahrzeit.shacharit_time && (
                          <div className="text-lg">
                            <strong>Shacharit (שחרית):</strong> {yahrzeit.shacharit_time}
                          </div>
                        )}
                        {yahrzeit.mincha_time && (
                          <div className="text-lg">
                            <strong>Mincha (מנחה):</strong> {yahrzeit.mincha_time}
                          </div>
                        )}
                        {yahrzeit.maariv_time && (
                          <div className="text-lg">
                            <strong>Maariv (מעריב):</strong> {yahrzeit.maariv_time}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t border-border my-4"></div>

                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold">In Memory of:</span>
                  <span>{yahrzeit.donors.name}</span>
                </div>

                {yahrzeit.notes && (
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-bold">Notes:</span>
                    <span>{yahrzeit.notes}</span>
                  </div>
                )}

                {yahrzeit.include_donation_request && yahrzeit.donation_text && (
                  <div className="bg-muted border-2 border-dashed border-border p-6 rounded text-center my-4">
                    <h3 className="text-xl font-bold mb-3">Memorial Donation</h3>
                    <p className="text-base leading-relaxed">{yahrzeit.donation_text}</p>
                  </div>
                )}

                <div className="text-center italic mt-6 space-y-2">
                  <p className="text-lg">תהא נשמתו צרורה בצרור החיים</p>
                  <p className="text-lg">May their soul be bound in the bond of eternal life</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          <Button onClick={() => { onPrint(); onOpenChange(false); }}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
