import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import qrcode from 'qrcode-terminal';

/** Adresses IPv4 de l'ordinateur sur le réseau local (Wi-Fi en premier). */
export function lanAddresses(): string[] {
  const found: { name: string; address: string }[] = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs ?? []) if (a.family === 'IPv4' && !a.internal) found.push({ name, address: a.address });
  }
  // en0 = Wi-Fi sur Mac ; les réseaux privés classiques avant le reste (VPN, Docker…)
  const score = (x: { name: string; address: string }) =>
    (x.name === 'en0' ? 0 : 2) + (/^(192\.168|10)\./.test(x.address) ? 0 : 1);
  return found.sort((a, b) => score(a) - score(b)).map((x) => x.address);
}

export function printQr(url: string) {
  qrcode.generate(url, { small: true }, (qr) => console.log(qr.replace(/^/gm, '    ')));
}

/**
 * Sur Mac : empêche la mise en veille automatique tant que Fluo tourne
 * (le Mac s'endort quand même si on ferme l'écran d'un portable).
 */
export function keepMacAwake(): boolean {
  if (process.platform !== 'darwin') return false;
  try {
    const child = spawn('caffeinate', ['-i', '-w', String(process.pid)], { stdio: 'ignore' });
    child.on('error', () => {});
    return true;
  } catch {
    return false;
  }
}
