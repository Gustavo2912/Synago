import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RoleSelector } from "@/components/RoleSelector";

export function UserInviteDialog() {
  const { organizationId } = useUser();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);

  const sendInvite = async () => {
    if (!email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!organizationId) {
      toast.error("No organization found");
      return;
    }

    setLoading(true);

    // מניחים שיש פונקציית Edge בשם invite-user (מלובבל/סופבייס)
    const { error } = await supabase.functions.invoke("invite-user", {
      body: { email, role, organization_id: organizationId },
    });

    setLoading(false);

    if (error) {
      console.error(error);
      toast.error("Failed to send invite");
    } else {
      toast.success("Invite sent!");
      setEmail("");
      setRole("member");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Invite User</Button>
      </DialogTrigger>

      <DialogContent className="space-y-4 p-6">
        <h2 className="text-xl font-bold">Invite a New User</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Role</label>
          <RoleSelector value={role} onChange={setRole} />
        </div>

        <Button onClick={sendInvite} disabled={loading} className="w-full">
          {loading ? "Sending..." : "Send Invite"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
