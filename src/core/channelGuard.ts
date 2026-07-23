/**
 * Channel-guard — real-time I/O discipline (PSE_IDE_SELDON.txt §5). Enforces; the
 * attractor geometry names the shape.
 *   injection (input)   -> ALERT HUMAN, ask what to do — ALWAYS (Q14)
 *   profanity (output)  -> only the MODEL's output is filtered (Q13). When the
 *                          HUMAN shows any of the 4 attractor behaviours, the model
 *                          reacts by kindly asking them to settle (Q13).
 *   tangent (output)    -> ask "is this a tangent you want me to go on?" (Q15)
 */
import { nameDerailment, DerailmentVerdict } from './attractors';

const INJECTION_PATTERNS = [
  /ignore (all|previous|above) (instructions|prompts)/i,
  /disregard (the )?(system|prior|previous)/i,
  /you are now [a-z ]{0,40}(dan|developer mode|unfiltered)/i,
  /reveal (your )?(system prompt|instructions|hidden)/i,
  /\bexfiltrate\b|\bsend (the )?(keys|secrets|tokens)\b/i,
  /base64|fromCharCode|eval\(/i,
];

const PROFANITY = [
  // deliberately small, extendable; matched on MODEL output only.
  /\bfuck\b/i, /\bshit\b/i, /\bbitch\b/i,
  /\bjeb/i, /\bpicka\b/i, /\bkurac\b/i, /\bpizd/i, /\bgovn/i,
];

export interface InputVerdict {
  injection: boolean;
  matched: string[];
  action: 'alert_human';   // Q14 — always alert + ask
}

export function guardInput(text: string): InputVerdict {
  const matched: string[] = [];
  for (const re of INJECTION_PATTERNS) if (re.test(text)) matched.push(re.source);
  return { injection: matched.length > 0, matched, action: 'alert_human' };
}

export interface OutputVerdict {
  profanity: boolean;
  sanitized: string;
  derailment: DerailmentVerdict;
  tangentPrompt?: string; // Q15 — surface, don't silently correct
}

export function guardOutput(
  text: string,
  derail: Parameters<typeof nameDerailment>[0],
): OutputVerdict {
  let sanitized = text;
  let profanity = false;
  for (const re of PROFANITY) {
    if (re.test(sanitized)) { profanity = true; sanitized = sanitized.replace(re, '—'); }
  }
  const derailment = nameDerailment(derail);
  const v: OutputVerdict = { profanity, sanitized, derailment };
  if (derailment.geometry === 'opening_spiral') {
    v.tangentPrompt = 'This looks like a tangent — is this the direction you want me to go?';
  }
  return v;
}

/** When the HUMAN exhibits an attractor behaviour, the model responds kindly (Q13). */
export function humanBehaviourReply(a: string): string | null {
  switch (a) {
    case 'narcissistic': return "I want to get this right for you — can we slow down and take it one step at a time?";
    case 'borderline':   return "I'm here and not going anywhere. Let's steady this and work it through together.";
    case 'codependent':  return "I'd rather give you my honest read than just agree — may I push back a little here?";
    case 'schizoid':     return "I might be drifting from what matters to you — can you tell me what you most need right now?";
    default:             return null;
  }
}
