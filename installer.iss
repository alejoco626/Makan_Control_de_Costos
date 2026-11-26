; Instalador de Makan · Control de costos (Inno Setup)
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{7B1D3C52-4F0A-4E58-9A6E-5D2C8B7A1E34}
AppName=Makan Control de costos
AppVersion={#AppVersion}
AppPublisher=Accesorios y Servicios Exclusivos, S.A.
DefaultDirName={autopf}\Makan Control de costos
DefaultGroupName=Makan Control de costos
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=dist
OutputBaseFilename=Instalar_ControlDeCostos
SetupIconFile=makan.ico
UninstallDisplayIcon={app}\ControlDeCostos.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear un acceso directo en el escritorio"; GroupDescription: "Accesos directos:"

[Files]
Source: "dist\ControlDeCostos.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Makan Control de costos"; Filename: "{app}\ControlDeCostos.exe"
Name: "{autodesktop}\Makan Control de costos"; Filename: "{app}\ControlDeCostos.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\ControlDeCostos.exe"; Description: "Abrir Makan Control de costos"; Flags: nowait postinstall skipifsilent
