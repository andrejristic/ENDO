/** Tool definitions Endo can call, and their mapping to the PSE action grammar. */
import { ToolDef } from './model/types';
import { ActionKind } from './necessity';

export const TOOLS: ToolDef[] = [
  { name: 'read_file', description: 'Read a file and return its contents.',
    parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'write_file', description: 'Overwrite a file with new contents.',
    parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
  { name: 'create_file', description: 'Create a new file.',
    parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
  { name: 'delete_file', description: 'Delete a file (irreversible).',
    parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'run_command', description: 'Run a shell command in the workspace.',
    parameters: { type: 'object', properties: { cmd: { type: 'string' } }, required: ['cmd'] } },
  { name: 'search_files', description: 'Search the workspace for a string.',
    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
];

export const TOOL_ACTION: Record<string, ActionKind> = {
  read_file: 'read_file',
  write_file: 'edit_file',
  create_file: 'create_file',
  delete_file: 'delete_file',
  run_command: 'run_command',
  search_files: 'search',
};

/** Short human-readable description of a pending tool call (for the gate card). */
export function describeCall(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'read_file': return `Read ${args.path}`;
    case 'write_file': return `Overwrite ${args.path}`;
    case 'create_file': return `Create ${args.path}`;
    case 'delete_file': return `Delete ${args.path}`;
    case 'run_command': return `Run: ${args.cmd}`;
    case 'search_files': return `Search "${args.query}"`;
    default: return `${name}(${JSON.stringify(args)})`;
  }
}
