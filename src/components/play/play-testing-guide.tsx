import { Card, CardHeader } from "@/components/ui/card";

const MODES = [
  {
    title: "Internal testing",
    bestFor: "Small development and QA teams.",
    points: [
      "Limited tester capacity",
      "Fast development testing",
      "Suitable for early QA",
    ],
  },
  {
    title: "Closed testing",
    bestFor: "Private or restricted beta testing.",
    points: [
      "Tester eligibility is controlled by Google Play",
      "Multiple closed tracks may exist",
      "Individual tester email lists are not writable through the Play Developer API",
    ],
  },
  {
    title: "Open testing",
    bestFor: "Public or wider beta testing.",
    points: [
      "Users can join the test through Google Play",
      "No individual closed-test email-list management is required",
      "Best fit for TestLoop’s automated tester onboarding",
    ],
  },
] as const;

export function PlayTestingGuide() {
  return (
    <div>
      <h2 className="text-[15px] font-semibold text-slate-900">Testing modes</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        TestLoop inspects your Play Console configuration and recommends a workflow. It does not
        change your tracks unless you ask it to, and it never publishes to production from testing
        actions.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {MODES.map((mode) => (
          <Card key={mode.title} className="shadow-none">
            <CardHeader title={mode.title} />
            <p className="mt-3 text-sm leading-6 text-body">
              <span className="font-medium text-slate-900">Best for: </span>
              {mode.bestFor}
            </p>
            <ul className="mt-3 space-y-1.5 text-sm leading-6 text-body">
              {mode.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
