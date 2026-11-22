# PROMPT MASTER — RGB CONTROL CENTER

## 1. CONTEXTO DO PROJETO

Atue como um engenheiro de software sênior, especialista em desenvolvimento desktop, integração com hardware, protocolos USB/HID, Electron, React, TypeScript e sistemas de iluminação RGB/ARGB.

Desenvolva uma aplicação desktop chamada **RGB Control Center**, destinada ao Windows, com o objetivo de centralizar o controle de iluminação de todos os dispositivos e componentes RGB de um computador, independentemente do fabricante.

Atualmente, os dispositivos utilizam diferentes softwares proprietários para configuração da iluminação. A proposta é substituir essa fragmentação por uma única aplicação, com gerenciamento centralizado, sincronização de efeitos e criação de perfis personalizados.

O projeto deve ser desenvolvido com foco em modularidade, escalabilidade, desempenho e compatibilidade com diferentes fabricantes.

Não desenvolver apenas uma interface visual demonstrativa. O objetivo é construir um software funcional, com comunicação real com o hardware.

---

## 2. HARDWARE INICIAL

Considerar os seguintes dispositivos como ambiente inicial de desenvolvimento e validação:

| Dispositivo | Fabricante | Modelo |
|---|---|---|
| Teclado | Husky | TG 200 |
| Mouse | Redragon | Invader Pro M719RGB-PRO |
| Placa-mãe | Gigabyte | B450M Gaming |

O sistema deverá estar preparado para adicionar futuramente:

- Memórias RAM RGB.
- Placas de vídeo RGB.
- Water coolers.
- Fans e coolers.
- Controladoras ARGB.
- Fitas LED.
- Headsets.
- Outros teclados e mouses.
- Gabinetes com iluminação integrada.

A compatibilidade de cada dispositivo deverá ser validada por meio de identificação do hardware, protocolos de comunicação e testes reais.

Não presumir compatibilidade sem comprovação.

---

## 3. OBJETIVO PRINCIPAL

Criar um centro de controle RGB que permita:

1. Detectar automaticamente os dispositivos conectados.
2. Identificar fabricante e modelo.
3. Controlar a iluminação individualmente.
4. Sincronizar iluminação entre diferentes fabricantes.
5. Criar efeitos personalizados.
6. Configurar cores e animações.
7. Salvar e aplicar perfis.
8. Gerenciar todos os dispositivos em uma interface.
9. Iniciar automaticamente com o Windows.
10. Permitir expansão para novos fabricantes.

O RGB Control Center deverá funcionar como uma central independente de gerenciamento, utilizando integrações existentes sempre que possível.

---

## 4. STACK TECNOLÓGICA

Utilizar preferencialmente:

- Electron: aplicação desktop.
- React: interface.
- TypeScript: linguagem principal.
- Vite: ambiente de desenvolvimento.
- Tailwind CSS: estilização.
- Zustand: gerenciamento de estado.
- SQLite: persistência local.
- node-hid: identificação e comunicação USB/HID.
- OpenRGB SDK: integração com dispositivos compatíveis.
- OpenMouse: referência e implementação de protocolos Redragon.
- electron-builder: empacotamento e instalador Windows.
- Vitest: testes automatizados.

A arquitetura deverá separar claramente o processo principal do Electron, a interface e os serviços de integração com hardware.

---

## 5. ARQUITETURA DO SISTEMA

Implementar uma arquitetura modular baseada em Providers.

### 5.1. RGB Core

Criar um núcleo responsável por:

- Gerenciar dispositivos.
- Descobrir hardware.
- Controlar conexões.
- Mapear capacidades.
- Gerenciar efeitos.
- Sincronizar dispositivos.
- Aplicar perfis.
- Gerenciar conflitos.
- Controlar os providers.

### 5.2. Hardware Providers

Cada fabricante ou protocolo deverá possuir seu próprio provider.

Implementar inicialmente:

**OpenRGB Provider**
- Comunicação com o OpenRGB SDK.
- Descoberta de dispositivos.
- Identificação de zonas e LEDs.
- Controle de cores.
- Aplicação de efeitos.
- Consulta de capacidades.

**Redragon Provider**
- Investigar o protocolo M719RGB-PRO.
- Avaliar a implementação existente no OpenMouse.
- Identificar VID/PID.
- Implementar comunicação HID quando tecnicamente validada.
- Controlar iluminação.
- Validar os efeitos suportados.

**Husky Provider**
- Investigar o protocolo do teclado TG 200.
- Identificar VID/PID.
- Investigar descritores USB/HID.
- Identificar comandos de iluminação.
- Verificar suporte a cores e efeitos.
- Implementar integração específica somente após validar o protocolo.

**Generic HID Provider**
- Descoberta genérica de dispositivos.
- Identificação de fabricante e modelo.
- Consulta de interfaces disponíveis.
- Não executar comandos de escrita sem protocolo conhecido.

### 5.3. Contrato dos Providers

Criar uma interface comum:

```typescript
interface RGBProvider {
  id: string;
  name: string;
  manufacturer: string;

  isAvailable(): Promise<boolean>;

  discoverDevices(): Promise<RGBDevice[]>;

  getCapabilities(
    deviceId: string
  ): Promise<DeviceCapabilities>;

  getLightingState(
    deviceId: string
  ): Promise<LightingState>;

  setColor(
    deviceId: string,
    color: RGBColor
  ): Promise<void>;

  setEffect(
    deviceId: string,
    effect: RGBEffect
  ): Promise<void>;

  setBrightness(
    deviceId: string,
    brightness: number
  ): Promise<void>;

  disconnect(): Promise<void>;
}
```

Todos os providers deverão seguir esse contrato.

O RGB Core não poderá depender diretamente de protocolos específicos de fabricantes.

---

## 6. FUNCIONALIDADES DA APLICAÇÃO

### 6.1. Dashboard

Criar uma tela inicial contendo:

- Dispositivos conectados.
- Fabricantes.
- Modelos.
- Status de conexão.
- Status de compatibilidade.
- Efeito atual.
- Cor atual.
- Atalhos para configuração.
- Indicador de dispositivos não suportados.

Apresentar os dispositivos em cards individuais.

### 6.2. Device Manager

Criar uma tela para gerenciamento dos equipamentos.

Permitir:

- Identificar dispositivos.
- Atualizar lista de dispositivos.
- Ativar e desativar iluminação.
- Configurar dispositivos individualmente.
- Consultar recursos disponíveis.
- Identificar zonas de iluminação.
- Consultar informações técnicas.

Cada dispositivo deverá apresentar suas capacidades reais.

### 6.3. RGB Studio

Criar um editor visual de iluminação.

Implementar os seguintes efeitos, respeitando as capacidades do hardware:

- Static Color.
- Rainbow.
- Breathing.
- Wave.
- Color Cycle.
- Reactive.
- Strobing.
- Gradient.
- Custom Animation.

Controles:

- Seletor de cores.
- Campo HEX.
- RGB Picker.
- Velocidade.
- Brilho.
- Direção.
- Intensidade.
- Transição.
- Seleção de dispositivos.
- Seleção de zonas.

### 6.4. RGB Sync

Criar uma funcionalidade de sincronização global.

Permitir:

- Aplicar uma cor em todos os dispositivos.
- Aplicar um efeito compartilhado.
- Sincronizar velocidade.
- Sincronizar brilho.
- Selecionar quais dispositivos participarão.
- Criar exceções individuais.

Desenvolver um motor de sincronização capaz de traduzir configurações globais para os recursos suportados por cada dispositivo.

Não exigir que fabricantes diferentes utilizem o mesmo protocolo.

### 6.5. Profile Manager

Criar gerenciamento de perfis personalizados.

Perfis iniciais:

- Gaming.
- Work.
- Night.
- Static.
- Custom.

Permitir:

- Criar perfis.
- Editar perfis.
- Duplicar perfis.
- Excluir perfis.
- Aplicar perfis.
- Exportar JSON.
- Importar JSON.
- Definir perfil padrão.

Cada perfil deverá guardar configurações individuais por dispositivo.

### 6.6. Settings

Implementar:

- Inicialização com Windows.
- Minimizar para System Tray.
- Aplicar último perfil utilizado.
- Configuração de providers.
- Configuração de conexão OpenRGB.
- Configuração de atualização automática de dispositivos.
- Logs.
- Diagnóstico de hardware.
- Tema claro e escuro.

---

## 7. MOTOR DE EFEITOS RGB

Desenvolver um motor próprio de efeitos.

Separar:

**Hardware Effects**
Efeitos executados pelo firmware do dispositivo.

**Software Effects**
Efeitos calculados pelo RGB Core e enviados ao dispositivo por meio de comunicação compatível.

O motor deverá suportar:

- Atualização periódica.
- Controle de velocidade.
- Transições.
- Animações.
- Sincronização.
- Controle de múltiplas zonas.

Implementar controle de frequência de atualização para evitar sobrecarga de USB, CPU e comunicação HID.

Não manter loops de atualização desnecessários quando a iluminação estiver estática.

---

## 8. IDENTIFICAÇÃO E COMPATIBILIDADE

Criar um sistema de diagnóstico automático.

Para cada dispositivo, apresentar:

- Fabricante.
- Modelo.
- VID.
- PID.
- Tipo de conexão.
- Provider responsável.
- Recursos identificados.
- Recursos disponíveis.
- Limitações.
- Status de comunicação.

Utilizar os seguintes estados:

- Compatible.
- Partially Compatible.
- Detected.
- Unsupported.
- Disconnected.
- Error.

O usuário deverá saber exatamente quais dispositivos podem ser controlados e quais foram apenas identificados.

Não simular controle de iluminação.

---

## 9. INTERFACE VISUAL

Criar uma interface moderna, profissional e tecnológica.

Referências visuais:

- OpenRGB.
- SignalRGB.
- Razer Synapse.
- Armoury Crate.

Diretrizes:

- Dark Mode como padrão.
- Layout minimalista.
- Navegação lateral.
- Dashboard organizado.
- Cards de dispositivos.
- Visualização das cores em tempo real.
- Animações suaves.
- Interface intuitiva.
- Identidade visual própria.

Menu lateral:

1. Dashboard.
2. Devices.
3. RGB Studio.
4. RGB Sync.
5. Profiles.
6. Settings.

Criar uma experiência visual semelhante a um painel profissional de gerenciamento de hardware.

---

## 10. SEGURANÇA E ESTABILIDADE

Implementar:

- Comunicação segura entre Electron Main e Renderer.
- Context Isolation.
- Node Integration desabilitado no Renderer.
- Preload com API restrita.
- Validação de comandos.
- Tratamento de exceções.
- Logs estruturados.
- Gerenciamento de desconexões.
- Proteção contra comandos HID inválidos.
- Detecção de conflitos entre softwares.
- Controle de acesso administrativo somente quando necessário.

Nunca executar comandos SMBus, I²C ou HID desconhecidos sem validação.

Evitar escrita em registradores e alterações de firmware sem documentação técnica.

---

## 11. BANCO DE DADOS

Utilizar SQLite.

Criar inicialmente as seguintes tabelas:

- devices
- providers
- capabilities
- profiles
- profile_devices
- effects
- settings
- device_logs

Implementar migrations e persistência das configurações.

Os perfis deverão permitir exportação e importação.

---

## 12. ESTRUTURA DE DIRETÓRIOS

Organizar o projeto:

```text
rgb-control-center/
├── src/
│   ├── main/
│   │   ├── ipc/
│   │   ├── services/
│   │   └── index.ts
│   │
│   ├── preload/
│   │
│   ├── renderer/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── stores/
│   │
│   ├── core/
│   │   ├── device-manager/
│   │   ├── discovery/
│   │   ├── capabilities/
│   │   ├── effects/
│   │   └── sync/
│   │
│   ├── providers/
│   │   ├── openrgb/
│   │   ├── redragon/
│   │   ├── husky/
│   │   └── generic-hid/
│   │
│   ├── profiles/
│   ├── database/
│   ├── shared/
│   └── utils/
│
├── resources/
├── tests/
├── docs/
├── package.json
└── README.md
```

---

## 13. ETAPAS DE DESENVOLVIMENTO

Executar o desenvolvimento progressivamente.

### Fase 1 — Fundação e descoberta

- Criar estrutura Electron + React + TypeScript.
- Criar identidade visual.
- Criar dashboard.
- Implementar Device Manager.
- Integrar OpenRGB SDK.
- Implementar descoberta USB/HID.
- Criar matriz de compatibilidade.

### Fase 2 — Integração de hardware

- Validar Gigabyte B450M Gaming.
- Validar Redragon Invader Pro.
- Investigar Husky TG 200.
- Implementar providers.
- Implementar gerenciamento de erros.

### Fase 3 — Controle RGB

- Implementar RGB Studio.
- Implementar seleção de cores.
- Implementar efeitos.
- Implementar controle de brilho.
- Implementar sincronização.

### Fase 4 — Perfis

- Criar Profile Manager.
- Implementar persistência.
- Criar importação e exportação.
- Implementar aplicação automática de perfis.

### Fase 5 — Desktop

- Implementar System Tray.
- Inicialização com Windows.
- Gerenciamento de processos.
- Otimização de desempenho.
- Criar instalador.

### Fase 6 — Expansão

- Adicionar novos fabricantes.
- Adicionar novos protocolos.
- Implementar novos providers.
- Ampliar compatibilidade.

---

## 14. REGRAS PARA A IA DESENVOLVEDORA

Siga rigorosamente estas orientações:

1. Antes de desenvolver integrações, pesquise a documentação e os protocolos existentes.
2. Não invente APIs ou comandos de hardware.
3. Não implemente funcionalidades fictícias.
4. Priorize soluções open source.
5. Reutilize projetos existentes quando houver compatibilidade e licença adequada.
6. Não acople o núcleo da aplicação a fabricantes específicos.
7. Implemente testes para cada provider.
8. Documente as limitações de cada equipamento.
9. Desenvolva funcionalidades reais, não apenas protótipos visuais.
10. Não interrompa o desenvolvimento para solicitar confirmação a cada pequena decisão: utilize boas práticas e registre as decisões técnicas.
11. Quando não houver acesso ao hardware físico, implementar testes simulados claramente identificados como mocks, sem declarar compatibilidade real.
12. Não desenvolver integrações de escrita sem antes comprovar a segurança do protocolo.

## 15. PRIMEIRA ENTREGA OBRIGATÓRIA

Comece implementando a Fase 1.

A primeira versão deverá entregar:

- Aplicativo Electron executável.
- Interface React funcional.
- Dashboard.
- Device Manager.
- Integração inicial com OpenRGB.
- Descoberta de dispositivos USB/HID.
- Identificação de fabricantes e modelos.
- Status de compatibilidade.
- Estrutura modular de providers.
- Logs de diagnóstico.

Ao concluir, apresentar:

1. Estrutura do projeto.
2. Decisões arquiteturais.
3. Funcionalidades implementadas.
4. Dispositivos efetivamente identificados.
5. Compatibilidade comprovada.
6. Limitações encontradas.
7. Instruções para executar o projeto.
8. Próximas tarefas técnicas.

**RESULTADO ESPERADO**

Entregar um aplicativo desktop real, denominado RGB Control Center, que funcione como central de gerenciamento da iluminação RGB do computador, permitindo integrar diferentes fabricantes por meio de uma arquitetura extensível, com controle individual, sincronização global e perfis personalizados.

A prioridade é garantir comunicação real com o hardware, estabilidade e facilidade de expansão.