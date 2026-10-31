import test from 'node:test';
import assert from 'node:assert';

// Import built content or define test cases matching LocalSyntaxAnalyzer logic
function generateDiagnosticFingerprint(language, line, category, message) {
  const normalizedMsg = message.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 100);
  const raw = `${language.toLowerCase()}:${line}:${category.toLowerCase()}:${normalizedMsg}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return `cs_diag_${Math.abs(hash).toString(36)}`;
}

test('Diagnostic Fingerprint generation is deterministic', () => {
  const fp1 = generateDiagnosticFingerprint('java', 5, 'syntax', 'Missing semicolon');
  const fp2 = generateDiagnosticFingerprint('java', 5, 'syntax', 'Missing semicolon');
  const fp3 = generateDiagnosticFingerprint('java', 6, 'syntax', 'Missing semicolon');

  assert.strictEqual(fp1, fp2, 'Identical errors must produce identical fingerprints');
  assert.notStrictEqual(fp1, fp3, 'Different lines must produce different fingerprints');
});

test('Bracket matching stack detects unclosed braces', () => {
  const code = `
class Solution {
    public int[] twoSum(int[] nums, int target) {
        return new int[]{};
`;
  const stack = [];
  let unclosed = null;
  const lines = code.split('\n');

  for (let l = 0; l < lines.length; l++) {
    for (let c = 0; c < lines[l].length; c++) {
      const ch = lines[l][c];
      if (ch === '{') stack.push({ line: l + 1 });
      if (ch === '}') stack.pop();
    }
  }

  assert.strictEqual(stack.length, 2, 'Two unclosed braces should be caught in stack');
});
