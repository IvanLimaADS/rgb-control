/**
 * Funções de validação e checksum dos protocolos HID reais identificados na Fase 1.
 */

/**
 * Husky TG200 (VID_320F&PID_5016) - Protocolo EVision/Sonix WsKeyboardV102
 * Calcula a soma 16-bit Little-Endian dos bytes [3..63] e grava em pkt[1] (LSB) e pkt[2] (MSB).
 */
export function applyHuskyPacketChecksum(pkt: Uint8Array): Uint8Array {
  if (pkt.length !== 64) {
    throw new Error(`Pacote HID Husky inválido: esperado 64 bytes, recebido ${pkt.length}`);
  }
  let sum = 0;
  for (let i = 3; i < 64; i++) {
    sum = (sum + pkt[i]) & 0xffff;
  }
  pkt[1] = sum & 0xff;
  pkt[2] = (sum >> 8) & 0xff;
  return pkt;
}

/**
 * Redragon M719RGB-PRO (VID_25A7&PID_FA7E) - Protocolo OemDrv / Lowerdev.dll
 * Calcula o checksum de complemento 0x55: (0x55 - sum(bytes)) & 0xFF.
 */
export function computeRedragonComplement55(bytes: ArrayLike<number>, start = 0, end = bytes.length): number {
  let sum = 0;
  for (let i = start; i < end; i++) {
    sum = (sum + (bytes[i] & 0xff)) & 0xff;
  }
  return (0x55 - sum) & 0xff;
}

/**
 * Aplica o checksum 0x55 no último byte (índice 16) de um Feature Report de 17 bytes do Redragon M719RGB-PRO.
 */
export function finalizeRedragonFeatureReport(pkt: Uint8Array): Uint8Array {
  if (pkt.length !== 17) {
    throw new Error(`Feature Report Redragon inválido: esperado 17 bytes, recebido ${pkt.length}`);
  }
  pkt[0] = 0x08; // Report ID 0x08 fixo no protocolo M719RGB-PRO
  pkt[16] = computeRedragonComplement55(pkt, 0, 16);
  return pkt;
}
