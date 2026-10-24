// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResponseError } from "$app/utils/request";

import { useReceiptPreview } from "$app/components/ProductEdit/ReceiptPreview";

const mocks = vi.hoisted(() => ({
  context: {
    uniquePermalink: "product",
    product: { custom_receipt_text: "Original", custom_view_content_button_text: "View" },
  },
  request: vi.fn(),
}));
vi.mock("$app/components/ProductEdit/state", () => ({ useProductEditContext: () => mocks.context }));
vi.mock("$app/utils/request", async (original) => ({
  ...(await original<typeof import("$app/utils/request")>()),
  request: mocks.request,
}));

const pending: { resolve: (value: Response) => void; reject: (error: Error) => void }[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  mocks.context = {
    uniquePermalink: "product",
    product: { custom_receipt_text: "Original", custom_view_content_button_text: "View" },
  };
  pending.length = 0;
  mocks.request
    .mockReset()
    .mockImplementation(() => new Promise<Response>((resolve, reject) => pending.push({ resolve, reject })));
  vi.stubGlobal("Routes", {
    internal_product_receipt_preview_path: (id: string, options: unknown) => `/${id}?${JSON.stringify(options)}`,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const respond = async (index: number, subject: string, html: string) => {
  await act(async () => {
    pending[index]?.resolve(new Response(JSON.stringify({ subject, html }), { status: 200 }));
  });
};
const changeMessage = (rerender: () => void, message: string) => {
  mocks.context.product = { ...mocks.context.product, custom_receipt_text: message };
  rerender();
};

describe("receipt preview request consistency", () => {
  it("loads a preview after StrictMode replays effect setup and cleanup", async () => {
    const { result } = renderHook(() => useReceiptPreview(), { wrapper: React.StrictMode });
    await act(async () => {
      vi.advanceTimersByTime(301);
    });
    await respond(pending.length - 1, "Subject", "<p>Current preview</p>");
    expect(result.current.html).toBe("<p>Current preview</p>");
    if (pending.length > 1) await respond(0, "Old", "<p>Stale preview</p>");
    expect(result.current.html).toBe("<p>Current preview</p>");
  });

  it("loads immediately and keeps the latest response when older requests finish last", async () => {
    const { result, rerender } = renderHook(() => useReceiptPreview());
    expect(mocks.request).toHaveBeenCalledTimes(1);
    changeMessage(rerender, "Newest");
    await act(async () => {
      vi.advanceTimersByTime(301);
    });
    await respond(1, "New subject", "<p>Newest</p>");
    await respond(0, "Old subject", "<p>Original</p>");
    expect(result.current).toEqual({ subject: "New subject", html: "<p>Newest</p>" });
  });

  it("invalidates an old response before the debounced replacement starts", async () => {
    const { result, rerender } = renderHook(() => useReceiptPreview());
    changeMessage(rerender, "Newest");
    await respond(0, "Old subject", "<p>Original</p>");
    expect(result.current).toEqual({ subject: null, html: "" });
    expect(mocks.request).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(301);
    });
    await respond(1, "New subject", "<p>Newest</p>");
    expect(result.current.html).toBe("<p>Newest</p>");
  });

  it("ignores a stale failure after a newer success", async () => {
    const { result, rerender } = renderHook(() => useReceiptPreview());
    changeMessage(rerender, "Newest");
    await act(async () => {
      vi.advanceTimersByTime(301);
    });
    await respond(1, "New subject", "<p>Newest</p>");
    await act(async () => {
      pending[0]?.reject(new ResponseError());
    });
    expect(result.current.html).toBe("<p>Newest</p>");
  });

  it("does not replace a current failure with an older successful preview", async () => {
    const { result, rerender } = renderHook(() => useReceiptPreview());
    changeMessage(rerender, "Newest");
    await act(async () => {
      vi.advanceTimersByTime(301);
      pending[1]?.reject(new ResponseError());
    });
    await respond(0, "Old subject", "<p>Original</p>");
    expect(result.current).toEqual({ subject: null, html: "Error loading receipt preview" });
  });

  it("invalidates requests when the product changes", async () => {
    const { result, rerender } = renderHook(() => useReceiptPreview());
    mocks.context.uniquePermalink = "other-product";
    rerender();
    await act(async () => {
      vi.advanceTimersByTime(301);
    });
    await respond(1, "Other product", "<p>Other receipt</p>");
    await respond(0, "Old product", "<p>Original</p>");
    expect(result.current.subject).toBe("Other product");
  });

  it("invalidates requests when the content button changes", async () => {
    const { result, rerender } = renderHook(() => useReceiptPreview());
    mocks.context.product.custom_view_content_button_text = "Download";
    rerender();
    await act(async () => {
      vi.advanceTimersByTime(301);
    });
    await respond(1, "Subject", "<p>Download</p>");
    await respond(0, "Subject", "<p>View</p>");
    expect(result.current.html).toBe("<p>Download</p>");
  });

  it("cancels queued requests on unmount", async () => {
    const { rerender, unmount } = renderHook(() => useReceiptPreview());
    changeMessage(rerender, "Newest");
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(301);
    });
    expect(mocks.request).toHaveBeenCalledTimes(1);
    await respond(0, "Old subject", "<p>Original</p>");
  });

  it("debounces rapid edits into a request with the final text", async () => {
    const { rerender } = renderHook(() => useReceiptPreview());
    changeMessage(rerender, "Intermediate");
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    changeMessage(rerender, "Final");
    await act(async () => {
      vi.advanceTimersByTime(301);
    });
    expect(mocks.request).toHaveBeenCalledTimes(2);
    expect(mocks.request.mock.lastCall?.[0].url).toContain("Final");
  });
});
