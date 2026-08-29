"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/widgets";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

const CONFIRM_TITLE = "Remove this audit log entry from TestLoop?";
const CONFIRM_BODY = "The selected audit log entry will be removed from TestLoop.";
const CONFIRM_ALL_TITLE = "Remove all audit log entries from TestLoop?";
const CONFIRM_ALL_BODY =
  "This only removes the audit log entries from TestLoop. It does not affect any apps, testing requests, Google Play Console data, or other account data.";

export type AuditLogRow = {
  id: string;
  createdAt: string;
  action: string;
  campaignName: string | null;
  result: string | null;
};

export function AuditLogTable({ logs }: { logs: AuditLogRow[] }) {
  const [rows, setRows] = useState(logs);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(logs);
  }, [logs]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        setConfirmId(null);
        setConfirmAll(false);
        setError(null);
      }
    }
    if (confirmId || confirmAll) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmId, confirmAll, pending]);

  async function confirm() {
    if (!confirmId) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/activity/${confirmId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "This audit log entry could not be removed. Try again.");
        return;
      }
      const removedId = confirmId;
      setConfirmId(null);
      setRows((current) => current.filter((row) => row.id !== removedId));
    } catch {
      setError("This audit log entry could not be removed. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function confirmRemoveAll() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/activity", { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Audit log entries could not be removed. Try again.");
        return;
      }
      setConfirmAll(false);
      setRows([]);
    } catch {
      setError("Audit log entries could not be removed. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (rows.length === 0) {
    return <EmptyState title="No activity yet" body="Campaign and testing actions you take are recorded here." />;
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => {
            setError(null);
            setConfirmId(null);
            setConfirmAll(true);
          }}
        >
          Remove All
        </Button>
      </div>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Timestamp</Th>
              <Th>Action</Th>
              <Th>Campaign</Th>
              <Th>Result</Th>
              <Th>
                <span className="sr-only">Remove</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((log) => (
              <Tr key={log.id}>
                <Td className="whitespace-nowrap text-muted">{formatDateTime(log.createdAt)}</Td>
                <Td className="font-medium text-slate-900">{log.action}</Td>
                <Td>{log.campaignName || "—"}</Td>
                <Td className="text-muted">{log.result || "—"}</Td>
                <Td className="text-right">
                  <button
                    type="button"
                    className="text-sm font-medium text-red-700 hover:text-red-800"
                    onClick={() => {
                      setError(null);
                      setConfirmId(log.id);
                    }}
                  >
                    Remove
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      {confirmId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => {
            if (!pending) {
              setConfirmId(null);
              setError(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-audit-log-title"
            aria-describedby="remove-audit-log-body"
            className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="remove-audit-log-title" className="text-lg font-semibold text-slate-900">
              {CONFIRM_TITLE}
            </h2>
            <p id="remove-audit-log-body" className="mt-3 text-sm leading-6 text-slate-700">
              {CONFIRM_BODY}
            </p>
            {error ? (
              <p className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  setConfirmId(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                className="border-red-700 bg-red-600 text-white hover:bg-red-700"
                onClick={() => void confirm()}
              >
                {pending ? "Removing…" : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {confirmAll ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => {
            if (!pending) {
              setConfirmAll(false);
              setError(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-all-audit-log-title"
            aria-describedby="remove-all-audit-log-body"
            className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="remove-all-audit-log-title" className="text-lg font-semibold text-slate-900">
              {CONFIRM_ALL_TITLE}
            </h2>
            <p id="remove-all-audit-log-body" className="mt-3 text-sm leading-6 text-slate-700">
              {CONFIRM_ALL_BODY}
            </p>
            {error ? (
              <p className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  setConfirmAll(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                className="border-red-700 bg-red-600 text-white hover:bg-red-700"
                onClick={() => void confirmRemoveAll()}
              >
                {pending ? "Removing…" : "Remove All"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
