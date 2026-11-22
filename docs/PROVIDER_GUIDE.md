# Guia para Adicionar Novos Fabricantes (Providers)

A arquitetura do **RGB Control Center** foi projetada para permitir a adição de novos fabricantes e periféricos sem modificar o núcleo da aplicação (`DeviceManager`, `ProfileManager`, `EffectEngine` ou a interface React).

---

## Passo 1: Criar a Classe do Provider em `src/providers/`

Crie um novo arquivo em `src/providers/NomeFabricanteProvider.ts` estendendo `BaseProvider` (que implementa `IDeviceProvider`):

```typescript
import { BaseProvider } from './BaseProvider';
import {
  DeviceCapabilities,
  DeviceInfo,
  EffectDirection,
  LightingEffectType,
  RGBColor,
} from '../shared/types';

export class MeuFabricanteProvider extends BaseProvider {
  public readonly providerId = 'meu-fabricante-hid';
  public readonly providerName = 'Meu Fabricante RGB Provider';

  public async discoverDevices(): Promise<DeviceInfo[]> {
    // 1. Verifique se o dispositivo está conectado via USB/HID ou SDK
    // 2. Popule this.devices, this.capabilities e this.states
    return Array.from(this.devices.values());
  }

  public async setColor(deviceId: string, color: RGBColor): Promise<boolean> {
    // Envie o pacote validado para o hardware
    return true;
  }

  public async setEffect(
    deviceId: string,
    effect: LightingEffectType,
    options?: {
      primaryColor?: RGBColor;
      secondaryColor?: RGBColor;
      speed?: number;
      brightness?: number;
      direction?: EffectDirection;
    }
  ): Promise<boolean> {
    return true;
  }

  public async setBrightness(deviceId: string, brightness: number): Promise<boolean> {
    return true;
  }

  public async setSpeed(deviceId: string, speed: number): Promise<boolean> {
    return true;
  }

  public async saveProfile(deviceId: string): Promise<boolean> {
    return true;
  }
}
```

---

## Passo 2: Adicionar Regras de Validação e Conflitos (Opcional, Recomendado)

1. Em [`src/core/ConflictDetector.ts`](../src/core/ConflictDetector.ts), adicione o nome do executável oficial do fabricante à lista `KNOWN_CONFLICTING_PROCESSES` para impedir acesso simultâneo ao mesmo dispositivo.
2. Em [`src/core/HardwareSafetyValidator.ts`](../src/core/HardwareSafetyValidator.ts), adicione uma função de validação de tamanho de pacote e checksum antes do envio.

---

## Passo 3: Registrar o Provider na Inicialização

Em [`src/main/index.ts`](../src/main/index.ts), instancie e registre o novo provider no `DeviceManager`:

```typescript
const meuProvider = new MeuFabricanteProvider(logger, validator);
deviceManager.registerProvider(meuProvider);
```

Pronto! O novo dispositivo aparecerá automaticamente no **Dashboard**, na aba **Dispositivos**, no **Editor Visual de Iluminação**, no **Sync RGB Global** (com suporte a exceções) e no sistema de **Perfis Personalizados**.
