export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  phone: string;
  created_at: string;
}

export interface MarathonEvent {
  id: number;
  name: string;
  city: string;
  date: string;
  route_description: string;
  start_point: string;
  end_point: string;
  cutoff_time: string;
  fee: number;
  supplies: string;
  status: 'upcoming' | 'ongoing' | 'finished';
  image_url: string;
  registration_deadline: string;
  created_at: string;
}

export interface EventProject {
  id: number;
  event_id: number;
  name: 'full' | 'half' | 'family';
  distance: number;
  max_participants: number;
  current_count: number;
}

export interface Registration {
  id: number;
  user_id: number;
  event_id: number;
  project_id: number;
  emergency_contact: string;
  emergency_phone: string;
  bib_number: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  certificate_url: string;
  finish_time: string;
  created_at: string;
}

export interface AuthRequest extends Express.Request {
  userId?: number;
  userRole?: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}
