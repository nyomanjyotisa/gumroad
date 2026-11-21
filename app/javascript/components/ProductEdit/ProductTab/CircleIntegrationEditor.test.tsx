// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, it, vi } from "vitest";

import { fetchCommunities, fetchSpaceGroups } from "$app/data/circle_integration";

import {
  CircleIntegrationEditor,
  type CircleIntegration,
} from "$app/components/ProductEdit/ProductTab/CircleIntegrationEditor";

vi.mock("$app/data/circle_integration", () => ({ fetchCommunities: vi.fn(), fetchSpaceGroups: vi.fn() }));
vi.mock("$app/components/ProductEdit/state", () => ({
  useProductEditContext: () => ({ product: { variants: [], native_type: "membership" }, updateProduct: vi.fn() }),
}));
vi.mock("$app/components/server-components/Alert", () => ({ showAlert: vi.fn() }));

afterEach(cleanup);

it("preserves the saved membership access setting when opening the editor or changing space groups", async () => {
  vi.mocked(fetchCommunities).mockResolvedValue({ communities: [{ id: 1, name: "Community" }] });
  vi.mocked(fetchSpaceGroups).mockResolvedValue({
    spaceGroups: [
      { id: 2, name: "Original" },
      { id: 3, name: "New" },
    ],
  });
  const onChange = vi.fn();
  const integration: CircleIntegration = {
    name: "circle",
    api_key: "test-key",
    keep_inactive_members: true,
    integration_details: { community_id: "1", space_group_id: "2" },
  };
  render(<CircleIntegrationEditor integration={integration} onChange={onChange} />);

  const groups = await screen.findByRole("combobox", { name: "Select a space group" });
  expect(onChange).not.toHaveBeenCalled();

  fireEvent.change(groups, { target: { value: "3" } });
  expect(onChange).toHaveBeenCalledExactlyOnceWith({
    ...integration,
    integration_details: { community_id: "1", space_group_id: "3" },
  });
});
