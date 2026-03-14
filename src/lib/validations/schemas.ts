import { z } from "zod";

const stripHtml = (val: string) => val.replace(/<[^>]*>/g, "").trim();

export const clientSchema = z.object({
  first_name: z.string().min(2, "Jméno musí mít alespoň 2 znaky").transform(stripHtml),
  last_name: z.string().min(2, "Příjmení musí mít alespoň 2 znaky").transform(stripHtml),
  email: z.string().email("Neplatný email").optional().or(z.literal("")),
  phone: z.string().regex(/^(\+?\d[\d\s-]{6,})$/, "Neplatné telefonní číslo").optional().or(z.literal("")),
});

export const dealSchema = z.object({
  title: z.string().min(1, "Název je povinný").transform(stripHtml),
  value: z.number().positive("Hodnota musí být kladná").optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email("Neplatný email").optional().or(z.literal("")),
  source: z.enum(["manual", "meta", "referral"]).optional(),
});

export const contractSchema = z.object({
  type: z.string().min(1, "Typ smlouvy je povinný"),
  provider: z.string().optional(),
  contract_number: z.string().optional(),
  interest_rate: z.number().min(0).max(100, "Úroková sazba 0-100%").optional(),
});

export const paymentSchema = z.object({
  amount: z.number().positive("Částka musí být kladná"),
  due_date: z.string().refine((d) => !isNaN(Date.parse(d)), "Neplatné datum"),
});

export const loginSchema = z.object({
  email: z.string().email("Neplatný email"),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků"),
});

export const registerSchema = z.object({
  email: z.string().email("Neplatný email"),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků"),
  company_name: z.string().min(2, "Název firmy musí mít alespoň 2 znaky").transform(stripHtml),
});

export const ticketSchema = z.object({
  subject: z.string().min(3, "Předmět musí mít alespoň 3 znaky").transform(stripHtml),
  description: z.string().optional().transform((v) => v ? stripHtml(v) : v),
  category: z.enum(["technical", "question", "feature_request", "billing"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});
