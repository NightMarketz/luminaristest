# RUNBOOK: Dev Drive + modo de desempenho do Defender (melhoria 4/7)

Executor: [nome — humano]           Data: [____]
Autorização: dono, chat, 2026-11-04: "Me da um prompt para implementar todas as 7 sugestões"; item 4: "Dev Drive (eu faço;
você prepara)". O agente preparou e mediu o "antes". Os passos, o desfecho e a assinatura são do dono
(`RUNBOOK-FORMAT.md` §Fronteira).

**Por quê:** com ~7 sessões em paralelo (03–04/11), cada `npm ci`, `tsc` e jest lê dezenas de milhares de arquivos
pequenos, e o antivírus em tempo real varre cada abertura. O Dev Drive usa ReFS e, quando é confiável, o Defender roda
nele em **modo de desempenho** (varredura assíncrona, depois da abertura), em vez de bloquear cada leitura.

**Fontes (lidas em 04/11/2026):**
- [Set up a Dev Drive on Windows 11](https://learn.microsoft.com/en-us/windows/dev-drive/), atualizada em 01/06/2026.
- [Protect Dev Drive using performance mode](https://learn.microsoft.com/en-us/defender-endpoint/microsoft-defender-endpoint-antivirus-performance-mode), atualizada em 16/09/2026.

## Pré-condições — conferidas pelo agente em 04/11/2026

| Requisito (doc) | Esta máquina | Como foi lido | OK? |
|---|---|---|---|
| "available on all Windows SKU versions" | Windows 11 **Home** | `OS Version` do ambiente | sim |
| "Windows 11, Build #10.0.22621.2338 or later" | 10.0.**26200** | `os.release()` do node | sim |
| "Recommend 16 GB memory (minimum of 8 GB)" | 31,2 GB | `os.totalmem()` | sim |
| "Minimum 50 GB free disk space" | 52,8 GB livres no disco do app (antes da limpeza de worktrees de 04/11) | `get_storage_usage` do app | **no limite** (ver passo 2) |
| "Local administrator permissions" | não conferido | — | o dono confere |
| Defender como antivírus principal, "Real-time protection is turned on" | `AMRunningMode : Normal`, `RealTimeProtectionEnabled : True` | `Get-MpComputerStatus` | sim |
| Plataforma "4.18.2303.8 (or later)" | 4.18.26100.4 | `Get-MpComputerStatus` (`AMProductVersion`) | sim |
| Inteligência "1.385.1455.0 (or later)" | 1.463.110.0 | `Get-MpComputerStatus` (`AntivirusSignatureVersion`) | sim |
| `Format-Volume -DevDrive` existe | sim | `Get-Command Format-Volume` | sim |

**Ponto em aberto — o modo de desempenho pode estar desligado:** `Get-MpPreference` mostra `PerformanceModeStatus : 1`.
Na doc do Intune, o mesmo campo é "0 = Enable (default), 1 = Disable". A doc não descreve a leitura pelo
`Get-MpPreference`, então **não está provado** que 1 aqui quer dizer desligado. O passo 4 confere na tela do Windows
Security, que a doc descreve, e liga o modo se preciso.

Não verificado pelo agente: `fsutil devdrv query` precisa de administrador (deu "Erro 5: Acesso negado"). O `Get-Volume`
e o `Get-Disk` não responderam em 90 s com a máquina carregada, então espaço não alocado e tipo de disco ficaram de fora.

## Medição de antes (agente, 04/11/2026, máquina carregada)

| Medida | Comando (rodado de `server/` da worktree `gifted-shaw-ddc107`, Node 24.20, npm 11.19) | Tempo | Exit |
|---|---|---|---|
| `tsc` do server | `npx tsc --noEmit` | 9,8 s e 9,1 s (2 rodadas) | 0 e 0 |
| 1 arquivo de integração | `npx jest src/middleware/__tests__/auth.routes.integration.test.ts --selectProjects integration --runInBand --forceExit` | 6,3 s e 5,3 s de parede (jest: "Time: 4.634 s"; 5 passed) | 0 e 0 |
| Carga no momento | sessões rodando · RAM livre | 04/11 05:04Z: 2 outras sessões rodando (`list_sessions`) além desta; RAM livre 8,7 de 31,2 GB (`os.freemem()`); logo depois de remover 38 worktrees paradas | — |

**Compare com cuidado:** o "antes" foi medido com a máquina carregada, porque o dono pediu "Meça agora mesmo". Para o
"depois" valer, meça na mesma condição (mesmo número de sessões rodando) ou meça os dois de novo com a máquina parada.

## Passos

1. **Pare as sessões que usam o repositório.** Arquive ou feche as sessões cujo `cwd` está em
   `C:\Users\smurf\Downloads\Luminaris`. Quem estiver rodando quando a pasta mudar de lugar fica apontando para o
   caminho velho.
   Resultado esperado: nenhuma sessão do Luminaris rodando.
   EVIDÊNCIA: [colar a lista de sessões do app]

2. **Libere espaço e escolha o tamanho.** A doc pede pelo menos 50 GB. O VHDX dinâmico só ocupa o que usar, mas o
   tamanho máximo tem de caber no que vai entrar: o checkout principal (sem `.claude/worktrees`), as worktrees novas e o
   depósito `~/.luminaris-deps` (~2 GB por versão de lockfile). Sugestão: **VHDX dinâmico de 150 GB**, e não migrar as
   worktrees velhas (elas morrem no C:). Rode `node scripts/worktrees-paradas.mjs --sem-tamanho` antes, para liberar
   espaço.
   Resultado esperado: espaço livre no C: maior que o que você pretende pôr no Dev Drive.
   EVIDÊNCIA: [colar o espaço livre do C: (Configurações › Sistema › Armazenamento)]

3. **Crie o Dev Drive** (administrador). Configurações › Sistema › Armazenamento › Configurações avançadas de
   armazenamento › Discos e volumes › **Criar unidade de desenvolvimento** › Criar novo VHD. Nome `DevDrive`, local
   `C:\DevDrive`, 150 GB, **VHDX**, **Expansão dinâmica**, rótulo `Dev`, letra `D:` (ou a livre). Alternativa em
   PowerShell, para uma partição já existente e vazia: `Format-Volume -DriveLetter D -DevDrive` (formatar **apaga** o
   volume).
   Resultado esperado: unidade `D:` com ReFS.
   EVIDÊNCIA: [colar a saída de `fsutil devdrv query D:` num PowerShell como administrador]

4. **Confirme o volume confiável e o modo de desempenho.** A doc diz que o Dev Drive nasce confiável. Se o passo 3 não
   mostrar isso, rode `fsutil devdrv trust D:`. Depois, Segurança do Windows › Proteção contra vírus e ameaças ›
   Gerenciar configurações › Proteção da unidade de desenvolvimento › **Ver volumes**. A coluna deve dizer "Dev Drive is
   enabled, and Defender Performance mode is enabled". Se disser "isn't enabled", rode como administrador
   `Set-MpPreference -PerformanceModeStatus Enabled` e confira de novo.
   Resultado esperado: o D: aparece com o modo de desempenho ligado.
   EVIDÊNCIA: [print da tela "Ver volumes" + saída de `Get-MpPreference | Select PerformanceModeStatus` depois]

5. **Mova o checkout principal, sem as worktrees e sem `node_modules`.** No PowerShell:
   `robocopy C:\Users\smurf\Downloads\Luminaris D:\Luminaris /E /XJ /XD node_modules .claude\worktrees /R:1 /W:1`.
   O `/XJ` não segue junção: sem ele, a cópia entraria no depósito. Depois, no novo lugar, `git status` (deve ficar
   limpo como estava) e `git worktree repair`, para as worktrees que ainda existem no C: acharem o `.git` novo.
   Resultado esperado: `git status` igual ao de antes; `git worktree list` sem `prunable`.
   EVIDÊNCIA: [colar o resumo final do robocopy + `git status` + `git worktree list | Select-String prunable`]

6. **Leve o depósito e o cache do npm para o Dev Drive** (variável de usuário, sem administrador):
   `setx LUMINARIS_DEPS_STORE D:\luminaris-deps` e `setx npm_config_cache D:\packages\npm`. Feche e abra o app do Claude,
   para ele herdar as variáveis.
   Resultado esperado: `node -p "process.env.LUMINARIS_DEPS_STORE"` num terminal novo mostra `D:\luminaris-deps`.
   EVIDÊNCIA: [colar a saída]

7. **Abra o projeto do novo lugar e instale pelo depósito.** No app, projeto `D:\Luminaris`, sessão nova (worktree
   nova). Na raiz dela: `node scripts/worktree-deps.mjs` (ou o hook SessionStart, se já estiver ligado).
   Resultado esperado: o depósito é criado em `D:\luminaris-deps` e o `tsc` passa.
   EVIDÊNCIA: [colar a saída do worktree-deps + `npx tsc --noEmit` exit]

8. **Meça o depois**, com os mesmos dois comandos da tabela "Medição de antes", na mesma condição de carga.
   Resultado esperado: tempo menor que o de antes.
   EVIDÊNCIA: [colar os tempos e exits]

## Como voltar atrás

1. Feche as sessões que usam `D:\Luminaris`.
2. `robocopy D:\Luminaris C:\Users\smurf\Downloads\Luminaris /E /XJ /XD node_modules .claude\worktrees` e, no C:,
   `git worktree repair`.
3. Apague as variáveis: `reg delete HKCU\Environment /v LUMINARIS_DEPS_STORE /f` e
   `reg delete HKCU\Environment /v npm_config_cache /f`. Reabra o app. O depósito volta a ser `~/.luminaris-deps`; se ele
   não existir mais, a próxima chamada do `worktree-deps.mjs` reinstala.
4. Remova o Dev Drive. Configurações › … › Discos e volumes › Propriedades do D: › **Excluir**. Em VHD: Gerenciamento de
   Disco › clique no **disco** (não no volume) › Desanexar VHD, e apague `C:\DevDrive\DevDrive.vhdx`. **Tudo o que estiver
   no D: se perde**: copie antes o que não for cache.

## Notas

- **Filtros:** o Dev Drive desliga os filtros de sistema de arquivos que não são antivírus. Node, git e Prisma não
  precisam deles. Se uma ferramenta parar de enxergar arquivos no D:, liste com `fltmc filters` e libere com
  `fsutil devdrv setfiltersallowed <nome>`.
- **Junções:** a doc não fala de git, symlink ou junção em ReFS. A junção do `worktree-deps.mjs` entre volumes locais
  é suportada pelo Windows, mas **não foi testada no D:**: o passo 7 é o teste.
- **Ferramentas e o próprio app ficam no C:.** A doc: "We do not recommend installing applications on a Dev Drive."

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: `docs/plano/decisoes/D-2026-11-04-RECURSOS-LOCAIS.md`, tabela de mecanismos
- Assinatura do executor: [humano]
