import { ExternalLink } from "lucide-react";
import { COMPANY_NAME, COMPANY_URL, SITE_NAME } from "@/lib/site";
import { CompanyLogo } from "@/components/brand/company-logo";
import { cn } from "@/lib/utils";

export function CompanyAttribution({
  className,
  showLink = true,
  compact = false,
}: {
  className?: string;
  showLink?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <CompanyLogo size="sm" />
      <div className="min-w-0">
        <p className={cn("font-medium text-slate-800", compact ? "text-xs" : "text-sm")}>
          {SITE_NAME}
        </p>
        <p className={cn("text-muted", compact ? "text-[11px] leading-4" : "text-xs leading-5")}>
          A product of {COMPANY_NAME}
        </p>
        {showLink ? (
          <a
            href={COMPANY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
          >
            Visit {COMPANY_NAME}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function CompanyAboutBlurb({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-card border border-line bg-white p-5 shadow-card", className)}>
      <div className="flex items-start gap-3">
        <CompanyLogo size="md" />
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900">About {COMPANY_NAME}</h2>
          <p className="mt-2 text-sm leading-6 text-body">
            Resilience Technologies Labs develops technology solutions focused on AI, climate intelligence,
            infrastructure resilience, sustainability, education and digital transformation.
          </p>
          <p className="mt-2 text-sm leading-6 text-body">
            {SITE_NAME} is one of its technology products.
          </p>
          <a
            href={COMPANY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            Visit {COMPANY_NAME}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
