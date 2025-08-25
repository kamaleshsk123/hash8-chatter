import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QrScanner from 'react-qr-scanner';
import { joinOrganization } from "@/services/firebase";
import { useToast } from "@/hooks/use-toast";

interface JoinOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess?: (orgName: string) => void;
}

export const JoinOrganizationDialog: React.FC<JoinOrganizationDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [joinStep, setJoinStep] = useState(1); // 1: form, 2: success
  const [joinUID, setJoinUID] = useState("");
  const [joinOrgName, setJoinOrgName] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const isMobileView =
    typeof window !== "undefined" ? window.innerWidth < 640 : false;

  // Validate UID by checking Firestore
  const [isValidUID, setIsValidUID] = useState(false);
  useEffect(() => {
    if (!joinUID) {
      setIsValidUID(false);
      setJoinError("");
      return;
    }
    let active = true;
    (async () => {
      try {
        setJoinError("");
        const org = await joinOrganization(joinUID, {
          uid: user.uid,
          email: user.email,
        });
        if (active) {
          setJoinOrgName(org.name);
          setIsValidUID(true);
        }
      } catch (err: any) {
        if (active) {
          if (err.message && err.message.includes("already a member")) {
            toast({
              title: "Already a member",
              description:
                "You are already an active member of this Organization.",
              variant: "default",
            });
          }
          setIsValidUID(false);
          setJoinOrgName("");
          setJoinError("Invalid or unknown organization UID.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [joinUID, user.uid, user.email]);

  const handleJoin = async () => {
    setJoinLoading(true);
    setJoinError("");
    try {
      // joinOrganization already called in effect, just show success
      setJoinStep(2);
      if (onSuccess) onSuccess(joinOrgName);
    } catch (err: any) {
      setJoinError(err.message || "Failed to join organization.");
    } finally {
      setJoinLoading(false);
    }
  };
  const handleJoinDialogClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setJoinStep(1);
      setJoinUID("");
      setJoinOrgName("");
      setScanning(false);
      setScanError("");
    }, 300);
  };

  // Camera support check for QR scan
  const canScan =
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {joinStep === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Join Organization</DialogTitle>
              <DialogDescription>
                Enter the Organization UID to join. On mobile, you can scan a QR
                code.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleJoin();
              }}
              className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Organization UID <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 bg-background"
                  value={joinUID}
                  onChange={(e) => setJoinUID(e.target.value)}
                  required
                />
              </div>
              {joinError && (
                <div className="text-destructive text-xs mb-2">{joinError}</div>
              )}
              {isMobileView && (
                <div>
                  {canScan ? (
                    <>
                      <button
                        type="button"
                        className="text-primary underline text-sm mt-3 mb-2"
                        onClick={() => setScanning(true)}>
                        {scanning ? "Scanning..." : "Scan QR Code"}
                      </button>
                      {scanning && (
                        <div className="mt-3 border rounded bg-muted p-2 flex flex-col gap-3 items-center">
                          <div style={{ width: "100%" }}>
                            <QrScanner
                              delay={300} // Add a delay for scanning
                              constraints={{ video: { facingMode: "environment" } }} // Corrected constraints for react-qr-scanner
                              onScan={(result: any) => { // Use onScan
                                if (result) {
                                  setJoinUID(result.text); // Access text property
                                  setScanning(false);
                                  setScanError("");
                                }
                              }}
                              onError={(error: any) => { // Use onError
                                if (error && error.name !== "NotFoundException") {
                                  setScanError("Scan error: " + error.message);
                                }
                              }}
                              style={{ width: "100%" }} // Add style prop
                            />
                          </div>
                          {scanError && (
                            <div className="text-destructive text-xs mt-1">
                              {scanError}
                            </div>
                          )}
                          <button
                            type="button"
                            className="text-xs text-muted-foreground mt-2"
                            onClick={() => setScanning(false)}>
                            Cancel Scan
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-destructive text-xs mt-2">
                      Camera access is not available in this browser. Please use
                      Chrome or Safari on HTTPS or localhost.
                    </div>
                  )}
                </div>
              )}
              <DialogFooter className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleJoinDialogClose}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={!isValidUID || joinLoading}
                  className="w-full">
                  {joinLoading ? "Joining..." : "Join"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Joined Organization</DialogTitle>
              <DialogDescription>
                You joined <span className="font-semibold">{joinOrgName}</span>{" "}
                organization.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-success font-semibold">
                You have successfully joined!
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleJoinDialogClose}>
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
