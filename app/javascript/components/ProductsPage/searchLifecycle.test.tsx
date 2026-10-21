// @vitest-environment happy-dom
import { router } from "@inertiajs/react";
import { act, cleanup, renderHook } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEmailSearch } from "$app/components/EmailsPage/useEmailSearch";
import { useProductsSearch } from "$app/components/ProductsPage/useProductsSearch";

vi.mock("@inertiajs/react", () => ({ router: { reload: vi.fn() } }));

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState({}, "", "/");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe.each([
  {
    name: "products",
    useSearch: useProductsSearch,
    delay: 300,
    data: { products_page: undefined, memberships_page: undefined },
    only: ["products_data", "memberships_data", "has_products"],
    reset: ["products_data", "memberships_data"],
  },
  {
    name: "emails",
    useSearch: useEmailSearch,
    delay: 500,
    data: { page: undefined },
    only: ["installments", "pagination", "has_posts"],
    reset: ["installments"],
  },
])("$name search lifecycle", ({ useSearch, delay, data, only, reset }) => {
  it("cancels an abandoned search when its page unmounts", () => {
    const { result, unmount } = renderHook(useSearch);
    act(() => result.current.setQuery("abandoned search"));
    unmount();
    window.history.replaceState({}, "", "/settings");
    act(() => vi.advanceTimersByTime(delay + 1));
    expect(router.reload).not.toHaveBeenCalled();
  });

  it("keeps the existing debounce and reloads only the latest query while mounted", () => {
    const { result } = renderHook(useSearch);
    act(() => result.current.setQuery("first"));
    act(() => vi.advanceTimersByTime(delay - 1));
    act(() => result.current.setQuery("latest"));
    act(() => vi.advanceTimersByTime(delay - 1));
    expect(router.reload).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(router.reload).toHaveBeenCalledExactlyOnceWith({ data: { ...data, query: "latest" }, only, reset });
  });

  it("initializes from the URL without reloading and clears the query and pagination normally", () => {
    window.history.replaceState({}, "", "/?query=initial");
    const { result } = renderHook(useSearch);
    expect(result.current.query).toBe("initial");
    act(() => vi.advanceTimersByTime(delay));
    expect(router.reload).not.toHaveBeenCalled();
    act(() => result.current.setQuery(""));
    act(() => vi.advanceTimersByTime(delay));
    expect(router.reload).toHaveBeenCalledExactlyOnceWith({ data: { ...data, query: undefined }, only, reset });
  });

  it("still searches after Strict Mode replays cleanup", () => {
    const { result } = renderHook(useSearch, {
      wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode>,
    });
    act(() => result.current.setQuery("current"));
    act(() => vi.advanceTimersByTime(delay));
    expect(router.reload).toHaveBeenCalledExactlyOnceWith({ data: { ...data, query: "current" }, only, reset });
  });
});
