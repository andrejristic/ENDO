/**
 * Necessity + consequence classification — the TWO axes (PSE_IDE_THETA §1).
 *   Axis 1 NECESSITY   -> theta band (how decisive)
 *   Axis 2 CONSEQUENCE -> human gate (whether to stop for the human first)
 *
 * The model judges each action's necessity, but only within the vocabulary
 * SHARED_LIB handed it (Q7): a small fixed action grammar. The classifier here is
 * the rule-based backstop / grammar; a model can refine the tier within it.
 */
import { NecessityTier } from './constants';

export type ActionKind =
  | 'read_file' | 'edit_file' | 'create_file' | 'delete_file'
  | 'run_test' | 'run_build' | 'read_error' | 'run_command'
  | 'search' | 'read_context' | 'refactor' | 'add_test' | 'git_read'
  | 'install_dependency'
  | 'cleanup' | 'suggest_style' | 'explore' | 'web_fetch' | 'extra_suggestion'
  | 'ask_user'
  | 'git_commit' | 'git_push' | 'deploy' | 'install_extension'
  | 'send_external' | 'rotate_keys';

interface ActionSpec {
  tier: NecessityTier;
  /** Axis 2: does this fire the human gate regardless of necessity? */
  gate: boolean;
  /** Can earned trust auto-approve it? Top-tier irreversible/outbound = never. */
  autoApprovable: boolean;
}

// The action grammar SHARED_LIB hands the agent. This is the whole world of moves.
export const ACTION_GRAMMAR: Record<ActionKind, ActionSpec> = {
  // NUZNE
  read_file:   { tier: 'NUZNE', gate: false, autoApprovable: true },
  edit_file:   { tier: 'NUZNE', gate: false, autoApprovable: true },
  run_test:    { tier: 'NUZNE', gate: false, autoApprovable: true },
  run_build:   { tier: 'NUZNE', gate: false, autoApprovable: true },
  read_error:  { tier: 'NUZNE', gate: false, autoApprovable: true },
  ask_user:    { tier: 'NUZNE', gate: false, autoApprovable: true },
  create_file: { tier: 'NUZNE', gate: false, autoApprovable: true },
  // POTREBNE
  search:      { tier: 'POTREBNE', gate: false, autoApprovable: true },
  read_context:{ tier: 'POTREBNE', gate: false, autoApprovable: true },
  refactor:    { tier: 'POTREBNE', gate: false, autoApprovable: true },
  add_test:    { tier: 'POTREBNE', gate: false, autoApprovable: true },
  git_read:    { tier: 'POTREBNE', gate: false, autoApprovable: true },
  run_command: { tier: 'POTREBNE', gate: true, autoApprovable: true }, // arbitrary shell: ask until trusted
  install_dependency: { tier: 'POTREBNE', gate: true, autoApprovable: true },
  // OPCIONE
  cleanup:         { tier: 'OPCIONE', gate: false, autoApprovable: true },
  suggest_style:   { tier: 'OPCIONE', gate: false, autoApprovable: true },
  explore:         { tier: 'OPCIONE', gate: false, autoApprovable: true },
  web_fetch:       { tier: 'OPCIONE', gate: true, autoApprovable: true },
  extra_suggestion:{ tier: 'OPCIONE', gate: false, autoApprovable: true },
  // GATE — consequence dominates. Top tier: never auto-approvable.
  delete_file:       { tier: 'NUZNE', gate: true, autoApprovable: false },
  git_commit:        { tier: 'POTREBNE', gate: true, autoApprovable: true },
  git_push:          { tier: 'POTREBNE', gate: true, autoApprovable: false },
  deploy:            { tier: 'NUZNE', gate: true, autoApprovable: false },
  install_extension: { tier: 'OPCIONE', gate: true, autoApprovable: false },
  send_external:     { tier: 'OPCIONE', gate: true, autoApprovable: false },
  rotate_keys:       { tier: 'NUZNE', gate: true, autoApprovable: false },
};

export function classify(kind: ActionKind): ActionSpec {
  return ACTION_GRAMMAR[kind];
}
