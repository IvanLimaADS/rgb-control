import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { RGBColor } from '../shared/types';
import { rgbToGigabyteUInt32, gigabyteUInt32ToRgb } from '../utils/color';

const execFileAsync = promisify(execFile);

export interface HostHardwareSnapshot {
  isAdmin: boolean;
  biosManufacturer: string;
  biosProduct: string;
  biosVersion: string;
  activeHidEnums: string[];
  allHidInterfaces: string[];
  gigabyteRegistry: {
    installed: boolean;
    ledId: number;
    mode: number;
    color: number;
    brightness: number;
    speed: number;
    exePath: string;
  };
  huskySoftwareInstalled: boolean;
  redragonSoftwareInstalled: boolean;
}

export class NativeHardwareBridge {
  private cachedSnapshot: HostHardwareSnapshot | null = null;
  private lastSnapshotTime = 0;

  public async getHostSnapshot(forceRefresh = false): Promise<HostHardwareSnapshot> {
    const now = Date.now();
    if (!forceRefresh && this.cachedSnapshot && now - this.lastSnapshotTime < 4000) {
      return this.cachedSnapshot;
    }

    const defaultSnapshot: HostHardwareSnapshot = {
      isAdmin: false,
      biosManufacturer: 'Gigabyte Technology Co., Ltd.',
      biosProduct: 'B450M GAMING',
      biosVersion: 'F62',
      activeHidEnums: [],
      allHidInterfaces: [],
      gigabyteRegistry: {
        installed: fs.existsSync('C:\\Program Files (x86)\\Gigabyte\\RGBFusion\\LedLib2.dll'),
        ledId: 0x08210001,
        mode: 1,
        color: 0xffff0000,
        brightness: 9,
        speed: 0,
        exePath: 'C:\\Program Files (x86)\\Gigabyte\\RGBFusion\\RGBFusion.exe',
      },
      huskySoftwareInstalled: fs.existsSync(
        'C:\\Program Files (x86)\\Central de Controle Husky\\Products\\TK50S.dll'
      ),
      redragonSoftwareInstalled: fs.existsSync(
        'C:\\Program Files (x86)\\Redragon M719RGB-PRO\\Lowerdev.dll'
      ),
    };

    if (process.platform !== 'win32') {
      this.cachedSnapshot = defaultSnapshot;
      this.lastSnapshotTime = now;
      return defaultSnapshot;
    }

    const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
$isAdmin = $false
try {
  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
} catch {}
$bios = Get-ItemProperty 'HKLM:\\HARDWARE\\DESCRIPTION\\System\\BIOS' -ErrorAction SilentlyContinue
$hidEnum = Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\HidUsb\\Enum' -ErrorAction SilentlyContinue
$activeEnums = @()
if ($hidEnum) {
  for ($i = 0; $i -lt $hidEnum.Count; $i++) {
    $v = $hidEnum."$i"
    if ($v) { $activeEnums += [string]$v }
  }
}
$hidGuid = '{4d1e55b2-f16f-11cf-88cb-001111000030}'
$interfaces = @()
Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\HID' -ErrorAction SilentlyContinue | ForEach-Object {
  $vp = $_.PSChildName
  if ($vp -match '320F|25A7|046D') {
    Get-ChildItem $_.PSPath -ErrorAction SilentlyContinue | ForEach-Object {
      $inst = $_.PSChildName
      $interfaces += "\\\\?\\hid#$($vp.ToLower())#$($inst.ToLower())#$hidGuid"
    }
  }
}
$gbReg = Get-ItemProperty 'HKLM:\\SOFTWARE\\WOW6432Node\\GIGABYTE\\AppCenter\\ApInfo\\RGBFusion' -ErrorAction SilentlyContinue
$ledIdVal = 136380417
$colorVal = 4294901760
$modeVal = 1
$brVal = 9
$spVal = 0
$exeVal = 'C:\\Program Files (x86)\\Gigabyte\\RGBFusion\\RGBFusion.exe'
if ($gbReg) {
  try { if ($null -ne $gbReg.LED_ID) { $ledIdVal = ([int64]$gbReg.LED_ID -band 0xFFFFFFFFL) } } catch {}
  try { if ($null -ne $gbReg.color) { $colorVal = ([int64]$gbReg.color -band 0xFFFFFFFFL) } } catch {}
  try { if ($null -ne $gbReg.Mode) { $modeVal = [int]$gbReg.Mode } } catch {}
  try { if ($null -ne $gbReg.Br) { $brVal = [int]$gbReg.Br } } catch {}
  try { if ($null -ne $gbReg.Sp) { $spVal = [int]$gbReg.Sp } } catch {}
  try { if ($gbReg.Path) { $exeVal = [string]$gbReg.Path } } catch {}
}
$gbObj = @{
  installed = [bool](Test-Path 'C:\\Program Files (x86)\\Gigabyte\\RGBFusion\\LedLib2.dll')
  ledId = $ledIdVal
  mode = $modeVal
  color = $colorVal
  brightness = $brVal
  speed = $spVal
  exePath = $exeVal
}
$result = @{
  isAdmin = [bool]$isAdmin
  biosManufacturer = if ($bios) { [string]$bios.BaseBoardManufacturer } else { 'Gigabyte Technology Co., Ltd.' }
  biosProduct = if ($bios) { [string]$bios.BaseBoardProduct } else { 'B450M GAMING' }
  biosVersion = if ($bios) { [string]$bios.BIOSVersion } else { 'F62' }
  activeHidEnums = $activeEnums
  allHidInterfaces = $interfaces
  gigabyteRegistry = $gbObj
}
$result | ConvertTo-Json -Compress -Depth 4
`;

    try {
      const { stdout } = await execFileAsync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
        { timeout: 12000 }
      );
      if (stdout && stdout.trim()) {
        const parsed = JSON.parse(stdout.trim());
        const snap: HostHardwareSnapshot = {
          ...defaultSnapshot,
          ...parsed,
          activeHidEnums: Array.isArray(parsed.activeHidEnums) ? parsed.activeHidEnums : [],
          allHidInterfaces: Array.isArray(parsed.allHidInterfaces) ? parsed.allHidInterfaces : [],
          gigabyteRegistry: {
            ...defaultSnapshot.gigabyteRegistry,
            ...(parsed.gigabyteRegistry || {}),
          },
        };
        this.cachedSnapshot = snap;
        this.lastSnapshotTime = now;
        return snap;
      }
    } catch {
      // Fallback para valores default
    }

    this.cachedSnapshot = defaultSnapshot;
    this.lastSnapshotTime = now;
    return defaultSnapshot;
  }

  /**
   * Envia pacotes HID de 64 bytes para o Teclado Husky TG200 (VID_320F&PID_5016, MI_01&Col04, UP=0xFF1C, U=0x0092).
   * Conforme engenharia reversa de DeviceBase.dll (UsbHidDeviceBase.ParseDeviceInfo + WsUsbHidDevice.CmdProcess 0x0600028A),
   * o endpoint deve ser aberto com GENERIC_READ | GENERIC_WRITE (0xC0000000) em modo síncrono e receber WriteFile(64B)
   * seguido de ReadFile(64B).
   */
  public async sendHuskyHidPackets(
    packets: Uint8Array[]
  ): Promise<{ success: boolean; method: string; error?: string }> {
    if (process.platform !== 'win32') {
      return { success: false, method: 'none', error: 'Sistema operacional não é Windows.' };
    }

    const hexPackets = packets.map((p) => Buffer.from(p).toString('hex')).join(',');

    const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public class HuskyHidSender {
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern SafeFileHandle CreateFile(string lpFileName, uint dwDesiredAccess, uint dwShareMode, IntPtr lpSecurityAttributes, uint dwCreationDisposition, uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("hid.dll", SetLastError = true)]
    public static extern bool HidD_SetFeature(SafeFileHandle HidDeviceObject, byte[] lpReportBuffer, int ReportBufferLength);

    [DllImport("hid.dll", SetLastError = true)]
    public static extern bool HidD_GetFeature(SafeFileHandle HidDeviceObject, byte[] lpReportBuffer, int ReportBufferLength);

    [DllImport("hid.dll", SetLastError = true)]
    public static extern bool HidD_SetOutputReport(SafeFileHandle HidDeviceObject, byte[] lpReportBuffer, int ReportBufferLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool WriteFile(SafeFileHandle hFile, byte[] lpBuffer, uint nNumberOfBytesToWrite, out uint lpNumberOfBytesWritten, IntPtr lpOverlapped);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool ReadFile(SafeFileHandle hFile, byte[] lpBuffer, uint nNumberOfBytesToRead, out uint lpNumberOfBytesRead, IntPtr lpOverlapped);

    public static string SendToDevice(string[] paths, string[] hexPkts) {
        int lastErr = 0;
        uint[] accessModes = new uint[] { 0xC0000000u, 0x40000000u, 0x0012019Fu, 0u };
        foreach (string path in paths) {
            SafeFileHandle h = null;
            uint usedAccess = 0u;
            foreach (uint acc in accessModes) {
                h = CreateFile(path, acc, 3u, IntPtr.Zero, 3u, 0u, IntPtr.Zero);
                if (h != null && !h.IsInvalid) {
                    usedAccess = acc;
                    break;
                }
            }
            if (h != null && !h.IsInvalid) {
                bool ok = true;
                string methodUsed = "WriteFile+ReadFile";
                foreach (string hex in hexPkts) {
                    byte[] buf = new byte[hex.Length / 2];
                    for (int i = 0; i < buf.Length; i++) buf[i] = Convert.ToByte(hex.Substring(i * 2, 2), 16);
                    uint written = 0;
                    bool sent = false;
                    if (usedAccess != 0u) {
                        sent = WriteFile(h, buf, (uint)buf.Length, out written, IntPtr.Zero);
                        if (sent) {
                            System.Threading.Thread.Sleep(10);
                            if ((usedAccess & 0x80000000u) != 0u) {
                                byte[] readBuf = new byte[buf.Length];
                                uint read = 0;
                                ReadFile(h, readBuf, (uint)readBuf.Length, out read, IntPtr.Zero);
                            }
                        }
                    }
                    if (!sent) {
                        methodUsed = "HidD_SetOutputReport/SetFeature";
                        sent = HidD_SetOutputReport(h, buf, buf.Length) || HidD_SetFeature(h, buf, buf.Length);
                        if (sent) {
                            System.Threading.Thread.Sleep(12);
                            byte[] readBuf = new byte[buf.Length];
                            readBuf[0] = 0x04;
                            HidD_GetFeature(h, readBuf, readBuf.Length);
                        }
                    }
                    if (!sent) {
                        lastErr = Marshal.GetLastWin32Error();
                        ok = false;
                        break;
                    }
                }
                h.Close();
                if (ok) return "OK:" + methodUsed + ":" + path;
            } else {
                int err = Marshal.GetLastWin32Error();
                if (err != 2) lastErr = err;
            }
        }
        return "ERR:" + lastErr;
    }
}
"@
$snapshotPaths = @()
$hidGuid = '{4d1e55b2-f16f-11cf-88cb-001111000030}'
Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\HID' -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -match 'VID_320F&PID_5016&MI_01&Col04' } | ForEach-Object {
  $vp = $_.PSChildName
  Get-ChildItem $_.PSPath -ErrorAction SilentlyContinue | ForEach-Object {
    $snapshotPaths += "\\\\?\\hid#$($vp.ToLower())#$($_.PSChildName.ToLower())#$hidGuid"
  }
}
$pkts = "${hexPackets}".Split(',')
$res = [HuskyHidSender]::SendToDevice($snapshotPaths, $pkts)
Write-Output $res
`;

    try {
      const { stdout } = await execFileAsync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
        { timeout: 12000 }
      );
      const out = (stdout || '').trim();
      if (out.startsWith('OK:')) {
        return { success: true, method: out.slice(3) };
      }
      return {
        success: false,
        method: 'WriteFile',
        error: `Falha ao abrir endpoint HID 0xFF1C:0x0092 (${out})`,
      };
    } catch (err: any) {
      return { success: false, method: 'WriteFile', error: err?.message || String(err) };
    }
  }

  /**
   * Envia HID Feature Reports de 17 bytes (ReportID = 0x08) para o Mouse Redragon M719RGB-PRO (VID_25A7&PID_FA7E, MI_01&Col07, UP=0xFF02, U=0x0002)
   * e realiza leitura de confirmação com ReportID = 0x09 conforme OemDrv.exe (0x41d40).
   */
  public async sendRedragonFeatureReports(
    reports: Uint8Array[]
  ): Promise<{ success: boolean; method: string; error?: string }> {
    if (process.platform !== 'win32') {
      return { success: false, method: 'none', error: 'Sistema operacional não é Windows.' };
    }

    const hexReports = reports.map((r) => Buffer.from(r).toString('hex')).join(',');

    const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public class RedragonHidSender {
    [StructLayout(LayoutKind.Sequential)]
    public struct HIDP_CAPS {
        public ushort Usage;
        public ushort UsagePage;
        public ushort InputReportByteLength;
        public ushort OutputReportByteLength;
        public ushort FeatureReportByteLength;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 17)]
        public ushort[] Reserved;
        public ushort NumberLinkCollectionNodes;
        public ushort NumberInputButtonCaps;
        public ushort NumberInputValueCaps;
        public ushort NumberInputDataIndices;
        public ushort NumberOutputButtonCaps;
        public ushort NumberOutputValueCaps;
        public ushort NumberOutputDataIndices;
        public ushort NumberFeatureButtonCaps;
        public ushort NumberFeatureValueCaps;
        public ushort NumberFeatureDataIndices;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern SafeFileHandle CreateFile(string lpFileName, uint dwDesiredAccess, uint dwShareMode, IntPtr lpSecurityAttributes, uint dwCreationDisposition, uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("hid.dll", SetLastError = true)]
    public static extern bool HidD_GetPreparsedData(SafeFileHandle HidDeviceObject, out IntPtr PreparsedData);

    [DllImport("hid.dll", SetLastError = true)]
    public static extern bool HidD_FreePreparsedData(IntPtr PreparsedData);

    [DllImport("hid.dll", SetLastError = true)]
    public static extern int HidP_GetCaps(IntPtr PreparsedData, out HIDP_CAPS Capabilities);

    [DllImport("hid.dll", SetLastError = true)]
    public static extern bool HidD_SetFeature(SafeFileHandle HidDeviceObject, byte[] lpReportBuffer, int ReportBufferLength);

    [DllImport("hid.dll", SetLastError = true)]
    public static extern bool HidD_GetFeature(SafeFileHandle HidDeviceObject, byte[] lpReportBuffer, int ReportBufferLength);

    public static string SendFeatureReports(string[] paths, string[] hexPkts) {
        int lastErr = 0;
        int successCount = 0;
        string matchedPaths = "";
        string lastRespHex = "";
        uint[] accessModes = new uint[] { 0x0012019Fu, 0xC0000000u, 0x40000000u, 0u };
        foreach (string path in paths) {
            SafeFileHandle h = null;
            foreach (uint acc in accessModes) {
                h = CreateFile(path, acc, 3u, IntPtr.Zero, 3u, 0u, IntPtr.Zero);
                if (h != null && !h.IsInvalid) break;
            }
            if (h != null && !h.IsInvalid) {
                bool isTargetCollection = false;
                ushort up = 0, u = 0, featLen = 0;
                IntPtr ppd;
                if (HidD_GetPreparsedData(h, out ppd)) {
                    HIDP_CAPS caps;
                    if (HidP_GetCaps(ppd, out caps) >= 0) {
                        up = caps.UsagePage;
                        u = caps.Usage;
                        featLen = caps.FeatureReportByteLength;
                        isTargetCollection = (up == 0xFF02 && u == 0x0002) || featLen == 17;
                    }
                    HidD_FreePreparsedData(ppd);
                } else {
                    isTargetCollection = path.ToLower().Contains("col07");
                }
                if (!isTargetCollection) {
                    h.Close();
                    continue;
                }
                bool ok = true;
                foreach (string hex in hexPkts) {
                    byte[] buf = new byte[hex.Length / 2];
                    for (int i = 0; i < buf.Length; i++) buf[i] = Convert.ToByte(hex.Substring(i * 2, 2), 16);
                    bool sent = false;
                    for (int retry = 0; retry < 3; retry++) {
                        if (HidD_SetFeature(h, buf, buf.Length)) {
                            sent = true;
                            break;
                        }
                        lastErr = Marshal.GetLastWin32Error();
                        System.Threading.Thread.Sleep(25);
                    }
                    if (!sent) {
                        ok = false;
                        break;
                    }
                    byte cmdId = buf[1];
                    for (int poll = 0; poll < 8; poll++) {
                        System.Threading.Thread.Sleep(15);
                        byte[] resp = new byte[17];
                        resp[0] = 0x09;
                        if (HidD_GetFeature(h, resp, resp.Length)) {
                            lastRespHex = BitConverter.ToString(resp);
                            if (resp[1] == cmdId) break;
                        } else {
                            resp[0] = 0x08;
                            if (HidD_GetFeature(h, resp, resp.Length)) {
                                lastRespHex = BitConverter.ToString(resp);
                                if (resp[1] == cmdId) break;
                            }
                        }
                    }
                }
                h.Close();
                if (ok) {
                    successCount++;
                    matchedPaths += (matchedPaths.Length > 0 ? ";" : "") + string.Format("{0}(UP=0x{1:X4},U=0x{2:X4},F={3},Resp={4})", path, up, u, featLen, lastRespHex);
                }
            } else {
                int err = Marshal.GetLastWin32Error();
                if (err != 2) lastErr = err;
            }
        }
        if (successCount > 0) return "OK:" + matchedPaths;
        return "ERR:" + lastErr;
    }
}
"@
Stop-Process -Name 'OemDrv' -Force -ErrorAction SilentlyContinue
$snapshotPaths = @()
$hidGuid = '{4d1e55b2-f16f-11cf-88cb-001111000030}'
# Prioriza PID_FAB0 (PID primário no Cfg.ini do M719RGB-PRO) e inclui também PID_FA7E, verificando todas as coleções vendor (Col02..Col07) via HidP_GetCaps (0xFF02:0x0002)
Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\HID' -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -match 'VID_25A7&PID_FAB0&MI_01&Col0(2|5|6|7)' } | ForEach-Object {
  $vp = $_.PSChildName
  Get-ChildItem $_.PSPath -ErrorAction SilentlyContinue | ForEach-Object {
    $snapshotPaths += "\\\\?\\hid#$($vp.ToLower())#$($_.PSChildName.ToLower())#$hidGuid"
  }
}
Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\HID' -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -match 'VID_25A7&PID_FA7E&MI_01&Col0(2|5|6|7)' } | ForEach-Object {
  $vp = $_.PSChildName
  Get-ChildItem $_.PSPath -ErrorAction SilentlyContinue | ForEach-Object {
    $snapshotPaths += "\\\\?\\hid#$($vp.ToLower())#$($_.PSChildName.ToLower())#$hidGuid"
  }
}
$pkts = "${hexReports}".Split(',')
$res = [RedragonHidSender]::SendFeatureReports($snapshotPaths, $pkts)
Write-Output $res
`;

    try {
      const { stdout } = await execFileAsync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
        { timeout: 12000 }
      );
      const out = (stdout || '').trim();
      if (out.startsWith('OK:')) {
        return { success: true, method: `HidD_SetFeature+GetFeature (${out.slice(3)})` };
      }
      return {
        success: false,
        method: 'HidD_SetFeature',
        error: `Falha ao enviar Feature Report 0x08 em 0xFF02:0x0002 (${out})`,
      };
    } catch (err: any) {
      return { success: false, method: 'HidD_SetFeature', error: err?.message || String(err) };
    }
  }

  /**
   * Controla o conector RGB 12V (PH_1 = 0_1_2) da placa-mãe Gigabyte B450M GAMING via ponte 32-bit (SysWOW64)
   * usando LedLib2.LedObject (SetRGBStrip, esy_SetColor_v4, SetLedMode_v4 e ApplyAll_v4).
   */
  public async applyGigabyteMotherboardLighting(params: {
    mode: number;
    color: RGBColor;
    brightness: number; // 0..9 na escala do RGB Fusion
    speed: number;      // 0..5 na escala do RGB Fusion
  }): Promise<{ success: boolean; error?: string }> {
    const x86Powershell = 'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe';
    if (!fs.existsSync(x86Powershell)) {
      return {
        success: false,
        error: 'PowerShell 32-bit (SysWOW64) não encontrado para carregar LedLib2.dll.',
      };
    }

    // Mapeia modo para enum LedLib2.LedMode (Off=0, StillMode=2, BreathMode=3, AutoMode=5, FlashMode=6)
    let ledModeEnum = 2; // StillMode
    if (params.mode === 0 || params.brightness === 0) ledModeEnum = 0; // Off
    else if (params.mode === 1) ledModeEnum = 2; // StillMode
    else if (params.mode === 2) ledModeEnum = 3; // BreathMode
    else if (params.mode === 3) ledModeEnum = 6; // FlashMode
    else if (params.mode === 4) ledModeEnum = 5; // AutoMode (Color Cycle)

    // No conector RGB 12V da B450M GAMING (monoPaltform = A_B450_Mono = 6, PH_1 = 0_1_2),
    // SetRGBStrip(R, G, B) aciona os 3 pinos GPIO com (R != 0), (G != 0), (B != 0).
    // Aplicamos limiar (threshold >= 45% do canal dominante) para que cores escolhidas na roda 2D
    // com canais secundários residuais baixos (ex: R=255, G=15, B=10) acionem exatamente a cor desejada no conector RGB.
    const isOff = ledModeEnum === 0;
    const maxCh = Math.max(params.color.r, params.color.g, params.color.b);
    const threshold = Math.max(1, Math.round(maxCh * 0.45));
    const rStrip = isOff || maxCh === 0 ? 0 : params.color.r >= threshold ? 255 : 0;
    const gStrip = isOff || maxCh === 0 ? 0 : params.color.g >= threshold ? 255 : 0;
    const bStrip = isOff || maxCh === 0 ? 0 : params.color.b >= threshold ? 255 : 0;

    const ledSpeedV4 = Math.max(0, Math.min(2, Math.round((params.speed / 5) * 2)));
    const uintColor = rgbToGigabyteUInt32({ r: rStrip, g: gStrip, b: bStrip });

    const ps32Script = `
$ErrorActionPreference = 'Stop'
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Output "ERR:ADMIN_REQUIRED"
  exit 0
}
Stop-Process -Name 'RGBFusion','SelLedV2' -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 100
$gbDir = 'C:\\Program Files (x86)\\Gigabyte\\RGBFusion'
Set-Location $gbDir
[System.IO.Directory]::SetCurrentDirectory($gbDir)
$env:PATH = "$gbDir;$env:PATH"
Add-Type -AssemblyName System.Drawing
$asm = [System.Reflection.Assembly]::LoadFrom("$gbDir\\LedLib2.dll")
$ledObj = New-Object LedLib2.LedObject
$bf = [System.Reflection.BindingFlags]'Public,NonPublic,Instance'
if (-not $ledObj.bInitSucc) {
  $initRes = $ledObj.GetType().GetMethod('Initial_v4', $bf).Invoke($ledObj, @())
} else {
  $initRes = $true
}
if (-not $ledObj.bInitSucc) {
  Write-Output "ERR:Initial_v4=$($initRes) bInitSucc=false (driver SMBus GVCIDrv64.sys indisponivel)"
  exit 0
}
try { $ledObj.LoadRgbStripPDef() | Out-Null } catch {}
$ledObj.SetLedBrightness([int]${params.brightness}) | Out-Null
try { $ledObj.LedSpeed = [LedLib2.LED_SPEED][int]${ledSpeedV4} } catch {}
$modeVal = [Enum]::ToObject($asm.GetType('LedLib2.LedMode'), [int]${ledModeEnum})
$ledObj.SetLedMode_v4($true, 0, 0, $modeVal) | Out-Null
$col = [System.Drawing.Color]::FromArgb(255, [int]${rStrip}, [int]${gStrip}, [int]${bStrip})
$ledObj.esy_SetColor_v4($col, $false) | Out-Null
$applyRes = $ledObj.ApplyAll_v4()
$stripRes = $ledObj.SetRGBStrip([int]${rStrip}, [int]${gStrip}, [int]${bStrip})
try {
  $regDwordColor = [BitConverter]::ToInt32([BitConverter]::GetBytes([uint32]${uintColor}), 0)
  Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\WOW6432Node\\GIGABYTE\\AppCenter\\ApInfo\\RGBFusion' -Name 'color' -Value $regDwordColor -ErrorAction SilentlyContinue
  Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\WOW6432Node\\GIGABYTE\\AppCenter\\ApInfo\\RGBFusion' -Name 'Mode' -Value ([int]${params.mode}) -ErrorAction SilentlyContinue
  Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\WOW6432Node\\GIGABYTE\\AppCenter\\ApInfo\\RGBFusion' -Name 'Br' -Value ([int]${params.brightness}) -ErrorAction SilentlyContinue
  Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\WOW6432Node\\GIGABYTE\\AppCenter\\ApInfo\\RGBFusion' -Name 'Sp' -Value ([int]${params.speed}) -ErrorAction SilentlyContinue
} catch {}
Write-Output "OK:init=$($initRes):apply=$($applyRes):strip=$($stripRes):RGB=(${rStrip},${gStrip},${bStrip})"
`;

    try {
      const { stdout } = await execFileAsync(
        x86Powershell,
        ['-NoProfile', '-NonInteractive', '-Command', ps32Script],
        { timeout: 10000 }
      );
      const out = (stdout || '').trim();
      if (out.includes('OK:')) {
        return { success: true };
      }
      if (out.includes('ERR:ADMIN_REQUIRED')) {
        return {
          success: false,
          error:
            'Privilégios de Administrador são obrigatórios para inicializar o driver kernel SMBus GVCIDrv64.sys (Erro Win32 4317 sem elevação). Execute o RGB Control Center como Administrador.',
        };
      }
      return { success: false, error: `Retorno de LedLib2.dll: ${out}` };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  public parseGigabyteRegistryColor(colorVal: number): RGBColor {
    return gigabyteUInt32ToRgb(colorVal);
  }
}
