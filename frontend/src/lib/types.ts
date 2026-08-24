/**
 * API client types for LOA-ESS frontend.
 */

export interface Module {
  id: string;
  code: string;
  name: string;
  description?: string;
  credits: number;
  lecturer?: string;
  year: number;
  semester: number;
  department?: string;
  assessment_structure?: Record<string, number>;
  outline_processed: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningOutcome {
  id: string;
  module_id: string;
  lo_code: string;
  text: string;
  bloom_level: BloomLevel;
  bloom_verb?: string;
  assessment_weight?: number;
  topic_keywords?: string[];
  created_at: string;
}

export type BloomLevel =
  | "Remember"
  | "Understand"
  | "Apply"
  | "Analyze"
  | "Evaluate"
  | "Create";

export interface Week {
  id: string;
  module_id: string;
  week_number: number;
  topic: string;
  description?: string;
  subtopics?: string[];
  created_at: string;
}

export interface DocumentInfo {
  id: string;
  module_id: string;
  week_id?: string;
  filename: string;
  original_filename: string;
  document_type: DocumentType;
  mime_type?: string;
  page_count?: number;
  file_size_bytes?: number;
  processing_status: ProcessingStatus;
  processing_error?: string;
  uploaded_at: string;
  processed_at?: string;
}

export type DocumentType =
  | "module_outline"
  | "lecture_slide"
  | "lecture_note"
  | "lab_sheet"
  | "tutorial"
  | "textbook";

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface SummaryRequest {
  module_id: string;
  week_number?: number;
  query: string;
  output_type: OutputType;
  summary_level: SummaryLevel;
  options?: GenerationOptions;
}

export type OutputType = "summary" | "flashcards" | "quiz" | "mind_map";
export type SummaryLevel =
  | "beginner"
  | "standard"
  | "advanced"
  | "exam_focused"
  | "lo_focused";

export interface GenerationOptions {
  include_examples?: boolean;
  include_citations?: boolean;
  bloom_focus?: string;
  max_length?: number;
  num_flashcards?: number;
  num_quiz_questions?: number;
}

export interface LOCoverageInfo {
  lo_code: string;
  lo_text: string;
  coverage_score: number;
  bloom_level: BloomLevel;
}

export interface Citation {
  text: string;
  source: string;
  location: string;
  chunk_id?: string;
}

export interface GenerationMetadata {
  model: string;
  input_tokens: number;
  output_tokens: number;
  generation_time_ms: number;
  estimated_cost_usd: number;
  chunks_retrieved: number;
  chunks_used: number;
}

export interface SummaryResponse {
  id: string;
  content: string;
  content_format: string;
  output_type: OutputType;
  learning_outcomes_covered: LOCoverageInfo[];
  citations: Citation[];
  metadata: GenerationMetadata;
  created_at: string;
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  learning_outcome: string;
  bloom_level: BloomLevel;
  difficulty: "easy" | "medium" | "hard";
  source: string;
}

export interface QuizQuestion {
  id: number;
  type: "mcq" | "true_false" | "short_answer" | "scenario";
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
  learning_outcome: string;
  bloom_level: BloomLevel;
  difficulty: "easy" | "medium" | "hard";
  source: string;
}
