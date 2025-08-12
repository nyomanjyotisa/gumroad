import * as React from "react";

import { Membership, Product } from "$app/data/products";

import { PaginationProps } from "$app/components/Pagination";
import { Tab } from "$app/components/ProductsLayout";
import { ProductsPageMembershipsTable } from "$app/components/ProductsPage/MembershipsTable";
import { ProductsPageProductsTable } from "$app/components/ProductsPage/ProductsTable";

const ProductsPage = ({
  memberships,
  membershipsPagination,
  products,
  productsPagination,
  query,
  setEnableArchiveTab,
  type = "products",
  onProductsChange,
  onMembershipsChange,
}: {
  memberships: Membership[];
  membershipsPagination: PaginationProps;
  products: Product[];
  productsPagination: PaginationProps;
  query: string | null;
  setEnableArchiveTab?: (enable: boolean) => void;
  type?: Tab;
  onProductsChange?: ((products: Product[]) => void) | undefined;
  onMembershipsChange?: ((memberships: Membership[]) => void) | undefined;
}) => (
  <div style={{ display: "grid", gap: "var(--spacer-7)" }}>
    {memberships.length > 0 ? (
      <ProductsPageMembershipsTable
        query={query}
        entries={memberships}
        pagination={membershipsPagination}
        selectedTab={type}
        setEnableArchiveTab={setEnableArchiveTab}
        onMembershipsChange={onMembershipsChange}
      />
    ) : null}

    {products.length > 0 ? (
      <ProductsPageProductsTable
        query={query}
        entries={products}
        pagination={productsPagination}
        selectedTab={type}
        setEnableArchiveTab={setEnableArchiveTab}
        onProductsChange={onProductsChange}
      />
    ) : null}
  </div>
);

export default ProductsPage;
