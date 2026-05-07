const { z } = require("zod");

const serviceSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  short_description: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  price_start: z.number().optional().nullable(),
  price_text: z.string().max(255).optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  is_featured: z.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sort_order: z.number().int().optional(),
});

const pageSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  page_type: z
    .enum(["home", "about", "service", "promotion", "article", "contact", "custom"])
    .optional(),
  content: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).optional(),
  sort_order: z.number().int().optional(),
  published_at: z.string().optional().nullable(),
});

const leadSchema = z.object({
  service_id: z.number().int().optional().nullable(),
  branch_id: z.number().int().optional().nullable(),
  name: z.string().min(1).max(255),
  phone: z.string().min(8).max(50),
  email: z.string().email().optional().nullable(),
  line_id: z.string().max(100).optional().nullable(),
  interested_service: z.string().max(255).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
  source: z.enum(["website", "line", "facebook", "tiktok", "google", "other"]).optional(),
});

const articleSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  excerpt: z.string().max(1000).optional().nullable(),
  content: z.string().optional().nullable(),
  cover_image_url: z.string().optional().nullable(),
  author_name: z.string().max(255).optional().nullable(),
  status: z.enum(["draft", "published"]).optional(),
  published_at: z.string().optional().nullable(),
});

const reviewSchema = z.object({
  customer_name: z.string().min(1).max(255),
  rating: z.number().int().min(1).max(5).optional(),
  review_text: z.string().max(5000).optional().nullable(),
  image_url: z.string().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  sort_order: z.number().int().optional(),
});

const faqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000),
  category: z.string().max(100).optional().nullable(),
  is_featured: z.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sort_order: z.number().int().optional(),
});

const promotionSchema = z.object({
  service_id: z.number().int().optional().nullable(),
  title: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  description: z.string().optional().nullable(),
  original_price: z.number().optional().nullable(),
  promo_price: z.number().optional().nullable(),
  promo_text: z.string().max(255).optional().nullable(),
  image_url: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  sort_order: z.number().int().optional(),
});

const doctorSchema = z.object({
  name: z.string().min(1).max(255),
  position: z.string().max(255).optional().nullable(),
  license_no: z.string().max(100).optional().nullable(),
  bio: z.string().max(5000).optional().nullable(),
  image_url: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const branchSchema = z.object({
  branch_name: z.string().min(1).max(255),
  address: z.string().max(1000).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  google_map_url: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  opening_hours: z.string().max(500).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  sort_order: z.number().int().optional(),
});

module.exports = {
  serviceSchema,
  pageSchema,
  leadSchema,
  articleSchema,
  reviewSchema,
  faqSchema,
  promotionSchema,
  doctorSchema,
  branchSchema,
};