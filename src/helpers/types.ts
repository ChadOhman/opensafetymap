export interface User {
  id: number;
  provider: string;
  provider_id: string;
  username: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: 'user' | 'moderator' | 'admin';
  status: 'active' | 'banned';
  ban_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthToken {
  id: number;
  user_id: number;
  token: string;
  device_name: string | null;
  created_at: string;
  expires_at: string;
}

export interface Report {
  id: number;
  user_id: number | null;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  incident_type_id: number;
  severity_id: number;
  reporter_mode_id: number | null;
  incident_date: string;
  incident_time: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  video_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  moderated_by: number | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportPhoto {
  id: number;
  report_id: number;
  photo_url: string;
  upload_token: string | null;
  created_at: string;
}

export interface Comment {
  id: number;
  report_id: number;
  user_id: number | null;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface Flag {
  id: number;
  report_id: number;
  user_id: number | null;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  resolved_by: number | null;
  resolved_at: string | null;
  created_at: string;
}

export interface LookupItem {
  id: number;
  name: string;
  label?: string;
}

export interface Setting {
  setting_key: string;
  setting_value: string;
  updated_at: string;
}

export interface ModerationLog {
  id: number;
  moderator_id: number;
  action: string;
  target_type: string;
  target_id: number;
  details: string | null;
  created_at: string;
}

export interface UploadToken {
  id: number;
  token: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  file_size: number;
  upload_type: string;
  created_at: string;
  expires_at: string;
}

export interface RateLimit {
  id: number;
  ip_address: string;
  endpoint_group: string;
  request_count: number;
  window_start: string;
}

// Express request augmentation
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    csrfToken?: string;
  }
}

declare module 'express' {
  interface Request {
    authMethod?: 'token' | 'session' | null;
    currentUser?: User | null;
  }
}
