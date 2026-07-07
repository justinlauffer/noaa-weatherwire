"use client";

import { useEffect, useRef } from "react";

import { getApiBaseUrl } from "@/lib/api";

export type StreamMessageEvent = {
  weather_message_id: string;
  issued_at: string;
  summary: string;
  is_alert: boolean;
  product_class: string;
  issuing_office: string;
  awips_id: string;
};

type UseMessageStreamOptions = {
  enabled?: boolean;
  onMessage?: (event: StreamMessageEvent) => void;
};

export function useMessageStream({ enabled = true, onMessage }: UseMessageStreamOptions = {}) {
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const source = new EventSource(`${getApiBaseUrl()}/api/v1/stream/messages`);

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as StreamMessageEvent;
        callbackRef.current?.(payload);
      } catch {
        // Ignore malformed events.
      }
    };

    return () => {
      source.close();
    };
  }, [enabled]);
}
