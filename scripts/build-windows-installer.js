const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = process.cwd();
const releaseDir = path.join(rootDir, 'release');
const portableDir = path.join(releaseDir, 'RGB-Control-Center-win32-x64');

console.log('=== Gerando Pacote e Cliente de Instalação Windows (RGB Control Center v1.0.0) ===');

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}
fs.mkdirSync(portableDir, { recursive: true });

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    try {
      fs.copyFileSync(src, dest);
    } catch (err) {
      console.warn(`[WARN] Não foi possível sobrescrever ${dest}: ${err.message}`);
    }
  }
}

// Copia artefatos compilados, recursos (ícones) e documentação para o pacote portátil
copyRecursive(path.join(rootDir, 'dist'), path.join(portableDir, 'dist'));
copyRecursive(path.join(rootDir, 'dist-electron'), path.join(portableDir, 'dist-electron'));
copyRecursive(path.join(rootDir, 'resources'), path.join(portableDir, 'resources'));
copyRecursive(path.join(rootDir, 'docs'), path.join(portableDir, 'docs'));
copyRecursive(path.join(rootDir, 'package.json'), path.join(portableDir, 'package.json'));
copyRecursive(path.join(rootDir, 'README.md'), path.join(portableDir, 'README.md'));

// Cria lançador Desktop Windows na pasta portátil (executa sem janela de terminal)
const launcherCmd = `@echo off
title RGB Control Center
cd /d "%~dp0"
if exist "node_modules\\electron\\dist\\electron.exe" (
  start "" "node_modules\\electron\\dist\\electron.exe" . %*
) else if exist "..\\..\\node_modules\\electron\\dist\\electron.exe" (
  start "" "..\\..\\node_modules\\electron\\dist\\electron.exe" . %*
) else (
  npx electron . %*
)
`;
fs.writeFileSync(path.join(portableDir, 'RGB Control Center.cmd'), launcherCmd, 'utf-8');

// Gera o Cliente de Instalação GUI Windows (.exe) usando C# WinForms nativo (csc.exe)
const installerCsPath = path.join(releaseDir, 'InstallerProgram.cs');
const installerExePath = path.join(releaseDir, 'RGB-Control-Center-Setup-1.0.0.exe');
const iconPath = path.join(rootDir, 'resources', 'icon.ico');
const escapedSourceDir = rootDir.replace(/\\/g, '\\\\');
const escapedPortableDir = portableDir.replace(/\\/g, '\\\\');

const installerCsCode = `using System;
using System.IO;
using System.Drawing;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;

public class SetupForm : Form {
    private TextBox txtPath;
    private CheckBox chkDesktop;
    private CheckBox chkStartMenu;
    private CheckBox chkAutoStart;
    private CheckBox chkLaunch;
    private ProgressBar progressBar;
    private Label lblStatus;
    private Button btnInstall;
    private Button btnBrowse;
    private Button btnClose;

    private readonly string sourceProjectDir = "${escapedSourceDir}";
    private readonly string sourcePortableDir = "${escapedPortableDir}";

    public SetupForm() {
        this.Text = "Instalador — RGB Control Center v1.0.0";
        this.Size = new Size(560, 430);
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.MaximizeBox = false;
        this.StartPosition = FormStartPosition.CenterScreen;
        this.BackColor = Color.FromArgb(11, 15, 25);
        this.ForeColor = Color.FromArgb(241, 245, 249);
        this.Font = new Font("Segoe UI", 9.5f);

        try {
            this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        } catch {}

        var headerPanel = new Panel {
            Dock = DockStyle.Top,
            Height = 84,
            BackColor = Color.FromArgb(17, 21, 31)
        };

        var pic = new PictureBox {
            Location = new Point(20, 18),
            Size = new Size(48, 48),
            SizeMode = PictureBoxSizeMode.Zoom
        };
        try { pic.Image = this.Icon.ToBitmap(); } catch {}

        var lblTitle = new Label {
            Text = "RGB Control Center v1.0.0",
            Font = new Font("Segoe UI", 14f, FontStyle.Bold),
            ForeColor = Color.FromArgb(34, 211, 238),
            Location = new Point(82, 16),
            AutoSize = true
        };
        var lblSub = new Label {
            Text = "Central Unificada RGB/ARGB • Segundo Plano, Bandeja e Atalhos Globais",
            Font = new Font("Segoe UI", 9f),
            ForeColor = Color.FromArgb(148, 163, 184),
            Location = new Point(84, 46),
            AutoSize = true
        };
        headerPanel.Controls.Add(pic);
        headerPanel.Controls.Add(lblTitle);
        headerPanel.Controls.Add(lblSub);
        this.Controls.Add(headerPanel);

        var lblDest = new Label {
            Text = "Pasta de Instalação:",
            Location = new Point(22, 102),
            AutoSize = true
        };
        this.Controls.Add(lblDest);

        string defaultInstallDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs",
            "RGB Control Center"
        );
        txtPath = new TextBox {
            Text = defaultInstallDir,
            Location = new Point(22, 126),
            Size = new Size(415, 26),
            BackColor = Color.FromArgb(9, 11, 16),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle
        };
        this.Controls.Add(txtPath);

        btnBrowse = new Button {
            Text = "Procurar...",
            Location = new Point(445, 125),
            Size = new Size(85, 27),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(22, 27, 40),
            ForeColor = Color.White
        };
        btnBrowse.Click += (s, e) => {
            using (var dlg = new FolderBrowserDialog()) {
                dlg.SelectedPath = txtPath.Text;
                if (dlg.ShowDialog() == DialogResult.OK) txtPath.Text = dlg.SelectedPath;
            }
        };
        this.Controls.Add(btnBrowse);

        chkDesktop = new CheckBox {
            Text = "Criar atalho na Área de Trabalho (com ícone da aplicação)",
            Checked = true,
            Location = new Point(22, 168),
            AutoSize = true
        };
        chkStartMenu = new CheckBox {
            Text = "Criar atalho no Menu Iniciar do Windows",
            Checked = true,
            Location = new Point(22, 196),
            AutoSize = true
        };
        chkAutoStart = new CheckBox {
            Text = "Iniciar minimizado em segundo plano junto com o Windows",
            Checked = true,
            Location = new Point(22, 224),
            AutoSize = true
        };
        chkLaunch = new CheckBox {
            Text = "Executar RGB Control Center ao concluir a instalação",
            Checked = true,
            Location = new Point(22, 252),
            AutoSize = true
        };
        this.Controls.Add(chkDesktop);
        this.Controls.Add(chkStartMenu);
        this.Controls.Add(chkAutoStart);
        this.Controls.Add(chkLaunch);

        progressBar = new ProgressBar {
            Location = new Point(22, 294),
            Size = new Size(508, 18),
            Minimum = 0,
            Maximum = 100
        };
        this.Controls.Add(progressBar);

        lblStatus = new Label {
            Text = "Pronto para instalar. Atalho global de troca de perfil: Ctrl+Alt+P",
            ForeColor = Color.FromArgb(148, 163, 184),
            Location = new Point(22, 320),
            Size = new Size(508, 22)
        };
        this.Controls.Add(lblStatus);

        btnInstall = new Button {
            Text = "Instalar Agora",
            Location = new Point(318, 348),
            Size = new Size(120, 34),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(6, 182, 212),
            ForeColor = Color.FromArgb(9, 11, 16),
            Font = new Font("Segoe UI", 9.5f, FontStyle.Bold)
        };
        btnInstall.Click += async (s, e) => await RunInstallAsync();
        this.Controls.Add(btnInstall);

        btnClose = new Button {
            Text = "Cancelar",
            Location = new Point(445, 348),
            Size = new Size(85, 34),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(22, 27, 40),
            ForeColor = Color.White
        };
        btnClose.Click += (s, e) => this.Close();
        this.Controls.Add(btnClose);
    }

    private static void CopyDir(string src, string dst) {
        if (!Directory.Exists(src)) return;
        Directory.CreateDirectory(dst);
        foreach (string file in Directory.GetFiles(src)) {
            string target = Path.Combine(dst, Path.GetFileName(file));
            File.Copy(file, target, true);
        }
        foreach (string dir in Directory.GetDirectories(src)) {
            CopyDir(dir, Path.Combine(dst, Path.GetFileName(dir)));
        }
    }

    private static void CreateShortcut(string lnkPath, string targetPath, string args, string workDir, string iconPath) {
        string vbsPath = Path.Combine(Path.GetTempPath(), "rgb_cc_lnk_" + Guid.NewGuid().ToString("N") + ".vbs");
        string vbs = "Set oWS = WScript.CreateObject(\\"WScript.Shell\\")\\r\\n" +
                     "Set oLink = oWS.CreateShortcut(\\"" + lnkPath + "\\")\\r\\n" +
                     "oLink.TargetPath = \\"" + targetPath + "\\"\\r\\n" +
                     "oLink.Arguments = \\"" + args + "\\"\\r\\n" +
                     "oLink.WorkingDirectory = \\"" + workDir + "\\"\\r\\n" +
                     "oLink.IconLocation = \\"" + iconPath + "\\"\\r\\n" +
                     "oLink.Description = \\"RGB Control Center - Gerenciador Unificado RGB/ARGB\\"\\r\\n" +
                     "oLink.Save\\r\\n";
        File.WriteAllText(vbsPath, vbs);
        var p = Process.Start(new ProcessStartInfo("wscript.exe", "\\"" + vbsPath + "\\"") {
            CreateNoWindow = true,
            UseShellExecute = false
        });
        p.WaitForExit(5000);
        try { File.Delete(vbsPath); } catch {}
    }

    private async Task RunInstallAsync() {
        btnInstall.Enabled = false;
        btnBrowse.Enabled = false;
        string installDir = txtPath.Text.Trim();
        if (string.IsNullOrEmpty(installDir)) return;

        try {
            lblStatus.Text = "Preparando diretório de instalação...";
            progressBar.Value = 15;
            await Task.Run(() => {
                Directory.CreateDirectory(installDir);
                string baseSrc = Directory.Exists(Path.Combine(sourcePortableDir, "dist-electron"))
                    ? sourcePortableDir
                    : sourceProjectDir;

                CopyDir(Path.Combine(baseSrc, "dist"), Path.Combine(installDir, "dist"));
                CopyDir(Path.Combine(baseSrc, "dist-electron"), Path.Combine(installDir, "dist-electron"));
                CopyDir(Path.Combine(baseSrc, "resources"), Path.Combine(installDir, "resources"));
                CopyDir(Path.Combine(baseSrc, "docs"), Path.Combine(installDir, "docs"));
                if (File.Exists(Path.Combine(baseSrc, "package.json")))
                    File.Copy(Path.Combine(baseSrc, "package.json"), Path.Combine(installDir, "package.json"), true);
            });

            lblStatus.Text = "Instalando runtime Electron para execução independente...";
            progressBar.Value = 50;
            string electronSrc = Path.Combine(sourceProjectDir, "node_modules", "electron");
            string electronDst = Path.Combine(installDir, "node_modules", "electron");
            await Task.Run(() => {
                if (Directory.Exists(electronSrc)) {
                    var rc = Process.Start(new ProcessStartInfo("robocopy.exe",
                        "\\"" + electronSrc + "\\" \\"" + electronDst + "\\" /E /NFL /NDL /NJH /NJS /NC /NS /NP") {
                        CreateNoWindow = true,
                        UseShellExecute = false
                    });
                    rc.WaitForExit();
                }
            });

            lblStatus.Text = "Configurando lançador silencioso e atalhos...";
            progressBar.Value = 80;
            string electronExe = Path.Combine(installDir, "node_modules", "electron", "dist", "electron.exe");
            string fallbackCmd = Path.Combine(installDir, "RGB Control Center.cmd");
            File.WriteAllText(fallbackCmd,
                "@echo off\\r\\ncd /d \\"" + installDir + "\\"\\r\\nstart \\"\\" \\"" + electronExe + "\\" . %*\\r\\n");

            string targetExe = File.Exists(electronExe) ? electronExe : fallbackCmd;
            string targetArgs = File.Exists(electronExe) ? "." : "";
            string icoFile = Path.Combine(installDir, "resources", "icon.ico");
            if (!File.Exists(icoFile)) icoFile = Application.ExecutablePath;

            if (chkDesktop.Checked) {
                string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                CreateShortcut(Path.Combine(desktopDir, "RGB Control Center.lnk"), targetExe, targetArgs, installDir, icoFile);
            }
            if (chkStartMenu.Checked) {
                string startMenuDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),
                    "Programs"
                );
                CreateShortcut(Path.Combine(startMenuDir, "RGB Control Center.lnk"), targetExe, targetArgs, installDir, icoFile);
            }

            if (chkAutoStart.Checked) {
                try {
                    using (var key = Registry.CurrentUser.OpenSubKey(@"Software\\Microsoft\\Windows\\CurrentVersion\\Run", true)) {
                        if (key != null) {
                            string runVal = File.Exists(electronExe)
                                ? "\\"" + electronExe + "\\" \\"" + installDir + "\\" --minimized"
                                : "\\"" + fallbackCmd + "\\" --minimized";
                            key.SetValue("RGBControlCenter", runVal);
                        }
                    }
                } catch {}
            }

            // Registra entrada de Desinstalação no Windows
            string uninstallCmd = Path.Combine(installDir, "Uninstall.cmd");
            File.WriteAllText(uninstallCmd,
                "@echo off\\r\\ntaskkill /IM electron.exe /F >nul 2>&1\\r\\n" +
                "reg delete \\"HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run\\" /v RGBControlCenter /f >nul 2>&1\\r\\n" +
                "reg delete \\"HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Uninstall\\\\RGBControlCenter\\" /f >nul 2>&1\\r\\n" +
                "del /q \\"%USERPROFILE%\\\\Desktop\\\\RGB Control Center.lnk\\" >nul 2>&1\\r\\n" +
                "del /q \\"%APPDATA%\\\\Microsoft\\\\Windows\\\\Start Menu\\\\Programs\\\\RGB Control Center.lnk\\" >nul 2>&1\\r\\n" +
                "echo RGB Control Center desinstalado.\\r\\n");

            try {
                using (var uKey = Registry.CurrentUser.CreateSubKey(@"Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\RGBControlCenter")) {
                    if (uKey != null) {
                        uKey.SetValue("DisplayName", "RGB Control Center");
                        uKey.SetValue("DisplayVersion", "1.0.0");
                        uKey.SetValue("Publisher", "RGB Control Center");
                        uKey.SetValue("DisplayIcon", icoFile);
                        uKey.SetValue("InstallLocation", installDir);
                        uKey.SetValue("UninstallString", "\\"" + uninstallCmd + "\\"");
                    }
                }
            } catch {}

            progressBar.Value = 100;
            lblStatus.Text = "Instalação concluída com sucesso!";
            lblStatus.ForeColor = Color.FromArgb(52, 211, 153);
            btnClose.Text = "Concluir";

            if (chkLaunch.Checked) {
                Process.Start(new ProcessStartInfo(targetExe, targetArgs) {
                    WorkingDirectory = installDir,
                    UseShellExecute = true
                });
            }
        } catch (Exception ex) {
            MessageBox.Show("Erro durante a instalação: " + ex.Message, "RGB Control Center Setup",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            btnInstall.Enabled = true;
            btnBrowse.Enabled = true;
        }
    }

    [STAThread]
    static void Main() {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new SetupForm());
    }
}
`;

fs.writeFileSync(installerCsPath, installerCsCode, 'utf-8');

const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
if (fs.existsSync(cscPath)) {
  const cscArgs = [
    '/nologo',
    '/target:winexe',
    '/r:System.Windows.Forms.dll',
    '/r:System.Drawing.dll',
    `/out:${installerExePath}`,
  ];
  if (fs.existsSync(iconPath)) {
    cscArgs.push(`/win32icon:${iconPath}`);
  }
  cscArgs.push(installerCsPath);
  execFileSync(cscPath, cscArgs);
  fs.unlinkSync(installerCsPath);
  console.log(`[OK] Cliente de instalação Windows gerado em: ${installerExePath}`);
}
console.log(`[OK] Pacote portátil gerado em: ${portableDir}`);
