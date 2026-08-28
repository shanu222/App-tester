"use client";

import { useEffect, useRef, useState } from "react";
import { initializePaddle, CheckoutEventNames, type Paddle } from "@paddle/paddle-js";

export function PaddleOverlayCheckout({
  transactionId,
  customerEmail,
  successUrl,
  onCompleted,
  onError,
}: {
  transactionId: string;
  customerEmail?: string;
  successUrl: string;
  onCompleted?: (transactionId: string) => void;
  onError?: (message: string) => void;
}) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const opened = useRef("");
  const onCompletedRef = useRef(onCompleted);
  const onErrorRef = useRef(onError);
  onCompletedRef.current = onCompleted;
  onErrorRef.current = onError;

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const env = process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox";
    if (!token) {
      onErrorRef.current?.("Paddle checkout is not configured.");
      return;
    }
    if (env !== "sandbox") {
      onErrorRef.current?.("Paddle Live is not enabled.");
      return;
    }
    let cancelled = false;
    void initializePaddle({
      token,
      environment: "sandbox",
      eventCallback: (event) => {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED && event.data?.transaction_id) {
          onCompletedRef.current?.(event.data.transaction_id);
        }
        if (event.name === CheckoutEventNames.CHECKOUT_ERROR) {
          onErrorRef.current?.(
            "Paddle checkout could not be opened. Check that this domain is allowed in the sandbox dashboard.",
          );
        }
      },
    }).then((instance) => {
      if (!cancelled && instance) setPaddle(instance);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!paddle || !transactionId || opened.current === transactionId) return;
    opened.current = transactionId;
    paddle.Checkout.open({
      transactionId,
      ...(customerEmail ? { customer: { email: customerEmail } } : {}),
      settings: {
        variant: "one-page",
        successUrl,
      },
    });
  }, [paddle, transactionId, customerEmail, successUrl]);

  return null;
}
