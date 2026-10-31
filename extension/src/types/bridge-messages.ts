import { Diagnostic } from './diagnostics';

export type BridgeMessageType = 
  | 'CODESENSE_PING'
  | 'CODESENSE_PONG'
  | 'CODESENSE_GET_STATE'
  | 'CODESENSE_STATE_RESPONSE'
  | 'CODESENSE_CODE_CHANGED'
  | 'CODESENSE_APPLY_DECORATIONS'
  | 'CODESENSE_CLEAR_DECORATIONS';

export interface BridgeMessage<T = any> {
  source: 'codesense-content' | 'codesense-main';
  type: BridgeMessageType;
  payload?: T;
  timestamp: number;
}

export interface MainWorldState {
  hasMonaco: boolean;
  hasCodeMirror: boolean;
  editorType: 'monaco' | 'codemirror5' | 'codemirror6' | 'unknown';
  code: string;
  language: string;
  version: number;
}

export interface DecorationPayload {
  diagnostics: Diagnostic[];
}

