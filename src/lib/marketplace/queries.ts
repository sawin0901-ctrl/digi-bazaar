import { queryOptions } from "@tanstack/react-query";
import {
  listCategories,
  listProducts,
  getProductBySlug,
  getSiteText,
} from "./catalog.functions";
import { listDigisellerCategories, listDigisellerProducts } from "@/lib/digiseller/products.functions";

export const categoriesQO = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
    staleTime: 60_000,
  });

export const productsQO = (params?: { category?: string; dealsOnly?: boolean }) =>
  queryOptions({
    queryKey: ["products", params ?? {}],
    queryFn: () => listProducts({ data: params ?? {} }),
    staleTime: 30_000,
  });

export const productQO = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
    staleTime: 30_000,
  });

export const siteTextQO = (slug: string) =>
  queryOptions({
    queryKey: ["site_text", slug],
    queryFn: () => getSiteText({ data: { slug } }),
    staleTime: 5 * 60_000,
  });

export const digisellerCategoriesQO = () =>
  queryOptions({
    queryKey: ["digiseller", "categories"],
    queryFn: () => listDigisellerCategories(),
    staleTime: 10 * 60_000,
  });

export const digisellerProductsQO = (params?: { category?: string; page?: number; rows?: number }) =>
  queryOptions({
    queryKey: ["digiseller", "products", params ?? {}],
    queryFn: () => listDigisellerProducts({ data: params ?? {} }),
    staleTime: 60_000,
  });