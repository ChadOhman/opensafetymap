import { z } from 'zod';

export const reportSubmitSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(5000),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  incident_type_id: z.coerce.number().int().positive(),
  severity_id: z.coerce.number().int().positive(),
  reporter_mode_id: z.coerce.number().int().positive().optional(),
  incident_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  incident_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  other_party_ids: z.union([
    z.string().transform(s => s.split(',').map(Number).filter(n => !isNaN(n))),
    z.array(z.coerce.number().int().positive()),
  ]).optional(),
  reporter_name: z.string().max(100).optional(),
  reporter_email: z.string().email().max(255).optional(),
  reporter_phone: z.string().max(20).optional(),
  video_url: z.string().regex(/^\/uploads\/pending\/video_[a-f0-9]+\.(mp4|webm|mov)$/i).optional(),
  photo_tokens: z.union([
    z.string().transform(s => s.split(',').filter(Boolean)),
    z.array(z.string()),
  ]).optional(),
  website: z.string().optional(), // honeypot
});

export const commentSubmitSchema = z.object({
  report_id: z.coerce.number().int().positive(),
  body: z.string().min(1).max(2000),
  author_name: z.string().min(1).max(100).optional(),
  website: z.string().optional(), // honeypot
});

export const flagSubmitSchema = z.object({
  report_id: z.coerce.number().int().positive(),
  reason: z.string().min(1).max(1000),
  website: z.string().optional(), // honeypot
});

export const moderateReportSchema = z.object({
  report_id: z.coerce.number().int().positive(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(1000).optional(),
});

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
});

export const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

export const updateRoleSchema = z.object({
  role: z.enum(['user', 'moderator', 'admin']),
});

export const flagResolveSchema = z.object({
  flag_id: z.coerce.number().int().positive(),
  action: z.enum(['resolve', 'dismiss']),
});
