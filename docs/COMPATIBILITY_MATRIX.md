# Diagnóstico de Hardware e Matriz de Compatibilidade (Fase 1)

Este documento registra a investigação real de hardware realizada na máquina host para fundamentar a arquitetura de drivers do **RGB Control Center**.

---

## 1. Modelos Exatos Identificados no Sistema

A inspeção dos barramentos `HKLM\SYSTEM\CurrentControlSet\Services\HidUsb\Enum`, `HKLM\SYSTEM\CurrentControlSet\Enum\HID` e `HKLM\HARDWARE\DESCRIPTION\System\BIOS` revelou os seguintes equipamentos conectados:

| Componente | Fabricante | Modelo Identificado | Identificadores de Hardware |
|---|---|---|---|
| **Placa-mãe** | Gigabyte Technology Co., Ltd. | **B450M GAMING** (BIOS versão `F62`) | Controlador SMBus Onboard ITE `LED_V4` (`LED_ID = 0x08210001`) |
| **Teclado** | Husky Gaming (OEM EVision / Sonix) | **Husky Hailstorm 65% RGB (`TG200` / `TK50S`)** | `USB\VID_320F&PID_5016` (Interface de controle: `MI_01&Col04`, `UP:0xFF1C`, `U:0x0092`) |
| **Mouse** | Redragon (OEM Compx / Eastern Times Tech) | **Redragon Invader `M719RGB-PRO`** (Sensor PixArt `PMW3325`) | `USB\VID_25A7&PID_FA7E` e `PID_FAB0` (Interface de controle: `MI_01&Col07`, `UP:0xFF02`, `U:0x0002`) |
| **Headset (Extra)** | Logitech | **G325 Lightspeed Wireless Gaming Headset** | `USB\VID_046D&PID_0B21` (Sem LEDs RGB controláveis) |
| **Receptor (Extra)** | Logitech | **USB Unifying Receiver** | `USB\VID_046D&PID_C52B` (Sem LEDs RGB controláveis) |

---

## 2. Avaliação do OpenRGB Nesta Máquina

Foram analisados os arquivos de configuração e logs do **OpenRGB v0.9+ (1.0rc2)** instalados em `C:\Users\teste\AppData\Roaming\OpenRGB\`:

1. **Driver SMBus (`PawnIO`):** O log `OpenRGB_20260322_190841.log` registra `ERROR: Could not open PawnIO, PawnIO initialization aborted`. O OpenRGB 1.0rc2 substituiu o driver `WinRing0` pelo `PawnIO`, que não está instalado no sistema, impedindo qualquer varredura SMBus pelo OpenRGB.
2. **Placa-mãe Gigabyte B450M GAMING:** Mesmo com SMBus ativo, a lista de detectores `Gigabyte RGB Fusion 2 SMBus` do OpenRGB inclui placas `B450 AORUS` e `B450M DS3H`, mas **não inclui** o string de placa `B450M GAMING`.
3. **Teclado Husky `TG200` (`320F:5016`):** O detector `EVision Keyboard` do OpenRGB contempla os PIDs `0x5000`, `0x502A`, `0x505B`, `0x5064`, `0x5078` e `0x5084`, mas **não possui suporte** ao PID `0x5016`.
4. **Mouse Redragon `M719RGB-PRO` (`25A7:FA7E`):** O detector de mouses Redragon do OpenRGB não inclui o PID `0xFA7E` (nem `0xFAB0`).

**Decisão Arquitetural:**
- Implementar o `OpenRGBProvider` (cliente TCP na porta `6742`) para permitir integração imediata caso o usuário adicione memórias RAM ou coolers suportados pelo OpenRGB no futuro.
- Implementar **Providers Nativos dedicados** (`HuskyProvider`, `RedragonProvider` e `GigabyteProvider`) falando diretamente os protocolos reais de cada fabricante.

---

## 3. Protocolos de Comunicação Mapeados

### 3.1. Teclado Husky `TG200` (`VID_320F&PID_5016`)
- **Software Oficial Analisado:** `C:\Program Files (x86)\Central de Controle Husky\` (`config.ini` -> `Device=320F5016_TG200`, assemblies `.NET` `DeviceBase.dll` e `Products\TK50S.dll`).
- **Endpoint HID:** `UsagePage = 0xFF1C`, `Usage = 0x0092` (`HID\VID_320F&PID_5016&MI_01&Col04`).
- **Estrutura do Pacote (`64` bytes):**
  - `pkt[0] = 0x04` (`REPORT_ID`)
  - `pkt[1..2]` = Checksum 16-bit Little-Endian (soma simples de `pkt[3..63]`)
  - `pkt[3] = 0x1C` (Comando de escrita de bloco)
  - `pkt[4] = 0x38` (56 bytes de payload)
  - `pkt[5..6] = 0x55, 0x03` (Endereço base `0x0355` + `64 * profileId`)
  - `pkt[9]` = Código de efeito em firmware (`0x00` Static, `0x02` Breathing, `0x03` Color Cycle/Neon, `0x05` Wave/Rainbow, `0x06` Ripple/Strobing, `0x0A` SineWave/Gradient, `0x0B` Follow/Reactive, `0x12` Custom, `0x13` Off)
  - `pkt[10]` = Brilho (`0, 64, 128, 192, 255`)
  - `pkt[11]` = Velocidade (`4 - speed`, de `0` a `4`)
  - `pkt[12]` = Direção (`0` ou `1`)
  - `pkt[13]` = Flag de cor (`0` = multicolor/arco-íris, `1` = cor RGB definida)
  - `pkt[14..16]` = `R`, `G`, `B` (`0..255`)
  - Seguido pelo pacote de aplicação/commit: `pkt[0]=0x04, pkt[3]=0x06, pkt[4]=0x04` com checksum em `pkt[1..2]`.

### 3.2. Mouse Redragon `M719RGB-PRO` (`VID_25A7&PID_FA7E`)
- **Software Oficial Analisado:** `C:\Program Files (x86)\Redragon M719RGB-PRO\` (`OemDrv.exe`, `Lowerdev.dll`, `Cfg.ini`).
- **Endpoint HID:** `UsagePage = 0xFF02`, `Usage = 0x0002` (`HID\VID_25A7&PID_FA7E&MI_01&Col07`).
- **Transporte:** HID Feature Report de `17` bytes (`ReportID = 0x08`) via `HidD_SetFeature`.
- **Regra de Checksum (`0x42400` em `OemDrv.exe`):** Complemento para `0x55`: `(0x55 - sum(bytes)) & 0xFF`.
- **Estrutura de Escrita de Iluminação (`WriteEEPROM` em `0x00A0` + `SendCMD(0x09)`):**
  1. **Pacote 1 (`WriteEEPROM`):**
     - `pkt[0] = 0x08` (Report ID)
     - `pkt[1] = 0x07` (Comando `WriteEEPROM`)
     - `pkt[2..3] = 0x00, 0xA0` (Endereço `0x00A0` = `MainRGB`)
     - `pkt[4] = 0x07` (Tamanho = 7 bytes)
     - `pkt[5..7]` = `R`, `G`, `B`
     - `pkt[8]` = Brilho (`0` desligado, `1..3` níveis de intensidade)
     - `pkt[9]` = Modo (`0x02` Steady/Static, `0x01` Respiration/Breathing, `0x00` Neon/Color Cycle, `0x04` Streaming/Wave)
     - `pkt[10]` = Velocidade (`1..5`)
     - `pkt[11]` = Checksum do bloco EEPROM: `(0x55 - sum(pkt[5..10])) & 0xFF`
     - `pkt[16]` = Checksum do pacote HID: `(0x55 - sum(pkt[0..15])) & 0xFF`
  2. **Pacote 2 (`SendCMD(0x09, 0)`):**
     - `[0x08, 0x09, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x44]` para aplicar as alterações imediatamente no controlador do mouse.

### 3.3. Placa-Mãe Gigabyte `B450M GAMING`
- **Software Oficial Analisado:** `C:\Program Files (x86)\Gigabyte\RGBFusion\` (`LedLib2.dll`, `SMBCtrl.dll`, `GvLedLib.dll`, `GVCIDrv64.sys`).
- **Limitação de Hardware:** A `B450M GAMING` possui header RGB 12V GRB analógico (zona única), controlado pelo MCU onboard `LED_V4` (`0x08210001`). Não suporta efeitos ARGB endereçáveis individualmente por LED (como Wave/Rainbow multi-LED).
- **Requisito de Segurança/Permissão:** O driver kernel `GVCIDrv64.sys` exige privilégios de **Administrador** (retorna erro Win32 `4317` `ERROR_INVALID_OPERATION` quando chamado por processo não-elevado). O `GigabyteProvider` verifica se o processo está elevado antes de invocar a ponte 32-bit e informa claramente o usuário quando está em modo somente-leitura, oferecendo botão de elevação UAC sob demanda.
