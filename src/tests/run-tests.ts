import assert from 'assert';
import path from 'path';
import fs from 'fs';
import {
  applyHuskyPacketChecksum,
  computeRedragonComplement55,
  finalizeRedragonFeatureReport,
} from '../utils/checksum';
import { hexToRgb, rgbToHex, rgbToGigabyteUInt32, gigabyteUInt32ToRgb } from '../utils/color';
import { HardwareSafetyValidator } from '../core/HardwareSafetyValidator';
import { EffectEngine } from '../effects/EffectEngine';
import { DatabaseManager } from '../database/DatabaseManager';
import { LoggerService } from '../services/LoggerService';
import { ConflictDetector } from '../core/ConflictDetector';
import { NativeHardwareBridge } from '../providers/NativeHardwareBridge';
import { HuskyProvider } from '../providers/HuskyProvider';
import { RedragonProvider } from '../providers/RedragonProvider';
import { GigabyteProvider } from '../providers/GigabyteProvider';
import { OpenRGBProvider } from '../providers/OpenRGBProvider';
import { UnsupportedHidProvider } from '../providers/UnsupportedHidProvider';
import { DeviceManager } from '../core/DeviceManager';
import { ProfileManager } from '../profiles/ProfileManager';
import { StateRestoreService } from '../services/StateRestoreService';

async function runAllTests() {
  console.log('=== Iniciando Suite de Testes do RGB Control Center (Fase 6) ===\n');

  // 1. Teste de Checksum e Estrutura de Pacotes Husky TG200 (EVision/Sonix 64B)
  const validator = new HardwareSafetyValidator();
  const effectEngine = new EffectEngine();
  const tempDbDir = path.join(process.cwd(), '.test-data-' + Date.now());
  const db = new DatabaseManager(tempDbDir);
  const logger = new LoggerService(db);
  const conflictDetector = new ConflictDetector();
  const bridge = new NativeHardwareBridge();

  const huskyProvider = new HuskyProvider(logger, validator, bridge, conflictDetector);
  const huskyPkts = huskyProvider.buildHuskyEffectPackets({
    enabled: true,
    effect: 'wave',
    primaryColor: { r: 0, g: 240, b: 255 },
    brightness: 100,
    speed: 75,
    direction: 'right',
    updatedAt: new Date().toISOString(),
  });

  assert.strictEqual(huskyPkts.length, 1, 'Husky deve gerar 1 pacote SetLedEffectV102 de 64 bytes');
  assert.strictEqual(huskyPkts[0].length, 64, 'Pacote Husky deve ter exatamente 64 bytes');
  assert.strictEqual(huskyPkts[0][0], 0x04, 'Report ID Husky deve ser 0x04');
  assert.strictEqual(huskyPkts[0][3], 0x06, 'Comando SetLedEffectV102 Husky deve ser 0x06');
  assert.strictEqual(huskyPkts[0][4], 0x38, 'Tamanho do payload Husky deve ser 0x38 (56)');
  assert.strictEqual(huskyPkts[0][7], 0x55, 'Assinatura Husky em pkt[7] deve ser 0x55');
  assert.strictEqual(huskyPkts[0][9], 0x00, 'Modo Wave em V102 deve ser pkt[9] = 0x00');
  assert.strictEqual(huskyPkts[0][10], 4, 'Brilho 100% em V102 deve ser pkt[10] = 4 (escala 0..4)');
  assert.strictEqual(validator.validateHuskyPacket(huskyPkts[0]).valid, true, 'Pacote Husky SetLedEffectV102 deve passar no validador de segurança');
  console.log('[PASS] 1. Protocolo HID Husky TG200 (VID_320F&PID_5016) - 64B & Checksum 16-bit LE validados.');

  // 2. Teste de Feature Report e Checksum Complemento 0x55 Redragon M719RGB-PRO (17B)
  const redragonProvider = new RedragonProvider(logger, validator, bridge, conflictDetector);
  const redragonReports = redragonProvider.buildRedragonLightingReports({
    enabled: true,
    effect: 'static',
    primaryColor: { r: 255, g: 0, b: 64 },
    brightness: 100,
    speed: 60,
    direction: 'right',
    updatedAt: new Date().toISOString(),
  });

  assert.strictEqual(redragonReports.length, 5, 'Redragon deve gerar 5 Feature Reports seguros (MainRGB 0x00A0 + DpiRGB 0x004C + Apply 0x09 + TellDrvStatus)');
  assert.strictEqual(redragonReports[0].length, 17, 'Feature Report Redragon deve ter 17 bytes');
  assert.strictEqual(redragonReports[0][0], 0x08, 'Report ID Redragon deve ser 0x08');
  assert.strictEqual(redragonReports[0][1], 0x07, 'Comando WriteEEPROM deve ser 0x07');
  assert.strictEqual(redragonReports[0][2], 0x00, 'Byte reservado pkt[1] em WriteEEPROM deve ser 0x00');
  assert.strictEqual(redragonReports[0][3], 0x00, 'Endereço EEPROM MSB deve ser 0x00');
  assert.strictEqual(redragonReports[0][4], 0xa0, 'Endereço EEPROM LSB MainRGB deve ser 0xA0 (0x00A0)');
  assert.strictEqual(redragonReports[0][5], 0x07, 'Tamanho da struct MainRGB deve ser 7 bytes');
  assert.strictEqual(redragonReports[0][6], 0x02, 'Byte 0 da struct MainRGB deve ser Mode=0x02 (Steady)');
  assert.strictEqual(redragonReports[0][7], 255, 'Byte 1 da struct MainRGB deve ser R=255');
  assert.strictEqual(redragonReports[1][4], 0x4c, 'Segundo Feature Report deve configurar DpiRGB em 0x004C');
  for (let i = 0; i < redragonReports.length; i++) {
    assert.strictEqual(
      validator.validateRedragonPacket(redragonReports[i]).valid,
      true,
      `Feature Report Redragon #${i} deve passar no validador CRC 0x55`
    );
  }

  // Teste de bloqueio de endereço de memória/registrador não documentado no Redragon
  const forbiddenPkt = new Uint8Array(17);
  forbiddenPkt[0] = 0x08;
  forbiddenPkt[1] = 0x07;
  forbiddenPkt[2] = 0x00;
  forbiddenPkt[3] = 0x09; // Endereço arbitrário fora da tabela de LEDs
  forbiddenPkt[4] = 0xff;
  finalizeRedragonFeatureReport(forbiddenPkt);
  assert.strictEqual(
    validator.validateRedragonPacket(forbiddenPkt).valid,
    false,
    'Validador deve bloquear escrita em endereço EEPROM não pertencente à iluminação'
  );
  // Teste de fila serializada (Mutex assíncrono sem erro de dispositivo ocupado em chamadas concorrentes)
  const lockOrder: number[] = [];
  await Promise.all([
    validator.withDeviceLock('gigabyte-b450m-gaming', async () => {
      await new Promise((r) => setTimeout(r, 40));
      lockOrder.push(1);
    }),
    validator.withDeviceLock('gigabyte-b450m-gaming', async () => {
      await new Promise((r) => setTimeout(r, 10));
      lockOrder.push(2);
    }),
    validator.withDeviceLock('gigabyte-b450m-gaming', async () => {
      lockOrder.push(3);
    }),
  ]);
  assert.deepStrictEqual(
    lockOrder,
    [1, 2, 3],
    'withDeviceLock deve enfileirar e serializar chamadas concorrentes na ordem exata sem lançar erro de dispositivo ocupado'
  );
  console.log('[PASS] 2. Protocolo HID Redragon M719RGB-PRO (VID_25A7&PID_FA7E) - 17B Feature Report, Proteção de EEPROM e Fila Mutex validados.');

  // 3. Teste de Conversão de Cores e Registro Gigabyte
  const hex = rgbToHex({ r: 0, g: 240, b: 255 });
  assert.strictEqual(hex, '#00F0FF');
  const parsedRgb = hexToRgb('#7C3AED');
  assert.deepStrictEqual(parsedRgb, { r: 124, g: 58, b: 237 });
  const gbUint = rgbToGigabyteUInt32({ r: 255, g: 0, b: 0 });
  assert.strictEqual(gbUint, 0xffff0000);
  assert.deepStrictEqual(gigabyteUInt32ToRgb(gbUint), { r: 255, g: 0, b: 0 });
  console.log('[PASS] 3. Utilitários RGB/HEX e codificação 32-bit Gigabyte RGB Fusion validados.');

  // 4. Teste de Descoberta de Dispositivos, Matriz de Compatibilidade e Tratamento de Incompatíveis
  const gigabyteProvider = new GigabyteProvider(logger, validator, bridge, conflictDetector);
  const openRgbProvider = new OpenRGBProvider(logger, validator);
  const unsupportedProvider = new UnsupportedHidProvider(logger, validator, bridge);

  const deviceManager = new DeviceManager(db, effectEngine, logger);
  deviceManager.registerProvider(gigabyteProvider);
  deviceManager.registerProvider(huskyProvider);
  deviceManager.registerProvider(redragonProvider);
  deviceManager.registerProvider(openRgbProvider);
  deviceManager.registerProvider(unsupportedProvider);

  const discovered = await deviceManager.discoverAllDevices();
  assert.ok(discovered.length >= 4, 'Deve descobrir Gigabyte, Husky, Redragon e Ponte OpenRGB');
  const matrix = deviceManager.getCompatibilityMatrix();
  assert.strictEqual(matrix.length, 5, 'Matriz de compatibilidade deve conter os 5 itens analisados');
  console.log(`[PASS] 4. Descoberta modular concluída (${discovered.length} dispositivos identificados no host).`);

  // 5. Teste de Sincronização Global (Sync RGB) com Exceções
  const syncResult = await deviceManager.applyGlobalSync({
    enabled: true,
    effect: 'breathing',
    primaryColor: { r: 16, g: 185, b: 129 },
    secondaryColor: { r: 0, g: 240, b: 255 },
    brightness: 80,
    speed: 50,
    direction: 'right',
    includedDeviceIds: [
      'husky-tg200-320f-5016',
      'redragon-m719rgb-25a7-fa7e',
      'gigabyte-b450m-gaming',
    ],
    excludedDeviceIds: ['redragon-m719rgb-25a7-fa7e'], // Mouse definido como exceção!
  });
  assert.ok(
    syncResult.skippedExceptions.includes('redragon-m719rgb-25a7-fa7e'),
    'Sync RGB deve respeitar a lista de exceções'
  );
  console.log('[PASS] 5. Sincronização Global (Sync RGB) e sistema de exceções validados.');

  // 6. Teste de Perfis Personalizados, Persistência SQLite e Restauração na Inicialização
  const profileManager = new ProfileManager(db, deviceManager, logger);
  const initialProfiles = profileManager.listProfiles();
  assert.strictEqual(initialProfiles.length, 5, 'Deve inicializar com os 5 perfis padrão (Gaming, Work, Night, Static, Custom)');

  const customProfile = await profileManager.createProfileFromCurrentState(
    'Perfil Teste Automatizado',
    'Criado durante a bateria de testes da Fase 6'
  );
  assert.ok(customProfile.id.startsWith('profile-user-'));

  const dupProfile = profileManager.duplicateProfile(customProfile.id);
  assert.ok(dupProfile && dupProfile.name.includes('(Cópia)'));

  const restoreService = new StateRestoreService(db, deviceManager, profileManager, logger);
  await restoreService.restoreOnStartup();

  const deleted = profileManager.deleteProfile(customProfile.id);
  assert.strictEqual(deleted, true, 'Deve excluir perfil criado pelo usuário');
  assert.strictEqual(
    profileManager.deleteProfile('profile-gaming'),
    false,
    'Não deve permitir excluir perfil padrão embutido'
  );
  console.log('[PASS] 6. Gerenciamento de Perfis, Persistência SQLite e Restauração de Inicialização validados.');

  // Limpa diretório temporário de teste
  try {
    fs.rmSync(tempDbDir, { recursive: true, force: true });
  } catch {
    // Ignora
  }

  console.log('\n=== TODOS OS TESTES PASSARAM COM SUCESSO! ===');
}

runAllTests().catch((err) => {
  console.error('Falha nos testes:', err);
  process.exit(1);
});
