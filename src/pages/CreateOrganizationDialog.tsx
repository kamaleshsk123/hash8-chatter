import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import { createOrganization } from "@/services/firebase";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess?: (orgUID: string) => void;
}

export const CreateOrganizationDialog: React.FC<
  CreateOrganizationDialogProps
> = ({ open, onOpenChange, user, onSuccess }) => {
  const [orgStep, setOrgStep] = useState(1); // 1: form, 2: success
  const [orgName, setOrgName] = useState("");
  const [adminEmails, setAdminEmails] = useState<string[]>([""]);
  const [orgUID, setOrgUID] = useState("");
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState("");
  const [copied, setCopied] = useState(false);
  const adminEmail = user?.email || "";

  const handleAddAdminEmail = () => setAdminEmails((prev) => [...prev, ""]);
  const handleAdminEmailChange = (i: number, val: string) => {
    setAdminEmails((prev) => prev.map((e, idx) => (idx === i ? val : e)));
  };
  const handleRemoveAdminEmail = (i: number) => {
    setAdminEmails((prev) => prev.filter((_, idx) => idx !== i));
  };
  const handleOrgNext = async () => {
    setOrgLoading(true);
    setOrgError("");
    try {
      const uid = await createOrganization(orgName, {
        uid: user.uid,
        email: user.email,
      });
      setOrgUID(uid);
      setOrgStep(2);
      if (onSuccess) onSuccess(uid);
    } catch (err: any) {
      setOrgError(err.message || "Failed to create organization.");
    } finally {
      setOrgLoading(false);
    }
  };
  const handleCopyUID = () => {
    navigator.clipboard.writeText(orgUID);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const handleDialogClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setOrgStep(1);
      setOrgName("");
      setAdminEmails([""]);
      setOrgUID("");
      setCopied(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {orgStep === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Enter your organization name. You will be the admin. Optionally,
                add more admin emails.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleOrgNext();
              }}
              className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Organization Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 bg-background"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  className="w-full border rounded px-3 py-2 bg-muted text-muted-foreground"
                  value={adminEmail}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Add Admin(s) (optional)
                </label>
                {adminEmails.map((email, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="admin@email.com"
                      value={email}
                      onChange={(e) =>
                        handleAdminEmailChange(i, e.target.value)
                      }
                    />
                    {adminEmails.length > 1 && (
                      <button
                        type="button"
                        className="text-destructive"
                        onClick={() => handleRemoveAdminEmail(i)}>
                        &times;
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="text-primary underline text-sm mt-1"
                  onClick={handleAddAdminEmail}>
                  + Add another admin
                </button>
              </div>
              {orgError && (
                <div className="text-destructive text-xs mb-2">{orgError}</div>
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDialogClose}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={!orgName.trim() || orgLoading}>
                  {orgLoading ? "Creating..." : "Next"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Organization Created!</DialogTitle>
              <DialogDescription>
                Share this code or QR to invite users to join your organization.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-center">
                <div className="font-semibold text-sm mb-1">
                  Organization UID
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <span className="font-mono text-lg bg-muted px-3 py-1 rounded select-all">
                    {orgUID}
                  </span>
                  <button
                    className="text-xs text-primary underline"
                    onClick={handleCopyUID}
                    type="button">
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="border rounded bg-white p-2">
                <QRCode value={orgUID} size={128} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleDialogClose}>
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
