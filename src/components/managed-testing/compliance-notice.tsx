import { InfoPopover } from "@/components/ui/info-popover";
import { MANAGED_TESTING_COMPLIANCE } from "@/lib/managed-testing/catalog";

export function ManagedTestingNotice({ className }: { className?: string }) {
  return (
    <p className={className ?? "flex items-start gap-1 text-sm leading-6 text-muted"}>
      <span className="mt-0.5">
        <InfoPopover title="Managed Beta Testing" label="About managed testing">
          {MANAGED_TESTING_COMPLIANCE} TestLoop does not sell installs, fake users, or guaranteed Google Play
          approval.
        </InfoPopover>
      </span>
      <span>{MANAGED_TESTING_COMPLIANCE}</span>
    </p>
  );
}
