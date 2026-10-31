import { Diagnostic } from '../types/diagnostics';
import { generateDiagnosticFingerprint } from '../utils/fingerprint';

export class LocalSyntaxAnalyzer {
  static analyze(code: string, language: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    if (!code || !code.trim()) return diagnostics;

    const lang = language.toLowerCase();
    const lines = code.split('\n');

    // 1. Bracket Matching Check across all languages
    this.checkBracketMatching(lines, lang, diagnostics);

    // 2. Language-specific checks
    if (lang === 'java' || lang === 'cpp' || lang === 'c') {
      this.checkCStyleSyntax(lines, lang, diagnostics);
    } else if (lang === 'python') {
      this.checkPythonSyntax(lines, diagnostics);
    } else if (lang === 'javascript' || lang === 'js') {
      this.checkJavaScriptSyntax(lines, diagnostics);
    }

    return diagnostics;
  }

  private static checkBracketMatching(lines: string[], lang: string, diags: Diagnostic[]) {
    const stack: Array<{ char: string; line: number; col: number }> = [];
    const pairs: Record<string, string> = { '}': '{', ')': '(', ']': '[' };
    const openChars = new Set(['{', '(', '[']);
    const closeChars = new Set(['}', ')', ']']);

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineStr = lines[lineIdx];
      let inString: string | null = null;
      let isEscaped = false;

      for (let colIdx = 0; colIdx < lineStr.length; colIdx++) {
        const ch = lineStr[colIdx];

        // Skip comments
        if (!inString && ch === '/' && lineStr[colIdx + 1] === '/') {
          break; // single-line comment
        }
        if (!inString && lang === 'python' && ch === '#') {
          break; // python comment
        }

        // String boundary handling
        if (!isEscaped && (ch === '"' || ch === "'" || ch === '`')) {
          if (inString === ch) {
            inString = null;
          } else if (!inString) {
            inString = ch;
          }
        }

        if (ch === '\\' && !isEscaped) {
          isEscaped = true;
          continue;
        }
        isEscaped = false;

        if (inString) continue;

        if (openChars.has(ch)) {
          stack.push({ char: ch, line: lineIdx + 1, col: colIdx + 1 });
        } else if (closeChars.has(ch)) {
          const expectedOpen = pairs[ch];
          if (stack.length === 0) {
            const lineNum = lineIdx + 1;
            const msg = `Unexpected closing bracket '${ch}' with no matching opening bracket.`;
            diags.push({
              id: generateDiagnosticFingerprint(lang, lineNum, 'syntax', msg),
              line: lineNum,
              start_column: colIdx + 1,
              end_column: colIdx + 2,
              category: 'syntax',
              message: msg,
              severity: 'error',
              confidence: 0.98,
              source: 'local',
              voice_text: `Syntax error on line ${lineNum}. Unexpected closing bracket.`
            });
            return;
          } else {
            const top = stack.pop()!;
            if (top.char !== expectedOpen) {
              const lineNum = lineIdx + 1;
              const msg = `Mismatched bracket: expected '${top.char}' to match closing '${ch}'.`;
              diags.push({
                id: generateDiagnosticFingerprint(lang, lineNum, 'syntax', msg),
                line: lineNum,
                start_column: colIdx + 1,
                end_column: colIdx + 2,
                category: 'syntax',
                message: msg,
                severity: 'error',
                confidence: 0.98,
                source: 'local',
                voice_text: `Syntax error on line ${lineNum}. Mismatched bracket detected.`
              });
              return;
            }
          }
        }
      }
    }

    if (stack.length > 0) {
      const unclosed = stack[stack.length - 1];
      const msg = `Unclosed bracket '${unclosed.char}'. Missing matching closing bracket.`;
      diags.push({
        id: generateDiagnosticFingerprint(lang, unclosed.line, 'syntax', msg),
        line: unclosed.line,
        start_column: unclosed.col,
        end_column: unclosed.col + 1,
        category: 'syntax',
        message: msg,
        severity: 'error',
        confidence: 0.95,
        source: 'local',
        voice_text: `Syntax warning on line ${unclosed.line}. Missing closing bracket.`
      });
    }
  }

  private static checkCStyleSyntax(lines: string[], lang: string, diags: Diagnostic[]) {
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const raw = lines[i];
      const trimmed = raw.trim();

      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
        continue;
      }

      // Check missing semicolon on candidate statements
      const isStatementEnd = 
        !trimmed.endsWith(';') && 
        !trimmed.endsWith('{') && 
        !trimmed.endsWith('}') && 
        !trimmed.endsWith(':') &&
        !trimmed.endsWith(',') &&
        !trimmed.startsWith('for') &&
        !trimmed.startsWith('if') &&
        !trimmed.startsWith('while') &&
        !trimmed.startsWith('switch') &&
        !trimmed.startsWith('else');

      if (isStatementEnd) {
        // Look ahead to ensure statement doesn't continue on next line
        const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
        const continues = nextLine.startsWith('+') || nextLine.startsWith('-') || nextLine.startsWith('*') || 
                          nextLine.startsWith('/') || nextLine.startsWith('.') || nextLine.startsWith('&&') || 
                          nextLine.startsWith('||') || nextLine.startsWith('->');

        if (!continues && (trimmed.startsWith('return') || trimmed.includes('=') || trimmed.startsWith('throw') || 
            /^[a-zA-Z0-9_<>[\]]+\s+[a-zA-Z0-9_]+/.test(trimmed))) {
          const msg = `Missing semicolon ';' at the end of statement.`;
          diags.push({
            id: generateDiagnosticFingerprint(lang, lineNum, 'syntax', msg),
            line: lineNum,
            start_column: raw.length,
            end_column: raw.length + 1,
            category: 'syntax',
            message: msg,
            severity: 'error',
            confidence: 0.96,
            source: 'local',
            voice_text: `Missing semicolon on line ${lineNum}.`
          });
        }
      }

      // Suspicious loop conditions (e.g. for (int i = 0; i <= arr.length; i++))
      if (lang === 'java' && trimmed.includes('.length') && trimmed.includes('<=') && trimmed.startsWith('for')) {
        const msg = `Suspicious loop boundary '<= arr.length'. Array index out of bounds risk; should usually be '< arr.length'.`;
        diags.push({
          id: generateDiagnosticFingerprint(lang, lineNum, 'boundary', msg),
          line: lineNum,
          start_column: 1,
          end_column: trimmed.length + 1,
          category: 'boundary',
          message: msg,
          severity: 'warning',
          confidence: 0.90,
          source: 'local',
          voice_text: `Warning! Possible array index out of bounds on line ${lineNum}. Check your loop boundary.`
        });
      }
    }
  }

  private static checkPythonSyntax(lines: string[], diags: Diagnostic[]) {
    const blockStarters = ['def ', 'class ', 'if ', 'elif ', 'else:', 'for ', 'while ', 'try:', 'except', 'finally:', 'with '];

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const raw = lines[i];
      const trimmed = raw.trim();

      if (!trimmed || trimmed.startsWith('#')) continue;

      // Check missing colon on block statements
      for (const starter of blockStarters) {
        if (trimmed.startsWith(starter) && !trimmed.endsWith(':')) {
          // If statement hasn't closed with colon and next line isn't continuation
          const msg = `Syntax error: Expected ':' at the end of '${starter.trim()}' block.`;
          diags.push({
            id: generateDiagnosticFingerprint('python', lineNum, 'syntax', msg),
            line: lineNum,
            start_column: raw.length,
            end_column: raw.length + 1,
            category: 'syntax',
            message: msg,
            severity: 'error',
            confidence: 0.97,
            source: 'local',
            voice_text: `Syntax error on line ${lineNum}. Missing colon at end of statement.`
          });
          break;
        }
      }

      // Check suspicious assignment in if condition: `if x = 5:`
      if (trimmed.startsWith('if ') && /if\s+[a-zA-Z_]\w*\s*=\s*[^=]/.test(trimmed)) {
        const msg = `Invalid syntax: Assignment '=' used inside if statement instead of equality '=='.`;
        diags.push({
          id: generateDiagnosticFingerprint('python', lineNum, 'syntax', msg),
          line: lineNum,
          start_column: raw.indexOf('=') + 1,
          end_column: raw.indexOf('=') + 2,
          category: 'syntax',
          message: msg,
          severity: 'error',
          confidence: 0.99,
          source: 'local',
          voice_text: `Syntax error on line ${lineNum}. Assignment used instead of equality in if condition.`
        });
      }

      // Indentation mismatch after colon
      if (trimmed.endsWith(':') && i + 1 < lines.length) {
        const nextRaw = lines[i + 1];
        const nextTrimmed = nextRaw.trim();
        if (nextTrimmed && !nextTrimmed.startsWith('#')) {
          const currentIndent = raw.search(/\S|$/);
          const nextIndent = nextRaw.search(/\S|$/);
          if (nextIndent <= currentIndent) {
            const msg = `IndentationError: Expected an indented block after line ${lineNum}.`;
            diags.push({
              id: generateDiagnosticFingerprint('python', lineNum + 1, 'syntax', msg),
              line: lineNum + 1,
              start_column: 1,
              end_column: 4,
              category: 'syntax',
              message: msg,
              severity: 'error',
              confidence: 0.98,
              source: 'local',
              voice_text: `Indentation error on line ${lineNum + 1}. Expected an indented block.`
            });
          }
        }
      }
    }
  }

  private static checkJavaScriptSyntax(lines: string[], diags: Diagnostic[]) {
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const raw = lines[i];
      const trimmed = raw.trim();

      if (!trimmed || trimmed.startsWith('//')) continue;

      // Suspicious assignment in if statement
      if (trimmed.startsWith('if ') && /if\s*\([^=)]+=[^=)]+\)/.test(trimmed)) {
        const msg = `Suspicious assignment '=' inside conditional expression. Did you mean '==='?`;
        diags.push({
          id: generateDiagnosticFingerprint('javascript', lineNum, 'logic', msg),
          line: lineNum,
          start_column: raw.indexOf('=') + 1,
          end_column: raw.indexOf('=') + 2,
          category: 'logic',
          message: msg,
          severity: 'warning',
          confidence: 0.88,
          source: 'local',
          voice_text: `Warning on line ${lineNum}. Assignment operator used inside condition.`
        });
      }
    }
  }
}

