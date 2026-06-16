import { queryOptions } from "@tanstack/react-query";
import {
  listCategories,
  listProducts,
  getProductBySlug,
  getSiteText,
} from "./catalog.functions";

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