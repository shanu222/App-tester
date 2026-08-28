import { Card, CardHeader } from "@/components/ui/card";

const MODES = [
  {
    title: "Internal testing",
    bestFor: "Small internal QA teams.",
    points: [
      "Google Play supports up to 100 internal testers per app.",
      "Testers generally access the test through the testing link.",
      "Can coexist with other testing tracks.",
      "Tester eligibility is controlled by Google Play.",
    ],
  },
  {
    title: "Closed testing",
    bestFor: "Controlled tester access.",
    points: [
      "Eligibility is managed in Play Console.",
      "Email lists and Google Groups are Play Console features.",
      "The Play Developer API cannot add individual emails to those lists.",
      "Other developers provide Gmail when they accept this TestLoop request. TestLoop then enrolls that address through the owner’s Play connection when the API supports it.",
    ],
  },
  {
    title: "Open testing",
    bestFor: "Public or wider beta testing.",
    points: [
      "Users join the test through Google Play.",
      "TestLoop records the tester Gmail for TestLoop records.",
      "TestLoop provides the Google Play testing link.",
      "Registration in TestLoop is not Google Play approval.",
    ],
  },
] as const;

export function PlayTestingGuide() {
  return (
    <div>
      <h2 className="text-[15px] font-semibold text-slate-900">Testing modes</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        TestLoop inspects your Play Console configuration and recommends a workflow. It does not
        change tracks, upload bundles, or publish to production.
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
