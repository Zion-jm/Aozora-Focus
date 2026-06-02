import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/context/ConfirmContext";
import { router } from "expo-router";

export function useVerificationGate() {
  const { user } = useAuth();
  const { showConfirm } = useConfirm();

  const requireVerified = (action: () => void) => {
    if (!user) return;
    if (user.verificationStatus !== "verified") {
      showConfirm({
        title: "Verification Required",
        message:
          "Your identity hasn't been verified yet. Verify your ID to unlock bookings, messages, reports, and support tickets.",
        confirmLabel: "Verify My ID",
        cancelLabel: "Not Now",
        icon: "shield",
        onConfirm: () => router.push("/profile/verify"),
      });
      return;
    }
    action();
  };

  const isVerified = user?.verificationStatus === "verified";

  return { requireVerified, isVerified };
}
