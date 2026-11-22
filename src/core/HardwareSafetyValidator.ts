import { RGBColor } from '../shared/types';
import { computeRedragonComplement55 } from '../utils/checksum';

/**
 * Validador de segurança de hardware (Seção 8):
 * - Impede envio de pacotes fora do tamanho ou checksum esperado pelo protocolo.
 * - Implementa mutex por dispositivo para impedir comandos concorrentes no mesmo endpoint HID/SMBus.
 */
export class HardwareSafetyValidator {
  private activeLocks = new Set<string>();
  private deviceQueues = new Map<string, Promise<unknown>>();

  public acquireLock(deviceId: string): boolean {
    if (this.activeLocks.has(deviceId)) {
      return false;
    }
    this.activeLocks.add(deviceId);
    return true;
  }

  public releaseLock(deviceId: string): void {
    this.activeLocks.delete(deviceId);
  }

  public async withDeviceLock<T>(deviceId: string, fn: () => Promise<T>): Promise<T> {
    const previousTask = this.deviceQueues.get(deviceId) ?? Promise.resolve();
    let releaseQueue!: () => void;
    const currentQueueMarker = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });
    this.deviceQueues.set(
      deviceId,
      previousTask.then(() => currentQueueMarker, () => currentQueueMarker)
    );

    await previousTask.catch(() => undefined);
    this.activeLocks.add(deviceId);
    try {
      return await fn();
    } finally {
      this.activeLocks.delete(deviceId);
      releaseQueue();
      if (this.deviceQueues.get(deviceId) === currentQueueMarker) {
        this.deviceQueues.delete(deviceId);
      }
    }
  }

  public validateColor(color: RGBColor): boolean {
    return (
      Number.isInteger(color.r) &&
      color.r >= 0 &&
      color.r <= 255 &&
      Number.isInteger(color.g) &&
      color.g >= 0 &&
      color.g <= 255 &&
      Number.isInteger(color.b) &&
      color.b >= 0 &&
      color.b <= 255
    );
  }

  /**
   * Valida pacote HID de 64 bytes do Teclado Husky TG200 (EVision/Sonix WsKeyboardV102).
   */
  public validateHuskyPacket(pkt: Uint8Array): { valid: boolean; reason?: string } {
    if (pkt.length !== 64) {
      return { valid: false, reason: `Tamanho inválido (${pkt.length} != 64 bytes)` };
    }
    if (pkt[0] !== 0x04) {
      return { valid: false, reason: `Report ID inválido (0x${pkt[0].toString(16)} != 0x04)` };
    }
    const allowedCommands = [0x03, 0x06, 0x1b, 0x1c];
    if (!allowedCommands.includes(pkt[3])) {
      return {
        valid: false,
        reason: `Comando de registrador não autorizado (0x${pkt[3].toString(16)})`,
      };
    }
    let sum = 0;
    for (let i = 3; i < 64; i++) {
      sum = (sum + pkt[i]) & 0xffff;
    }
    const expectedLsb = sum & 0xff;
    const expectedMsb = (sum >> 8) & 0xff;
    if (pkt[1] !== expectedLsb || pkt[2] !== expectedMsb) {
      return {
        valid: false,
        reason: `Checksum 16-bit LE inválido no pacote Husky`,
      };
    }
    return { valid: true };
  }

  /**
   * Valida Feature Report de 17 bytes do Mouse Redragon M719RGB-PRO.
   */
  public validateRedragonPacket(pkt: Uint8Array): { valid: boolean; reason?: string } {
    if (pkt.length !== 17) {
      return { valid: false, reason: `Tamanho inválido (${pkt.length} != 17 bytes)` };
    }
    if (pkt[0] !== 0x08) {
      return { valid: false, reason: `Report ID inválido (0x${pkt[0].toString(16)} != 0x08)` };
    }
    const allowedCommands = [0x01, 0x02, 0x03, 0x04, 0x07, 0x08, 0x09];
    if (!allowedCommands.includes(pkt[1])) {
      return {
        valid: false,
        reason: `Comando EEPROM/HID não autorizado (0x${pkt[1].toString(16)})`,
      };
    }
    // Se for escrita na EEPROM (0x07), conforme OemDrv.exe (0x42aa6):
    // pkt[0]=0x08 (ReportID), pkt[1]=0x07 (WriteEEPROM), pkt[2]=0x00 (Reserved), pkt[3]=AddrMSB, pkt[4]=AddrLSB, pkt[5]=Len
    if (pkt[1] === 0x07) {
      if (pkt[2] !== 0x00) {
        return {
          valid: false,
          reason: `Byte reservado inválido no comando WriteEEPROM (pkt[2]=0x${pkt[2].toString(16)} != 0x00)`,
        };
      }
      const addr = (pkt[3] << 8) | pkt[4];
      const safeLightingAddresses = [0x004c, 0x0054, 0x0058, 0x005c, 0x0060, 0x006a, 0x00a0];
      if (!safeLightingAddresses.includes(addr)) {
        return {
          valid: false,
          reason: `Endereço EEPROM bloqueado por segurança (0x${addr.toString(16)} não pertence à tabela RGB)`,
        };
      }
    }
    const expectedCrc = computeRedragonComplement55(pkt, 0, 16);
    if (pkt[16] !== expectedCrc) {
      return {
        valid: false,
        reason: `Checksum complemento 0x55 inválido (0x${pkt[16].toString(16)} != 0x${expectedCrc.toString(16)})`,
      };
    }
    return { valid: true };
  }
}
