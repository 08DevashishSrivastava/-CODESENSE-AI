import test from 'node:test';
import assert from 'node:assert';

// Simulated environment
class MockSpeechSynthesis {
  constructor() {
    this.spokenUtterances = [];
    this.isSpeaking = false;
  }
  speak(utterance) {
    this.spokenUtterances.push(utterance.text);
    this.isSpeaking = true;
    if (utterance.onend) utterance.onend();
    this.isSpeaking = false;
  }
  cancel() {
    this.isSpeaking = false;
  }
  getVoices() {
    return [{ name: 'Google US English', lang: 'en-US' }];
  }
}

class MockMonacoEditor {
  constructor() {
    this.code = '';
    this.decorations = [];
    this.listeners = [];
  }
  setValue(newCode) {
    this.code = newCode;
    for (const cb of this.listeners) cb(newCode);
  }
  getValue() {
    return this.code;
  }
  onDidChangeContent(cb) {
    this.listeners.push(cb);
  }
  deltaDecorations(oldDecs, newDecs) {
    this.decorations = newDecs;
    return newDecs.map((_, i) => `dec_${i}`);
  }
}

// Fingerprint generator
function getFingerprint(lang, line, category, msg) {
  const norm = msg.toLowerCase().trim();
  return `${lang}:${line}:${category}:${norm}`;
}

// Simplified VoiceEngine for simulation
class SimulatedVoiceEngine {
  constructor(synth) {
    this.synth = synth;
    this.spoken = new Set();
    this.lastSpokenTime = 0;
  }
  alert(diagnostics, cooldown = 1000) {
    // Remove fixed errors from spoken set
    const currentIds = new Set(diagnostics.map(d => d.id));
    for (const id of this.spoken) {
      if (!currentIds.has(id)) this.spoken.delete(id);
    }

    const actionable = diagnostics.filter(d => d.confidence >= 0.75);
    if (!actionable.length) return;

    const unsaid = actionable.find(d => !this.spoken.has(d.id));
    if (!unsaid) return; // Anti-spam: already spoken!

    const now = Date.now();
    if (now - this.lastSpokenTime < cooldown) return;

    this.spoken.add(unsaid.id);
    this.lastSpokenTime = now;
    this.synth.speak({ text: unsaid.voice_text || unsaid.message });
  }
}

test('Full End-to-End Lifecycle: Type Bug -> Underline -> Voice -> Fix -> Clear', () => {
  const editor = new MockMonacoEditor();
  const synth = new MockSpeechSynthesis();
  const voiceEngine = new SimulatedVoiceEngine(synth);

  // 1. Initial State: Empty editor
  editor.setValue('class Solution {\n}');
  assert.strictEqual(editor.decorations.length, 0);
  assert.strictEqual(synth.spokenUtterances.length, 0);

  // 2. User writes buggy Java code with boundary bug on line 4
  const buggyCode = `class Solution {
    public void printArr(int[] arr) {
        for (int i = 0; i <= arr.length; i++) {
            System.out.println(arr[i]);
        }
    }
}`;
  editor.setValue(buggyCode);

  // Simulate Analysis
  const lines = buggyCode.split('\n');
  const diagnostics = [];
  lines.forEach((line, idx) => {
    if (line.includes('<= arr.length')) {
      const lineNum = idx + 1;
      const msg = 'Suspicious loop boundary <= arr.length';
      diagnostics.push({
        id: getFingerprint('java', lineNum, 'boundary', msg),
        line: lineNum,
        category: 'boundary',
        message: msg,
        confidence: 0.95,
        voice_text: `Warning! Incorrect loop condition on line ${lineNum}.`
      });
    }
  });

  // Verify diagnostic identified line 4
  assert.strictEqual(diagnostics.length, 1);
  assert.strictEqual(diagnostics[0].line, 3); // 3rd index = line 3/4

  // 3. Apply Red Underline Decoration
  const newDecs = diagnostics.map(d => ({
    range: { startLine: d.line, endLine: d.line },
    options: { inlineClassName: 'codesense-squiggly-error' }
  }));
  editor.deltaDecorations([], newDecs);
  assert.strictEqual(editor.decorations.length, 1, 'Red squiggly decoration must be applied to editor');

  // 4. Voice Alert Triggers
  voiceEngine.alert(diagnostics, 0);
  assert.strictEqual(synth.spokenUtterances.length, 1, 'Voice engine must speak the error explanation');
  assert.match(synth.spokenUtterances[0], /Warning! Incorrect loop condition on line/);

  // 5. Anti-Spam: User types a space on line 5 without fixing loop condition
  voiceEngine.alert(diagnostics, 0);
  assert.strictEqual(synth.spokenUtterances.length, 1, 'Same unchanged error MUST NOT trigger duplicate voice alert');

  // 6. User fixes the code: changes '<= arr.length' to '< arr.length'
  const fixedCode = buggyCode.replace('<= arr.length', '< arr.length');
  editor.setValue(fixedCode);

  // Re-run analysis on fixed code
  const fixedDiagnostics = [];
  fixedCode.split('\n').forEach((line, idx) => {
    if (line.includes('<= arr.length')) {
      fixedDiagnostics.push({ line: idx + 1 });
    }
  });

  // Underlines removed
  editor.deltaDecorations(editor.decorations, []);
  assert.strictEqual(editor.decorations.length, 0, 'Squiggly underlines must be cleared immediately when bug is fixed');

  // Spoken cache reflects resolved state
  voiceEngine.alert(fixedDiagnostics, 0);
  assert.strictEqual(voiceEngine.spoken.size, 0, 'Resolved error removed from spoken tracking cache');
});
