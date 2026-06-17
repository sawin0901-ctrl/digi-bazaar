import { createServerFn } from "@tanstack/react-start";
import type { ProductDTO, CategoryDTO } from "@/lib/marketplace/catalog.functions";

const AGENT_ID = "1459731";

type SellerGoodsRow = {
  id_goods: number;
  name: string;
  price: number;
  price_rur?: number;
  price_usd?: number;
  base_price?: number;
  base_currency?: string;
  cnt_sell?: number;
  cnt_return?: number;
  cnt_comment?: number;
  has_discount?: boolean;
  url_image?: string | null;
  image?: string | null;
};
type SellerGoodsResp = {
  retval: number;
  desc?: string;
  total_pages?: number;
  cnt_goods?: number;
  rows?: SellerGoodsRow[];
  product?: SellerGoodsRow[];
};

type DigiCategoryNode = {
  id: number;
  name: string;
  cnt?: number;
  sub?: DigiCategoryNode[];
};
type CategoriesResp = { retval: number; desc?: string; category?: DigiCategoryNode[] };

function productImage(row: SellerGoodsRow): string {
  if (row.url_image) return row.url_image;
  if (row.image) return row.image;
  return `https://graph.digiseller.ru/img.ashx?id_d=${row.id_goods}&w=400&h=300&crop=true`;
}

function productUrl(id: number): string {
  return `https://plati.market/itm/${id}?ai=${AGENT_ID}`;
}

function mapRow(row: SellerGoodsRow, categorySlug: string): ProductDTO {
  const price = Math.round(Number(row.price_rur ?? row.price ?? 0));
  return {
    slug: `digi-${row.id_goods}`,
    title: row.name,
    category_slug: categorySlug,
    seller: "plati.market",
    seller_rating: 5,
    price,
    old_price: null,
    rating: 5,
    reviews: row.cnt_comment ?? 0,
    sales: row.cnt_sell ?? 0,
    image: productImage(row),
    badge: row.has_discount ? "-%" : null,
    description: "",
    details_url: productUrl(row.id_goods),
    buy_url: productUrl(row.id_goods),
    digiseller_id: String(row.id_goods),
    variant_label: null,
    external_url: productUrl(row.id_goods),
  };
}

function flattenCategories(nodes: DigiCategoryNode[] | undefined, out: CategoryDTO[] = [], depth = 0): CategoryDTO[] {
  if (!nodes) return out;
  for (const n of nodes) {
    out.push({
      slug: `cat-${n.id}`,
      name: depth > 0 ? `— ${n.name}` : n.name,
      description: null,
      image: null,
      sort_order: out.length,
    });
    if (n.sub && n.sub.length) flattenCategories(n.sub, out, depth + 1);
  }
  return out;
}

export const listDigisellerCategories = createServerFn({ method: "GET" }).handler(async (): Promise<CategoryDTO[]> => {
  const { digisellerPost, getSellerId } = await import("./api.server");
  const id_seller = Number(getSellerId());
  const json = await digisellerPost<CategoriesResp>("/api/categories", { id_seller, lang: "ru-RU" });
  if (json.retval !== 0) return [];
  return flattenCategories(json.category);
});

export const listDigisellerProducts = createServerFn({ method: "GET" })
  .inputValidator((d: { category?: string; page?: number; rows?: number } | undefined) => d ?? {})
  .handler(async ({ data }): Promise<ProductDTO[]> => {
    const { digisellerPost, getSellerId } = await import("./api.server");
    const id_seller = Number(getSellerId());
    let owner_id = 0;
    let categorySlug = "all";
    if (data.category && data.category.startsWith("cat-")) {
      owner_id = Number(data.category.slice(4)) || 0;
      categorySlug = data.category;
    }
    const body = {
      id_seller,
      owner_id,
      order_col: "name",
      order_dir: "asc",
      rows: data.rows ?? 60,
      page: data.page ?? 1,
      currency: "RUR",
      lang: "ru-RU",
      show_hidden: 0,
    };
    const json = await digisellerPost<SellerGoodsResp>("/api/seller-goods", body, true);
    if (json.retval !== 0) return [];
    const rows = json.rows ?? json.product ?? [];
    return rows.map((r) => mapRow(r, categorySlug));
  });

type ProductDataResp = {
  retval: number;
  product?: {
    id: number;
    name?: string;
    info?: string;
    add_info?: string;
    price?: { price: number; currency: string };
    prices_unit?: { price_rub?: number };
    image?: string;
    base_url?: string;
  };
};

export const getDigisellerProduct = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { digisellerGet } = await import("./api.server");
    const json = await digisellerGet<ProductDataResp>(`/api/products/${encodeURIComponent(data.id)}/data?currency=RUB&lang=ru-RU`);
    if (json.retval !== 0 || !json.product) return null;
    return json.product;
  });