export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type DiagnosticCategory = 
  | 'syntax' 
  | 'type' 
  | 'logic' 
  | 'runtime' 
  | 'boundary' 
  | 'null_pointer' 
  | 'infinite_loop' 
  | 'warning';

export type DiagnosticSource = 'local' | 'static' | 'ai';

export interface Diagnostic {
  id: string; // Stable fingerprint
  line: number; // 1-based line number
  start_column: number; // 1-based start column
  end_column: number; // 1-based end column
  category: DiagnosticCategory;
  message: string;
  severity: DiagnosticSeverity;
  confidence: number; // 0.0 to 1.0
  source: DiagnosticSource;
  voice_text?: string;
  code_snippet?: string;
}

export interface ProblemContext {
  title: string;
  description: string;
  constraints: string;
  difficulty?: string;
}

export interface AnalysisPayload {
  language: string;
  code: string;
  problem_context: ProblemContext;
  code_version: number;
}

export interface AnalysisResult {
  success: boolean;
  code_version: number;
  diagnostics: Diagnostic[];
  analysis_status: 'completed' | 'failed' | 'cancelled' | 'cached';
  voice_message?: string;
  processing_time_ms?: number;
}

