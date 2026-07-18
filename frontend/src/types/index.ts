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

export interface Survey {
  id:             string;
  title:          string;
  description:    string;
  trigger:        "post_exam" | "standalone";
  exam:           string | null;
  exam_title:     string | null;
  is_active:      boolean;
  question_count: number;
  created_at:     string;
}

export interface SurveyQuestion {
  id:       string;
  order:    number;
  text:     string;
  q_type:   "rating" | "text" | "choice";
  options:  string[];
  required: boolean;
}

export interface SurveyDetail extends Survey {
  questions:  SurveyQuestion[];
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
