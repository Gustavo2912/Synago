import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useYahrzeits } from "@/hooks/useYahrzeits";
import { useDonors } from "@/hooks/useDonors";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { HDate, months } from "@hebcal/core";

interface YahrzeitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  yahrzeit?: any;
}

export const YahrzeitDialog = ({ open, onOpenChange, yahrzeit }: YahrzeitDialogProps) => {
  const { createYahrzeit, updateYahrzeit } = useYahrzeits();
  const { data: donorsData } = useDonors({});
  const donors = donorsData?.rows || [];
  const [donorId, setDonorId] = useState("");
  const [deceasedName, setDeceasedName] = useState("");
  const [hebrewDate, setHebrewDate] = useState("");
  const [secularDate, setSecularDate] = useState<Date>();
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [shacharitTime, setShacharitTime] = useState("");
  const [minchaTime, setMinchaTime] = useState("");
  const [maarivTime, setMaarivTime] = useState("");
  const [includeServiceTimes, setIncludeServiceTimes] = useState(false);
  const [includeDonationRequest, setIncludeDonationRequest] = useState(false);
  const [donationText, setDonationText] = useState("The family invites you to honor the memory of the departed by making a memorial donation.");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    if (yahrzeit) {
      setDonorId(yahrzeit.donor_id);
      setDeceasedName(yahrzeit.deceased_name);
      setHebrewDate(yahrzeit.hebrew_date);
      setSecularDate(new Date(yahrzeit.secular_date));
      setRelationship(yahrzeit.relationship || "");
      setNotes(yahrzeit.notes || "");
      setShacharitTime(yahrzeit.shacharit_time || "");
      setMinchaTime(yahrzeit.mincha_time || "");
      setMaarivTime(yahrzeit.maariv_time || "");
      setIncludeServiceTimes(yahrzeit.include_service_times || false);
      setIncludeDonationRequest(yahrzeit.include_donation_request || false);
      setDonationText(yahrzeit.donation_text || "The family invites you to honor the memory of the departed by making a memorial donation.");
      setContactEmail(yahrzeit.contact_email || "");
      setContactPhone(yahrzeit.contact_phone || "");
    } else {
      resetForm();
    }
  }, [yahrzeit, open]);

  // Auto-calculate Hebrew date when secular date changes
  useEffect(() => {
    if (secularDate && !yahrzeit) {
      try {
        const hd = new HDate(secularDate);
        const hebrewDay = hd.getDate();
        const hebrewMonth = hd.getMonthName();
        const hebrewYear = hd.getFullYear();
        setHebrewDate(`${hebrewDay} ${hebrewMonth} ${hebrewYear}`);
      } catch (error) {
        console.error("Error converting to Hebrew date:", error);
      }
    }
  }, [secularDate, yahrzeit]);

  const resetForm = () => {
    setDonorId("");
    setDeceasedName("");
    setHebrewDate("");
    setSecularDate(undefined);
    setRelationship("");
    setNotes("");
    setSearchTerm("");
    setShacharitTime("");
    setMinchaTime("");
    setMaarivTime("");
    setIncludeServiceTimes(false);
    setIncludeDonationRequest(false);
    setDonationText("The family invites you to honor the memory of the departed by making a memorial donation.");
    setContactEmail("");
    setContactPhone("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!donorId) {
      toast.error("Please select a donor");
      return;
    }
    if (!deceasedName) {
      toast.error("Please enter the deceased name");
      return;
    }
    if (!hebrewDate) {
      toast.error("Please enter the Hebrew date");
      return;
    }
    if (!secularDate) {
      toast.error("Please select a secular date");
      return;
    }

    const data = {
      donor_id: donorId,
      deceased_name: deceasedName,
      hebrew_date: hebrewDate,
      secular_date: format(secularDate, "yyyy-MM-dd"),
      relationship: relationship || undefined,
      notes: notes || undefined,
      reminder_enabled: true,
      shacharit_time: shacharitTime || undefined,
      mincha_time: minchaTime || undefined,
      maariv_time: maarivTime || undefined,
      include_service_times: includeServiceTimes,
      include_donation_request: includeDonationRequest,
      donation_text: donationText || undefined,
      contact_email: contactEmail || undefined,
      contact_phone: contactPhone || undefined,
    };

    if (yahrzeit) {
      await updateYahrzeit.mutateAsync({ id: yahrzeit.id, ...data });
    } else {
      await createYahrzeit.mutateAsync(data as any);
    }

    onOpenChange(false);
    resetForm();
  };

  const filteredDonors = donors?.filter((donor) =>
    donor.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.phone?.includes(searchTerm)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{yahrzeit ? "Edit Yahrzeit" : "Add Yahrzeit"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="donor">Donor *</Label>
            <div className="relative">
              <Input
                placeholder="Type donor name or phone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setDonorId("");
                }}
                onFocus={() => setSearchTerm(searchTerm || " ")}
                className="pr-10"
              />
              
              {searchTerm && filteredDonors && filteredDonors.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[200px] overflow-auto">
                  {filteredDonors.map((donor) => (
                    <button
                      key={donor.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors"
                      onClick={() => {
                        setDonorId(donor.id);
                        setSearchTerm(donor.displayName || "");
                      }}
                    >
                      <div className="font-medium">{donor.displayName}</div>
                      {donor.phone && (
                        <div className="text-sm text-muted-foreground">{donor.phone}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              {searchTerm && filteredDonors?.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground">
                  No donors found
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="deceasedName">Deceased Name *</Label>
            <Input
              id="deceasedName"
              value={deceasedName}
              onChange={(e) => setDeceasedName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="hebrewDate">Hebrew Date *</Label>
            <Input
              id="hebrewDate"
              placeholder="e.g., 15 Tishrei 5784"
              value={hebrewDate}
              onChange={(e) => setHebrewDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Auto-calculated when you select the secular date
            </p>
          </div>

          <div>
            <Label>Secular Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !secularDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {secularDate ? format(secularDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={secularDate}
                  onSelect={setSecularDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="relationship">Relationship</Label>
            <Input
              id="relationship"
              placeholder="e.g., Father, Mother, Spouse"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-sm">Contact Information for Reminders</h3>
            <p className="text-xs text-muted-foreground">
              Optional: Provide direct contact to send yahrzeit reminders to family member
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactEmail">Email Address</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="family@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Phone Number</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="+1 555-1234"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="includeServiceTimes">Include Service Times on Notice</Label>
                <p className="text-xs text-muted-foreground">
                  Show when Kaddish will be recited
                </p>
              </div>
              <Switch
                id="includeServiceTimes"
                checked={includeServiceTimes}
                onCheckedChange={setIncludeServiceTimes}
              />
            </div>

            {includeServiceTimes && (
              <div className="grid grid-cols-3 gap-2 ml-4">
                <div>
                  <Label htmlFor="shacharit" className="text-xs">Shacharit</Label>
                  <Input
                    id="shacharit"
                    placeholder="7:00 AM"
                    value={shacharitTime}
                    onChange={(e) => setShacharitTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="mincha" className="text-xs">Mincha</Label>
                  <Input
                    id="mincha"
                    placeholder="6:00 PM"
                    value={minchaTime}
                    onChange={(e) => setMinchaTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maariv" className="text-xs">Maariv</Label>
                  <Input
                    id="maariv"
                    placeholder="8:00 PM"
                    value={maarivTime}
                    onChange={(e) => setMaarivTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="includeDonation">Include Memorial Donation Request</Label>
                <p className="text-xs text-muted-foreground">
                  Invite family to make a donation in honor
                </p>
              </div>
              <Switch
                id="includeDonation"
                checked={includeDonationRequest}
                onCheckedChange={setIncludeDonationRequest}
              />
            </div>

            {includeDonationRequest && (
              <div className="ml-4">
                <Label htmlFor="donationText" className="text-xs">Donation Message</Label>
                <Textarea
                  id="donationText"
                  value={donationText}
                  onChange={(e) => setDonationText(e.target.value)}
                  rows={2}
                  placeholder="Custom donation message..."
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createYahrzeit.isPending || updateYahrzeit.isPending}>
              {yahrzeit ? "Update" : "Add"} Yahrzeit
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
