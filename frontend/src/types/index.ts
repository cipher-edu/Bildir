// ============================================================
// OsiyoNigohi — TypeScript Type Definitions
// ============================================================

export type UserRole =
  | "student" | "teacher" | "methodist"
  | "department_head" | "proctor"
  | "admin" | "superadmin" | "audit_inspector";

export interface User {
  id:             string;
  email:          string;
  first_name:     string;
  last_name:      string;
  full_name:      string;
  role:           UserRole;
  language:       "uz" | "ru";
  phone:          string;
  picture:        string;
  hemis_id:       string | null;
  student_id:     string | null;
  // Tashkiliy
  university:     string | null;
  university_name:string | null;
  faculty:        string | null;
  faculty_name:   string | null;
  specialty:      string | null;
  specialty_name: string | null;
  group:          string | null;
  group_name:     string | null;
  study_year:     number | null;
  gender:         "M" | "F" | null;
  // Xodim
  position:       string;
  academic_degree:string;
  academic_rank:  string;
  // Meta
  last_hemis_sync:string | null;
  is_active:      boolean;
  created_at:     string;
}

export type QuestionType =
  | "single" | "multiple" | "truefalse" | "fillblank" | "shorttext"
  | "matching" | "ordering" | "dropdown" | "number" | "matrix"
  | "hotspot" | "dragdrop" | "essay" | "code" | "audio";

export interface QuestionOption {
  id?:        string;
  text:       string;
  is_correct?: boolean;
}

export interface Question {
  id:         string;
  type:       QuestionType;
  text:       string;
  image?:     string | null;
  audio_file?:string | null;
  options:    QuestionOption[] | Record<string, unknown>;
  answer?:    Record<string, unknown>;
  points:     number;
  settings:   Record<string, unknown>;
}

export type ExamType   = "practice" | "midterm" | "final";
export type ExamStatus =
  | "draft" | "reviewed" | "approved"
  | "sealed" | "locked" | "published" | "archived";

export interface Exam {
  id:              string;
  title:           string;
  description:     string;
  subject:         string;
  subject_name:    string;
  faculty:         string;
  faculty_name:    string;
  specialty:       string | null;
  specialty_name:  string | null;
  exam_type:       ExamType;
  status:          ExamStatus;
  duration_sec:    number;
  questions_count: number;
  max_attempts:    number;
  passing_score:   number;
  proctor_level:   0 | 1 | 2 | 3;
  requires_literature_selection: boolean;
  literature_min_count: number;
  literature_max_count: number;
  questions_per_literature: number;
  points_per_question: string | number;
  available_from?: string | null;
  available_until?:string | null;
  // computed
  attempts_used?:  number;
  can_start?:      boolean;
}

export interface Literature {
  id:     string;
  title:  string;
  author?:string;
  order:  number;
  question_count?: number;
  selectable?: boolean;
}

export interface ExamSession {
  id:             string;
  exam:           string;
  exam_title:     string;
  exam_subject:   string;
  attempt_number: number;
  status:         "started" | "finished" | "terminated" | "abandoned";
  started_at:     string;
  finished_at?:   string | null;
  score?:         number | null;
  max_score?:     number | null;
  percentage?:    number | null;
  passed?:        boolean | null;
  time_spent_sec?:number | null;
  violation_count: number;
  integrity_score?: number;
  selected_literatures?: string[];
}

export interface UserAnswer {
  question:       string;
  question_text:  string;
  question_type:  QuestionType;
  answer:         Record<string, unknown>;
  is_correct:     boolean | null;
  points_earned:  number;
  ai_score?:      number | null;
  ai_feedback?:   string;
  teacher_score?: number | null;
}

export interface ExamResult extends ExamSession {
  blockchain_tx?: string | null;
  answers:        UserAnswer[];
}

export interface ApiResponse<T> {
  success: boolean;
  data:    T;
}

export interface PaginatedMeta {
  total:     number;
  page:      number;
  page_size: number;
}

export interface PaginatedData<T> {
  data: T[];
  meta: PaginatedMeta;
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;

export interface TimerSyncEvent {
  type:      "timer.sync" | "timer.expired";
  remaining: number;
  message?:  string;
}

export type ViolationEventType =
  | "tab_switch" | "fullscreen" | "devtools" | "screen_share"
  | "multi_face" | "no_face" | "vm_detected"
  | "audio_anomaly" | "copy_attempt" | "gaze_off";

// ── Teacher / Manage ──────────────────────────────────────────

export type QuestionPoolType = "practice" | "exam";
export type QuestionDifficulty = "easy" | "medium" | "hard";
export type BloomLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";

export interface TeacherQuestion {
  id:           string;
  exam?:        string | null;
  pool_type:    QuestionPoolType;
  type:         QuestionType;
  text:         string;
  options?:     QuestionOption[];
  answer?:      Record<string, unknown>;
  settings?:    Record<string, unknown>;
  points:       number;
  difficulty:   QuestionDifficulty;
  bloom_level:  number;
  tags?:        string[];
  subject_names:string[];
  order:        number;
  version:      number;
  is_active:    boolean;
  created_at:   string;
}

export interface Subject {
  id:   number;
  name: string;
  code: string;
}

export interface ManageExam extends Exam {
  description:       string;
  created_by_name:   string;
  created_at:        string;
  updated_at:        string;
  shuffle_questions?: boolean;
  shuffle_options?:   boolean;
  show_result?:       boolean;
  allowed_groups:     number[];
}

// ── Practice ──────────────────────────────────────────────────

export interface PracticeSession {
  id:               string;
  subject:          number | null;
  subject_name:     string | null;
  question_count:   number;
  difficulty:       string;
  total_questions:  number;
  answered_count:   number;
  correct_count:    number;
  score_percentage: number;
  status:           "active" | "completed" | "abandoned";
  started_at:       string;
  finished_at:      string | null;
}

export interface PracticeSessionDetail extends PracticeSession {
  answers: PracticeAnswerItem[];
}

export interface PracticeAnswerItem {
  id:            string;
  question:      string;
  question_text: string;
  question_type: string;
  answer:        Record<string, unknown>;
  is_correct:    boolean | null;
  points_earned: number;
  answered_at:   string;
}

// ── Surveys ───────────────────────────────────────────────────

export type SurveyStatus = "draft" | "published" | "closed" | "archived";
export type SurveyAudience = "students" | "staff" | "all";
export type SurveyPrivacyMode = "open" | "anonymous";
export type SurveyStatsLevel = "none" | "coarse" | "detailed";
export type SurveyQType =
  | "single" | "multiple" | "text" | "textarea"
  | "rating" | "nps" | "likert";

export interface SurveyOption {
  id?:    string;
  text:   string;
  order?: number;
}

export interface SurveyQuestion {
  id:        string;
  order:     number;
  q_type:    SurveyQType;
  text:      string;
  help_text: string;
  required:  boolean;
  options:   SurveyOption[];
  settings:  Record<string, unknown>;
  created_at?: string;
}

export interface Survey {
  id:                  string;
  title:               string;
  description:         string;
  status:              SurveyStatus;
  audience:            SurveyAudience;
  privacy_mode:        SurveyPrivacyMode;
  stats_level:         SurveyStatsLevel;
  min_n_for_breakdown: number;
  store_group_meta:    boolean;
  track_participation: boolean;
  start_at:            string | null;
  end_at:              string | null;
  study_years:         number[];
  public_path:         string;
  public_url:          string;
  qr_image:            string | null;
  published_at:        string | null;
  closed_at:           string | null;
  created_at:          string;
  updated_at:          string;
  question_count?:     number;
  response_count?:     number;
  created_by_name?:    string | null;
  already_submitted?:  boolean;
}

export interface SurveyDetail extends Survey {
  questions:   SurveyQuestion[];
  faculties:   string[];
  specialties: string[];
  groups:      string[];
  university?: string | null;
  created_by?: string | null;
}

export interface SurveyTake {
  id:               string;
  title:            string;
  description:      string;
  privacy_mode:     SurveyPrivacyMode;
  start_at:         string | null;
  end_at:           string | null;
  status:           SurveyStatus;
  public_url:       string;
  questions:        SurveyQuestion[];
  already_submitted: boolean;
}

export interface SurveyParticipation {
  id:            string;
  user:          string;
  user_email:    string;
  user_name:     string | null;
  status:        "started" | "submitted";
  started_at:    string;
  submitted_day: string | null;
}

export interface SurveyResults {
  survey_id:               string;
  title?:                  string;
  status?:                 SurveyStatus;
  privacy_mode:            SurveyPrivacyMode;
  track_participation?:    boolean;
  response_count:          number;
  participation_submitted: number;
  participation_started?:  number;
  question_count?:         number;
  questions: Array<{
    question_id:   string;
    text:          string;
    q_type:        string;
    count:         number;
    distribution:  Record<string, number>;
    distribution_labeled?: Array<{
      key: string;
      label: string;
      value: number;
      pct: number;
    }>;
    average:       number | null;
    texts_sample?: string[];
  }>;
  meta_breakdown:      Record<string, Record<string, number>>;
  dimensions?: Record<string, {
    label: string;
    items: Array<{
      key: string;
      label: string;
      value: number;
      pct: number;
      average?: number;
    }>;
    timeline?: {
      series_keys: string[];
      points: Array<{ date: string; values: Record<string, number> }>;
    };
  }>;
  stats_level?: string;
  min_n_for_breakdown: number;
  timeline?: Array<{ date: string; count: number }>;
}

// ── Yangiliklar ───────────────────────────────────────────────

export type NewsCategory =
  | "announcement"
  | "event"
  | "regulation"
  | "anti_corruption"
  | "general";

export type NewsStatus = "draft" | "published" | "archived";

export type I18nMap = Partial<Record<"uz" | "ru" | "en" | "kaa", string>>;

export interface NewsArticle {
  id: string;
  title: string;
  title_i18n?: I18nMap;
  slug: string;
  summary: string;
  summary_i18n?: I18nMap;
  body?: string;
  body_i18n?: I18nMap;
  cover?: string | null;
  cover_url?: string | null;
  category: NewsCategory;
  category_label?: string;
  status: NewsStatus;
  status_label?: string;
  is_featured: boolean;
  is_pinned: boolean;
  published_at?: string | null;
  author?: string | null;
  author_name?: string | null;
  meta_title?: string;
  meta_title_i18n?: I18nMap;
  meta_description?: string;
  meta_description_i18n?: I18nMap;
  locale?: string;
  created_at: string;
  updated_at: string;
}

// ── Office / Murojaat ─────────────────────────────────────────

export interface ResponsiblePerson {
  id: string;
  photo?: string | null;
  photo_url?: string | null;
  first_name: string;
  last_name: string;
  middle_name?: string;
  full_name?: string;
  position: string;
  department?: string;
  academic_title?: string;
  phone?: string;
  email?: string;
  office_room?: string;
  reception_hours?: string;
  biography?: string;
  responsibilities?: string;
  extra_info?: string;
  order: number;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type AppealStatus = "pending" | "in_progress" | "answered" | "closed";
export type AppealCategory =
  | "general"
  | "academic"
  | "social"
  | "technical"
  | "complaint"
  | "suggestion"
  | "other";

export interface AppealAttachment {
  id: string;
  kind?: "user" | "admin";
  original_name: string;
  size: number;
  content_type: string;
  file_url: string | null;
  created_at: string;
}

export interface Appeal {
  id: string;
  user?: string;
  user_email?: string;
  user_name?: string;
  responsible_person?: string | null;
  responsible_person_id?: string | null;
  responsible_person_name?: string | null;
  unique_code?: string;
  qr_code_url?: string | null;
  subject: string;
  body: string;
  category: AppealCategory;
  category_display?: string;
  status: AppealStatus;
  status_display?: string;
  answer_text?: string;
  answered_at?: string | null;
  answered_by?: string | null;
  answered_by_name?: string | null;
  answered_late?: boolean;
  answered_late_flag?: boolean;
  is_overdue?: boolean;
  hours_left?: number | null;
  sla_deadline?: string;
  sla_hours?: number;
  admin_note?: string;
  attachments?: AppealAttachment[];
  answer_attachments?: AppealAttachment[];
  created_at: string;
  updated_at: string;
}

// ── Notifications ─────────────────────────────────────────────

export interface Notification {
  id:                 string;
  notif_type:         string;
  notif_type_display: string;
  title:              string;
  body:               string;
  data:               Record<string, unknown>;
  is_read:            boolean;
  read_at:            string | null;
  created_at:         string;
}

// ── Audit Log ─────────────────────────────────────────────────

export interface AuditLog {
  id:             string;
  actor:          string | null;
  actor_email:    string | null;
  actor_name:     string | null;
  actor_role:     string | null;
  action:         string;
  action_display: string;
  resource_type:  string;
  resource_id:    string;
  detail:         Record<string, unknown>;
  method:         string | null;
  path:           string | null;
  status_code:    number | null;
  duration_ms:    number | null;
  ip_address:     string | null;
  user_agent:     string | null;
  created_at:     string;
}

// ── Proctoring ────────────────────────────────────────────────

export interface ViolationEvent {
  id:             string;
  type:           ViolationEventType;
  type_display:   string;
  severity:       1 | 2 | 3;
  severity_display: string;
  description:    string;
  metadata:       Record<string, unknown>;
  ai_flagged:     boolean;
  human_reviewed: boolean;
  human_decision: string;
  occurred_at:    string;
}

export interface ProctorSession {
  id:              string;
  user:            string;
  exam:            string;
  violation_count: number;
  started_at:      string;
}

// ── Results App ───────────────────────────────────────────────

export type ResultStatus = "PENDING" | "PASSED" | "FAILED" | "INVALIDATED" | "APPEALING";

export interface ExamResultsSummary {
  id:                 string;
  title:              string;
  subject_name:       string | null;
  faculty_name:       string | null;
  exam_type:          ExamType;
  status:             ExamStatus;
  participant_count:  number;
  average_percentage: number | null;
  pass_count:         number;
  fail_count:         number;
  pending_count:      number;
}

export interface ExamResultData {
  id:              string;
  student:         string;
  student_name:    string;
  student_email:   string;
  student_hemis_id:       string | null;
  student_faculty_name:   string | null;
  student_specialty_name: string | null;
  student_group_name:     string | null;
  student_study_year:     number | null;
  student_gender:         "M" | "F" | null;
  exam:            string;
  exam_title:      string;
  session_id:      string | null;
  attempt_number:  number;
  raw_score:       number;
  max_score:       number;
  percentage:      number;
  passing_score:   number;
  status:          ResultStatus;
  integrity_score: number | null;
  anomaly_count:   number;
  integrity_hash:  string;
  published_at:    string | null;
  created_at:      string;
  updated_at:      string;
}

export interface CertificateData {
  id:               string;
  serial_number:    string;
  result:           string;
  student_name:     string;
  exam_title:       string;
  percentage:       number;
  pdf_url:          string;
  issued_at:        string;
  expires_at:       string | null;
  revoked:          boolean;
  revoked_at:       string | null;
  revoke_reason:    string;
  verification_hash:string;
}

// ── Quality App ───────────────────────────────────────────────

export interface QualityMetric {
  id:                   string;
  question:             string;
  question_text:        string;
  question_type:        string;
  difficulty_index:     number | null;
  discrimination_index: number | null;
  point_biserial:       number | null;
  attempt_count:        number;
  correct_count:        number;
  auto_flagged:         boolean;
  auto_flag_reason:     string;
  computed_at:          string | null;
}

export interface QuestionMetricSnapshot {
  id:                   number;
  difficulty_index:     number | null;
  discrimination_index: number | null;
  point_biserial:       number | null;
  attempt_count:        number;
  correct_count:        number;
  recorded_at:          string;
}

export interface ReviewFlag {
  id:              string;
  question:        string;
  question_text:   string;
  flagged_by:      string | null;
  flagged_by_name: string | null;
  reason:          string;
  comment:         string;
  resolved:        boolean;
  resolved_by:     string | null;
  resolved_by_name:string | null;
  resolved_at:     string | null;
  created_at:      string;
}
