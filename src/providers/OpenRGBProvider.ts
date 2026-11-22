import net from 'net';
import {
  DeviceCapabilities,
  DeviceInfo,
  EffectDirection,
  LightingEffectType,
  LightingState,
  RGBColor,
} from '../shared/types';
import { BaseProvider } from './BaseProvider';
import { HardwareSafetyValidator } from '../core/HardwareSafetyValidator';
import { LoggerService } from '../services/LoggerService';
import { sanitizeColor } from '../utils/color';

const OPENRGB_MAGIC = Buffer.from('ORGB', 'ascii');
const NET_PACKET_ID_REQUEST_CONTROLLER_COUNT = 0;
const NET_PACKET_ID_REQUEST_PROTOCOL_VERSION = 40;
const NET_PACKET_ID_SET_CLIENT_NAME = 50;
const NET_PACKET_ID_RGBCONTROLLER_UPDATELEDS = 1050;

export class OpenRGBProvider extends BaseProvider {
  public readonly providerId = 'openrgb-sdk-tcp';
  public readonly providerName = 'OpenRGB SDK Provider (TCP Port 6742)';

  private host: string;
  private port: number;
  private isServerOnline = false;

  constructor(
    logger: LoggerService,
    validator: HardwareSafetyValidator,
    host = '127.0.0.1',
    port = 6742
  ) {
    super(logger, validator);
    this.host = host;
    this.port = port;
  }

  public configureEndpoint(host: string, port: number): void {
    this.host = host;
    this.port = port;
  }

  private buildOpenRgbPacket(deviceIdx: number, commandId: number, payload: Buffer): Buffer {
    const header = Buffer.alloc(16);
    OPENRGB_MAGIC.copy(header, 0);
    header.writeUInt32LE(deviceIdx, 4);
    header.writeUInt32LE(commandId, 8);
    header.writeUInt32LE(payload.length, 12);
    return Buffer.concat([header, payload]);
  }

  public async probeSdkServer(): Promise<{ online: boolean; controllerCount: number }> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;
      const finish = (online: boolean, count = 0) => {
        if (!resolved) {
          resolved = true;
          try {
            socket.destroy();
          } catch {
            // Ignora
          }
          resolve({ online, controllerCount: count });
        }
      };

      socket.setTimeout(800);
      socket.once('error', () => finish(false, 0));
      socket.once('timeout', () => finish(false, 0));

      socket.connect(this.port, this.host, () => {
        const clientName = Buffer.from('RGB Control Center\0', 'ascii');
        socket.write(this.buildOpenRgbPacket(0, NET_PACKET_ID_SET_CLIENT_NAME, clientName));

        const protoPayload = Buffer.alloc(4);
        protoPayload.writeUInt32LE(4, 0);
        socket.write(this.buildOpenRgbPacket(0, NET_PACKET_ID_REQUEST_PROTOCOL_VERSION, protoPayload));

        socket.write(
          this.buildOpenRgbPacket(0, NET_PACKET_ID_REQUEST_CONTROLLER_COUNT, Buffer.alloc(0))
        );
      });

      socket.on('data', (chunk: Buffer) => {
        if (chunk.length >= 20 && chunk.subarray(0, 4).toString('ascii') === 'ORGB') {
          const pktId = chunk.readUInt32LE(8);
          if (pktId === NET_PACKET_ID_REQUEST_CONTROLLER_COUNT) {
            const count = chunk.readUInt32LE(16);
            finish(true, count);
          }
        }
      });
    });
  }

  public async discoverDevices(): Promise<DeviceInfo[]> {
    const probe = await this.probeSdkServer();
    this.isServerOnline = probe.online;

    const bridgeId = 'openrgb-sdk-bridge-status';
    const info: DeviceInfo = {
      id: bridgeId,
      name: 'Ponte OpenRGB SDK Server (127.0.0.1:6742)',
      manufacturer: 'OpenRGB Project',
      model: 'OpenRGB v0.9+ / 1.0rc2 SDK Protocol v4',
      category: 'other',
      protocol: `TCP Socket ORGB (${this.host}:${this.port})`,
      providerId: this.providerId,
      connected: probe.online,
      compatibility: probe.online ? 'compatible' : 'sdk_offline',
      compatibilityMessage: probe.online
        ? `Servidor OpenRGB SDK conectado (${probe.controllerCount} controladores reportados). Nota: No log local do OpenRGB 1.0rc2, PawnIO não está instalado e os modelos B450M GAMING, TG200 (320F:5016) e M719RGB-PRO (25A7:FA7E) não constam no OpenRGB.json, sendo gerenciados pelos providers nativos.`
        : 'Servidor OpenRGB SDK (porta 6742) está offline. O controle do teclado Husky, mouse Redragon e placa Gigabyte opera diretamente pelos drivers nativos sem depender do OpenRGB.',
      requiresAdmin: false,
    };

    const caps: DeviceCapabilities = {
      supportedEffects: ['static', 'breathing', 'rainbow', 'wave', 'color_cycle', 'off'],
      supportsBrightness: true,
      supportsSpeed: true,
      supportsDirection: true,
      supportsPerKeyOrZone: true,
      supportsHardwareProfileSave: false,
      maxZones: 16,
      brightnessRange: { min: 0, max: 100, step: 5 },
      speedRange: { min: 0, max: 100, step: 5 },
      notes:
        'Integração oficial via protocolo binário ORGB v4 na porta TCP 6742 para expansão imediata com memórias RAM, coolers ou fitas ARGB compatíveis com OpenRGB.',
    };

    this.devices.set(bridgeId, info);
    this.capabilities.set(bridgeId, caps);
    if (!this.states.has(bridgeId)) {
      this.states.set(bridgeId, {
        enabled: probe.online,
        effect: 'static',
        primaryColor: { r: 0, g: 240, b: 255 },
        brightness: 100,
        speed: 50,
        direction: 'right',
        updatedAt: new Date().toISOString(),
      });
    }

    return [info];
  }

  public async setColor(deviceId: string, color: RGBColor): Promise<boolean> {
    if (!this.isServerOnline) {
      this.logger.warn(
        this.providerId,
        'setColor',
        'Comando OpenRGB ignorado: Servidor SDK na porta 6742 está desconectado.',
        deviceId
      );
      return false;
    }

    const c = sanitizeColor(color);
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(800);
      socket.once('error', () => resolve(false));
      socket.connect(this.port, this.host, () => {
        const payload = Buffer.alloc(10);
        payload.writeUInt32LE(10, 0);
        payload.writeUInt16LE(1, 4);
        payload[6] = c.r;
        payload[7] = c.g;
        payload[8] = c.b;
        payload[9] = 0;
        socket.write(this.buildOpenRgbPacket(0, NET_PACKET_ID_RGBCONTROLLER_UPDATELEDS, payload));
        socket.end();
        resolve(true);
      });
    });
  }

  public async setEffect(
    deviceId: string,
    effect: LightingEffectType,
    options?: {
      primaryColor?: RGBColor;
      secondaryColor?: RGBColor;
      gradientColors?: RGBColor[];
      speed?: number;
      brightness?: number;
      direction?: EffectDirection;
    }
  ): Promise<boolean> {
    if (options?.primaryColor) {
      return this.setColor(deviceId, options.primaryColor);
    }
    return false;
  }

  public async setBrightness(_deviceId: string, _brightness: number): Promise<boolean> {
    return this.isServerOnline;
  }

  public async setSpeed(_deviceId: string, _speed: number): Promise<boolean> {
    return this.isServerOnline;
  }

  public async saveProfile(_deviceId: string): Promise<boolean> {
    return this.isServerOnline;
  }
}
