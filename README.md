# RGB Control Center

Aplicativo desktop modular para Windows desenvolvido para centralizar, configurar, sincronizar e gerenciar dispositivos e componentes de iluminação RGB/ARGB de diferentes fabricantes em uma única interface.

---

## 1. Hardware Diagnosticado e Suportado Nesta Máquina

Durante a **Fase 1 (Diagnóstico e Compatibilidade)**, os dispositivos reais conectados ao computador foram enumerados via barramentos USB/HID e SMBus/BIOS, e seus protocolos nativos foram mapeados:

| Componente | Fabricante | Modelo Identificado | VID / PID / Endereço | Protocolo de Controle | Status de Integração |
|---|---|---|---|---|---|
| **Placa-mãe** | Gigabyte | `B450M GAMING` (BIOS `F62`) | SMBus MCU `0x08210001` (`ITE 048D:8297`) | Ponte 32-bit `LedLib2.dll` / `SMBCtrl.dll` (`GVCIDrv64.sys`) + Registro RGB Fusion | **Suportado** (Requer privilégio de Administrador para escrita SMBus) |
| **Teclado** | Husky Gaming (EVision/Sonix OEM) | `TG200` (Hailstorm 65% RGB / `TK50S`) | `VID_320F` & `PID_5016` (`MI_01&Col04`) | USB HID Custom Report 64 Bytes (`UsagePage 0xFF1C`, `Usage 0x0092`, `ReportID 0x04`) | **Compatível (Nativo)** |
| **Mouse** | Redragon (Compx OEM) | `M719RGB-PRO` Invader (`PMW3325`) | `VID_25A7` & `PID_FA7E` / `PID_FAB0` (`MI_01&Col07`) | USB HID Feature Report 17 Bytes (`UsagePage 0xFF02`, `Usage 0x0002`, `ReportID 0x08`) | **Compatível (Nativo)** |
| **Ponte Externa** | OpenRGB Project | `OpenRGB SDK Server v4` | `TCP 127.0.0.1:6742` | Protocolo binário `ORGB` v4 | **Integrado** (Para expansão futura de RAM/Coolers) |
| **Headset** | Logitech | `G325 Lightspeed` | `VID_046D` & `PID_0B21` | USB Audio / HID Consumer | **Sem Suporte RGB** (Informado com transparência na UI) |

> Para detalhes completos dos pacotes HID, endereços EEPROM e por que o OpenRGB `1.0rc2` não detectou diretamente os 3 periféricos nesta máquina, consulte [`docs/COMPATIBILITY_MATRIX.md`](docs/COMPATIBILITY_MATRIX.md).

---

## 2. Stack Tecnológica

- **Desktop Runtime:** Electron (`src/main`)
- **Interface Gráfica:** React 18 + Tailwind CSS (`src/renderer`)
- **Tipagem:** TypeScript (`src/shared`)
- **Gerenciamento de Estado:** Zustand (`src/renderer/store/useRgbStore.ts`)
- **Persistência Local:** SQLite nativo (`node:sqlite` com fallback transacional em `src/database/DatabaseManager.ts`)
- **Comunicação Nativa:** IPC seguro (`contextBridge`), Win32 HID (`hid.dll` / `kernel32.dll`), Ponte SMBus 32-bit (`LedLib2.dll`) e Cliente TCP OpenRGB SDK (`127.0.0.1:6742`).

---

## 3. Organização Modular do Projeto

```text
src/
├── main/        # Processo principal do Electron, IPC handlers e preload seguro
├── renderer/    # Interface React Dark Mode (Dashboard, Dispositivos, Editor, Sync RGB, Perfis, Matriz, Logs)
├── shared/      # Tipos, contratos, canais IPC e interface padrão IDeviceProvider
├── core/        # DeviceManager central, ConflictDetector e HardwareSafetyValidator
├── providers/   # Adaptadores modulares (GigabyteProvider, HuskyProvider, RedragonProvider, OpenRGBProvider, UnsupportedHidProvider)
├── profiles/    # ProfileManager (Gaming, Work, Night, Static, Custom + CRUD)
├── effects/     # EffectEngine (Static, Gradient, Rainbow, Breathing, Wave, Color Cycle, Reactive, Strobing, Custom)
├── database/    # DatabaseManager (Persistência SQLite local)
├── services/    # AutoStartService, TrayService, LoggerService, StateRestoreService
├── utils/       # Conversores RGB/HEX e calculadoras de checksum (16-bit LE e complemento 0x55)
└── tests/       # Suite automatizada de testes de protocolo, segurança e persistência
```

---

## 4. Como Executar e Gerar o Instalador

### Instalar dependências
```bash
npm install
```

### Executar a bateria de testes (Fase 6)
```bash
npm run build
npm test
```

### Iniciar o aplicativo Desktop
```bash
npm start
```

### Gerar pacote e instalador para Windows (`.exe` NSIS / `.zip`)
```bash
npm run dist:win
npm run dist:installer
```

---

## 5. Documentação Adicional

- [Arquitetura do Sistema (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md)
- [Matriz de Compatibilidade e Diagnóstico de Hardware (`docs/COMPATIBILITY_MATRIX.md`)](docs/COMPATIBILITY_MATRIX.md)
- [Guia para Adicionar Novos Fabricantes (`docs/PROVIDER_GUIDE.md`)](docs/PROVIDER_GUIDE.md)
