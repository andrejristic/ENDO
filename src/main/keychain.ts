/** OS keychain wrapper (Q6: keys per profile). Never store keys in plaintext. */
const keytar = require('keytar');

export async function set(service: string, account: string, secret: string): Promise<void> {
  await keytar.setPassword(service, account, secret);
}
export async function get(service: string, account: string): Promise<string | null> {
  return keytar.getPassword(service, account);
}
export async function del(service: string, account: string): Promise<boolean> {
  return keytar.deletePassword(service, account);
}
