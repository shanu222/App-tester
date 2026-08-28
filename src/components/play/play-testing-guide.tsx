import { InfoPopover } from "@/components/ui/info-popover";

export function PlayTestingGuide() {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-[15px] font-semibold text-slate-900">What TestLoop can manage</h2>
      <InfoPopover title="What TestLoop can manage" variant="help">
        TestLoop discovers apps and tracks from Google Play, publishes TestLoop testing requests, and
        records tester participation. It does not upload bundles, create Play apps, or change your
        testing tracks.
      </InfoPopover>
    </div>
  );
}
