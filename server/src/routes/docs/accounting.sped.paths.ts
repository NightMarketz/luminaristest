/**
 * OpenAPI de /api/accounting/sped.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/sped/ecd/generate:
 *     post:
 *       summary: Generate the SPED Contábil (ECD) .txt file for a year
 *       description: >-
 *         Composes the ECD (Livro Diário Geral, tipo G) for the given year from the ledger
 *         (chart, referential mapping, monthly balances, journal, BP/DRE) and persists a
 *         plain-text (ISO-8859-1) artifact as an EXPORT job. Download via
 *         /data-exchange/jobs/{jobId}/download. Blocks with 400 + unmappedAccounts if any
 *         leaf account is unmapped in the referential version (coverage gate).
 *         BE-INCR-FIXED-ASSETS PR-4 (retificação versionada, item 26-31): a ECD SUBSTITUTA
 *         (declarant.indFinEsc=1) exige declarant.codHashSub (40 hex), supersedesJobId (o job
 *         EXPORTED sendo substituído) e verificationTerm (J801+J932); o .rtf do Termo chega por
 *         multipart/form-data (campo "rtf", até 30 MB) — a ECD original continua indo por
 *         application/json puro (o multer é no-op fora de multipart).
 *         X13 PR-2 - with a company fiscal profile for the year, missing declarant/book/signer fields are
 *         prefilled from it (body wins, listed in perfilFiscal.sobrescritos); avisos carries the large-company
 *         warning (Lei 11.638 art. 3) and the missing-profile notice. The ECD is never refused by regime.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, mappingVersion, year, declarant, book, signers]
 *               properties:
 *                 unitId:         { type: string }
 *                 signerContactIds: { type: array, items: { type: string }, description: 'Via barata (F-CD8-a) - ids de AccountingContact expandidos em signatarios do contador (J930 na ECD, 0930 na ECF) ANTES da validacao; cross-tenant e 404; contato sem telefone e 400 na ECF' }
 *                 mappingVersion: { type: string }
 *                 year:           { type: integer, example: 2026 }
 *                 supersedesJobId: { type: string, description: 'Obrigatório quando declarant.indFinEsc=1 (substituta) — id do job ECD EXPORTED sendo substituído.' }
 *                 verificationTerm:
 *                   type: object
 *                   description: 'J801+J932 — obrigatório quando declarant.indFinEsc=1 (substituta), proibido quando =0.'
 *                   required: [codMotSubs, signers]
 *                   properties:
 *                     codMotSubs: { type: string, enum: ['001','002','003','004','005','099'] }
 *                     descRtf:    { type: string }
 *                     deadlineJustification: { type: string, description: 'Obrigatória quando o exercício está no limite do prazo (ano-2, art. 8º §4).' }
 *                     signers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required: [identNom, identCpfCnpj, codAssin, indCrc, email, fone, ufCrc]
 *                         properties:
 *                           identNom:     { type: string }
 *                           identCpfCnpj: { type: string }
 *                           codAssin:     { type: string, enum: ['910'], description: '920 (Auditor Independente) fora do escopo.' }
 *                           indCrc:       { type: string, description: 'CFC format UF-NNNNNN/O-D (transferred: + " T-UF")' }
 *                           email:        { type: string }
 *                           fone:         { type: string }
 *                           ufCrc:        { type: string, description: 'UF embedded in indCrc — for a transferred/secondary number, the origin UF or the suffix UF' }
 *                           numSeqCrc:    { type: string }
 *                           dtCrc:        { type: string, description: 'YYYY-MM-DD' }
 *                 declarant:
 *                   type: object
 *                   required: [nome, cnpj, uf, codMun, indNire, indGrandePorte]
 *                   properties:
 *                     nome:   { type: string }
 *                     cnpj:   { type: string, description: '14 digits' }
 *                     uf:     { type: string }
 *                     codMun: { type: string, description: 'IBGE 7 digits' }
 *                     indNire:        { type: string, enum: ['0', '1'] }
 *                     indGrandePorte: { type: string, enum: ['0', '1'] }
 *                     indFinEsc:      { type: string, enum: ['0', '1'], description: '0=Original (default), 1=Substituta' }
 *                     codHashSub:     { type: string, description: '40 hex — obrigatório quando indFinEsc=1' }
 *                 book:
 *                   type: object
 *                   required: [numOrd, natLivr, dtExSocial]
 *                   properties:
 *                     numOrd:     { type: string }
 *                     natLivr:    { type: string }
 *                     dtExSocial: { type: string, description: 'YYYY-MM-DD' }
 *                 signers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required: [identNom, identCpfCnpj, codAssin, indRespLegal]
 *                     properties:
 *                       identNom:      { type: string }
 *                       identCpfCnpj:  { type: string, description: 'CPF (11 digits, DV validated) or CNPJ (14 alphanumeric positions, format only)' }
 *                       codAssin:      { type: string, description: '3-digit code from the Manual ECD L9 pp. 201-202 qualification table; 900 = Contador. IDENT_QUALIF (description) is NOT accepted — it is derived from this code' }
 *                       indCrc:        { type: string, description: 'CFC format UF-NNNNNN/O-D (transferred: + " T-UF"); required when codAssin=900' }
 *                       email:         { type: string, description: 'required when codAssin=900' }
 *                       fone:          { type: string, description: 'required when codAssin=900' }
 *                       ufCrc:         { type: string, description: 'required when codAssin=900; UF embedded in indCrc — for a transferred/secondary number, the origin UF or the suffix UF' }
 *                       numSeqCrc:     { type: string, description: 'CRC certificate, format UF/AAAA/NUMERO' }
 *                       dtCrc:         { type: string, description: 'YYYY-MM-DD' }
 *                       indRespLegal:  { type: string, enum: [S, N] }
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               description: 'Mesmos campos do application/json acima (declarant/book/signers/verificationTerm como JSON string), mais o arquivo do Termo.'
 *               properties:
 *                 rtf: { type: string, format: binary, description: 'J801.ARQ_RTF — obrigatório quando a ECD é substituta.' }
 *       responses:
 *         '201':
 *           description: ECD export job created
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { $ref: '#/components/schemas/DataExchangeJob' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/sped/qualif-assinante:
 *     get:
 *       summary: Signer qualification table (J930 for ECD, 0930 for ECF) for the SPED screen combobox
 *       description: >-
 *         FE-INCR-SPED-SIGNERS (F-FE-SG-1 - a). Read-only view of the transcribed Tabela de Qualificacao do
 *         Assinante - J930 (Manual ECD L9 pp. 201-202, 19 codes) when layout=ECD, 0930 (Manual ECF L12 p. 105,
 *         17 codes) when layout=ECF; the two tables differ (F-C12-2 - a). 900 = Contador in both. The
 *         description is the manual text, not translated. Same read policy as SPED generation.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: layout, required: true, schema: { type: string, enum: [ECD, ECF] } }
 *       responses:
 *         '200': { description: '[{ code, description }] - code is 3 digits' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/sped/ecf/generate:
 *     post:
 *       summary: Generate the SPED Fiscal (ECF) .txt file for a year (Lucro Presumido)
 *       description: >-
 *         Composes the ECF for the given calendar year (Lucro Presumido) and persists a
 *         plain-text (ISO-8859-1) artifact as an EXPORT job. Luminaris supplies the gross
 *         revenue segregated by activity per quarter (3.1 services to P200/P400 32 percent,
 *         3.3 resale to P200 8 percent / P400 12 percent); the PVA-ECF computes the tax.
 *         Recovered blocks (C, E, J, K) are emitted as empty markers. Download via
 *         /data-exchange/jobs/{jobId}/download. Blocks with 400 + unmappedRevenueAccounts
 *         when a Revenue account with movement is not one of 3.1 / 3.3 (revenue exhaustiveness gate).
 *         X13 PR-2 - prefilled from the company fiscal profile of the year (perfilFiscal.sobrescritos lists
 *         body overrides). 400 REGIME_DIVERGENTE when the profile is not PRESUMIDO and 400
 *         OBRIGACAO_NAO_SE_APLICA for MEI or SIMPLES (IN RFB 2.004/2021 art. 1 par. 1 I).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, year, declarant, signers, socios]
 *               properties:
 *                 unitId: { type: string }
 *                 signerContactIds: { type: array, items: { type: string }, description: 'Via barata (F-CD8-a) - ids de AccountingContact expandidos em signatarios do contador (J930 na ECD, 0930 na ECF) ANTES da validacao; cross-tenant e 404; contato sem telefone e 400 na ECF' }
 *                 year:   { type: integer, example: 2025 }
 *                 retificadora: { type: string, enum: ['N', 'S'], description: 'N=Original (default), S=Retificadora — exige numRec + supersedesJobId (BE-INCR-FIXED-ASSETS PR-4, item 26-31).' }
 *                 numRec: { type: string, description: 'Obrigatório (40 caracteres) quando retificadora=S — hash do recibo da ECF anterior.' }
 *                 supersedesJobId: { type: string, description: 'Obrigatório quando retificadora=S — id do job ECF EXPORTED sendo retificado.' }
 *                 deadlineJustification: { type: string, description: 'Obrigatória quando o exercício está no limite do prazo de retificação (ano-2, art. 8º §4).' }
 *                 socios:
 *                   type: array
 *                   maxItems: 999
 *                   description: >-
 *                     Y600 (BE-INCR-ECF-Y600, L11 of H1) - one ECF complement per partner VALIDITY (partnerId = id of
 *                     the /accounting/partners row) living in the year. The person (name, CPF/CNPJ, PF/PJ, residence,
 *                     share, dates) comes from the partners registry; a validity of the year with no complement, an id
 *                     outside the year, pais incoherent with residence or QUALIF incompatible with person type and
 *                     residence (REGRA_Y600_QUALIF, p. 574) are 400 (ECF_Y600_*). No occurrence at all (no partner and
 *                     no dirigente) is 400 ECF_Y600_SEM_SOCIOS; more than 500 current / 499 other occurrences is 400
 *                     ECF_Y600_LIMITE. The file lists current ones by total paid, then the others by DT_ALT_SOC (p. 570).
 *                   items:
 *                     type: object
 *                     required: [partnerId, qualif, valores]
 *                     properties:
 *                       partnerId:          { type: string }
 *                       qualif:             { type: string, description: '01..17 (18 is refused - REGRA_Y600_QUALIF)' }
 *                       pais:               { type: string, description: '3-digit Sped country code, only for a non-resident partner (never 105)' }
 *                       percCapVotBp:       { type: integer, minimum: 0, maximum: 10000, description: 'voting share in basis points; default = the registry share' }
 *                       representanteLegal: { type: object, required: [cpf, qualif], properties: { cpf: { type: string }, qualif: { type: string, enum: ['01', '02', '03', '04', '05', '06'] } }, description: 'CPF_REP_LEG + QUALIF_REP_LEG, together or none; a PJ partner only takes 01 or 06' }
 *                       valores:            { type: object, required: [remTrabCents, lucDivCents, jurCapCents, demRendCents, irRetCents], description: 'Y600 fields 13-17 in cents, all required, zero must be explicit (Manual ECF L12 p. 570)' }
 *                 dirigentes:
 *                   type: array
 *                   maxItems: 999
 *                   description: 'Y600 - officers/board members who are not in the partners registry (default []). Emitted with PAIS 105, PF and 0 percent shares.'
 *                   items:
 *                     type: object
 *                     required: [nome, cpf, qualif, dtAltSoc, valores]
 *                     properties:
 *                       nome:               { type: string }
 *                       cpf:                { type: string, description: '11 digits, DV validated' }
 *                       qualif:             { type: string, enum: ['10', '11', '12', '13', '14', '15', '16', '17'] }
 *                       dtAltSoc:           { type: string, format: date }
 *                       dtFimSoc:           { type: string, format: date, description: 'must fall within the year (REGRA_DATA_FIM_SOC, p. 574)' }
 *                       representanteLegal: { type: object, required: [cpf, qualif], properties: { cpf: { type: string }, qualif: { type: string, enum: ['01', '02', '03', '04', '05', '06'] } }, description: 'CPF_REP_LEG + QUALIF_REP_LEG, together or none; a PJ partner only takes 01 or 06' }
 *                       valores:            { type: object, required: [remTrabCents, lucDivCents, jurCapCents, demRendCents, irRetCents], description: 'Y600 fields 13-17 in cents, all required, zero must be explicit (Manual ECF L12 p. 570)' }
 *                 declarant:
 *                   type: object
 *                   required: [cnpj, nome, codNat, cnaeFiscal, endereco, bairro, uf, codMun, cep, email]
 *                   properties:
 *                     cnpj:       { type: string, description: '14 digits' }
 *                     nome:       { type: string }
 *                     codNat:     { type: string, description: 'natureza juridica (3-4 digits)' }
 *                     cnaeFiscal: { type: string, description: '7 digits' }
 *                     endereco:   { type: string }
 *                     num:        { type: string }
 *                     bairro:     { type: string }
 *                     uf:         { type: string }
 *                     codMun:     { type: string, description: 'IBGE 7 digits' }
 *                     cep:        { type: string, description: '8 digits' }
 *                     email:      { type: string }
 *                 fiscal:
 *                   type: object
 *                   properties:
 *                     indAliqCsll:    { type: string, enum: ['1', '3', '4', '7', '8'], description: '1 = 9 percent' }
 *                     indRecReceita:  { type: string, enum: ['1', '2'], description: '2 = competencia' }
 *                 signers:
 *                   type: array
 *                   maxItems: 2
 *                   items:
 *                     type: object
 *                     required: [identNom, identCpfCnpj, identQualif, email, fone]
 *                     properties:
 *                       identNom:     { type: string }
 *                       identCpfCnpj: { type: string, description: 'CPF (11 digits, DV validated) or CNPJ (14 alphanumeric positions, format only)' }
 *                       identQualif:  { type: string, description: '3-digit code from the SPEDECF_QUALIF_ASSINANTE table (Manual ECF L12 p. 105); 900 = Contador/Contabilista' }
 *                       indCrc:       { type: string, description: 'CFC format UF-NNNNNN/O-D (transferred: + " T-UF"); required when identQualif=900; omit when blank (an empty string is 400)' }
 *                       email:        { type: string }
 *                       fone:         { type: string }
 *       responses:
 *         '201':
 *           description: ECF export job created
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { $ref: '#/components/schemas/DataExchangeJob' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/sped/ecf/real/generate:
 *     post:
 *       summary: Generate the SPED Fiscal (ECF) .txt file for a year (Lucro Real, Blocos L/M/N)
 *       description: >-
 *         Composes the ECF for the given calendar year in Lucro Real and persists a plain-text
 *         (ISO-8859-1) artifact as an EXPORT job of kind EXPORT_SPED_ECF_REAL (dedicated route,
 *         ADR-INCR-SPED-ECF-FASE3 Fork 1; BRIEF 3B Forks 2-d, 3-a, 4-b, 6-b, 7-a). Block 0 is
 *         parametrized from fiscal (FORMA_TRIB defaults to 1; FORMA_TRIB_PER is REQUIRED, 4 chars in
 *         [0RPAES], one per quarter, no server default; FORMA_APUR comes from the company fiscal profile of
 *         the year - A when the effective form is ANUAL, else T - and an informed value that differs is a 400;
 *         in A, FORMA_TRIB_PER is derived too (R in a quarter with a month in activity, else 0) and must match,
 *         and MES_BAL_RED comes from the confirmed tax assessments of each month in activity, E or B
 *         (X7 Fase B PR-4, BRIEF-B items 18-21)). COD_VER is
 *         resolved from the calendar year (2025 = 0012) or overridden by fiscal.codVer - a year with
 *         no known layout is a 400, never a guessed code. HASH_ECF_ANTERIOR is emitted empty (the PVA
 *         fills it when the previous ECF is recovered). Block L carries L030 periods only (L100/L300
 *         are recovered by the PVA from K155/K156). Blocks M and N are read from the e-Lalur store
 *         (/api/lalur): M010 per Parte B account, M030 per quarter with M300/M350 lines (+ M305/M355
 *         and M310/M360 children by IND_RELACAO), N030 per quarter with the E lines of N500/N620/N630/N660/N670
 *         that carry a value - the PVA computes every CNA/CA line. In the annual form, L030/M030 = A00 + one
 *         A0m per month B, N030 = A00 + one A0m per month B or E; generating needs the A00 Parte B closing and
 *         every month in activity confirmed, and an e-Lalur line in a period the file does not emit is a 400.
 *         The request body never carries adjustments. Download via /data-exchange/jobs/{jobId}/download.
 *         X13 PR-2 - prefilled from the company fiscal profile of the year (perfilFiscal.sobrescritos lists
 *         body overrides). 400 REGIME_DIVERGENTE when the profile is not REAL and 400
 *         OBRIGACAO_NAO_SE_APLICA for MEI or SIMPLES.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, year, declarant, fiscal, signers, socios]
 *               properties:
 *                 unitId: { type: string }
 *                 signerContactIds: { type: array, items: { type: string }, description: 'Via barata (F-CD8-a) - ids de AccountingContact expandidos em signatarios do contador (J930 na ECD, 0930 na ECF) ANTES da validacao; cross-tenant e 404; contato sem telefone e 400 na ECF' }
 *                 year:   { type: integer, example: 2025 }
 *                 retificadora: { type: string, enum: ['N', 'S'], description: 'N=Original (default), S=Retificadora — exige numRec + supersedesJobId (BE-INCR-FIXED-ASSETS PR-4, item 26-31).' }
 *                 numRec: { type: string, description: 'Obrigatório (40 caracteres) quando retificadora=S — hash do recibo da ECF anterior.' }
 *                 supersedesJobId: { type: string, description: 'Obrigatório quando retificadora=S — id do job ECF EXPORTED sendo retificado.' }
 *                 deadlineJustification: { type: string, description: 'Obrigatória quando o exercício está no limite do prazo de retificação (ano-2, art. 8º §4).' }
 *                 socios:
 *                   type: array
 *                   maxItems: 999
 *                   description: >-
 *                     Y600 (BE-INCR-ECF-Y600, L11 of H1) - one ECF complement per partner VALIDITY (partnerId = id of
 *                     the /accounting/partners row) living in the year. The person (name, CPF/CNPJ, PF/PJ, residence,
 *                     share, dates) comes from the partners registry; a validity of the year with no complement, an id
 *                     outside the year, pais incoherent with residence or QUALIF incompatible with person type and
 *                     residence (REGRA_Y600_QUALIF, p. 574) are 400 (ECF_Y600_*). No occurrence at all (no partner and
 *                     no dirigente) is 400 ECF_Y600_SEM_SOCIOS; more than 500 current / 499 other occurrences is 400
 *                     ECF_Y600_LIMITE. The file lists current ones by total paid, then the others by DT_ALT_SOC (p. 570).
 *                   items:
 *                     type: object
 *                     required: [partnerId, qualif, valores]
 *                     properties:
 *                       partnerId:          { type: string }
 *                       qualif:             { type: string, description: '01..17 (18 is refused - REGRA_Y600_QUALIF)' }
 *                       pais:               { type: string, description: '3-digit Sped country code, only for a non-resident partner (never 105)' }
 *                       percCapVotBp:       { type: integer, minimum: 0, maximum: 10000, description: 'voting share in basis points; default = the registry share' }
 *                       representanteLegal: { type: object, required: [cpf, qualif], properties: { cpf: { type: string }, qualif: { type: string, enum: ['01', '02', '03', '04', '05', '06'] } }, description: 'CPF_REP_LEG + QUALIF_REP_LEG, together or none; a PJ partner only takes 01 or 06' }
 *                       valores:            { type: object, required: [remTrabCents, lucDivCents, jurCapCents, demRendCents, irRetCents], description: 'Y600 fields 13-17 in cents, all required, zero must be explicit (Manual ECF L12 p. 570)' }
 *                 dirigentes:
 *                   type: array
 *                   maxItems: 999
 *                   description: 'Y600 - officers/board members who are not in the partners registry (default []). Emitted with PAIS 105, PF and 0 percent shares.'
 *                   items:
 *                     type: object
 *                     required: [nome, cpf, qualif, dtAltSoc, valores]
 *                     properties:
 *                       nome:               { type: string }
 *                       cpf:                { type: string, description: '11 digits, DV validated' }
 *                       qualif:             { type: string, enum: ['10', '11', '12', '13', '14', '15', '16', '17'] }
 *                       dtAltSoc:           { type: string, format: date }
 *                       dtFimSoc:           { type: string, format: date, description: 'must fall within the year (REGRA_DATA_FIM_SOC, p. 574)' }
 *                       representanteLegal: { type: object, required: [cpf, qualif], properties: { cpf: { type: string }, qualif: { type: string, enum: ['01', '02', '03', '04', '05', '06'] } }, description: 'CPF_REP_LEG + QUALIF_REP_LEG, together or none; a PJ partner only takes 01 or 06' }
 *                       valores:            { type: object, required: [remTrabCents, lucDivCents, jurCapCents, demRendCents, irRetCents], description: 'Y600 fields 13-17 in cents, all required, zero must be explicit (Manual ECF L12 p. 570)' }
 *                 declarant:
 *                   type: object
 *                   required: [cnpj, nome, codNat, cnaeFiscal, endereco, bairro, uf, codMun, cep, email]
 *                   properties:
 *                     cnpj:       { type: string, description: '14 digits' }
 *                     nome:       { type: string }
 *                     codNat:     { type: string, description: 'natureza juridica (3-4 digits)' }
 *                     cnaeFiscal: { type: string, description: '7 digits' }
 *                     endereco:   { type: string }
 *                     num:        { type: string }
 *                     bairro:     { type: string }
 *                     uf:         { type: string }
 *                     codMun:     { type: string, description: 'IBGE 7 digits' }
 *                     cep:        { type: string, description: '8 digits' }
 *                     email:      { type: string }
 *                 fiscal:
 *                   type: object
 *                   required: [formaTribPer]
 *                   properties:
 *                     formaTrib:      { type: string, description: '0010.FORMA_TRIB, 1 digit, default 1 (Lucro Real)' }
 *                     formaTribPer:   { type: string, description: '0010.FORMA_TRIB_PER, 4 chars in [0RPAES], one per quarter (Manual pp.71-72), no default' }
 *                     codVer:         { type: string, description: '0000.COD_VER override, 4 digits (e.g. 0012); absent = resolved by calendar year' }
 *                     formaApur:      { type: string, enum: ['T', 'A'], description: 'optional - derived from the fiscal profile of the year (A = ANUAL, else T); informed and different is a 400 (X7 Fase B item 18)' }
 *                     indAliqCsll:    { type: string, enum: ['1', '3', '4', '7', '8'], description: '1 = 9 percent' }
 *                     indRecReceita:  { type: string, enum: ['1', '2'], description: '2 = competencia' }
 *                 signers:
 *                   type: array
 *                   maxItems: 2
 *                   items:
 *                     type: object
 *                     required: [identNom, identCpfCnpj, identQualif, email, fone]
 *                     properties:
 *                       identNom:     { type: string }
 *                       identCpfCnpj: { type: string, description: 'CPF (11 digits, DV validated) or CNPJ (14 alphanumeric positions, format only)' }
 *                       identQualif:  { type: string, description: '3-digit code from the SPEDECF_QUALIF_ASSINANTE table (Manual ECF L12 p. 105); 900 = Contador/Contabilista' }
 *                       indCrc:       { type: string, description: 'CFC format UF-NNNNNN/O-D (transferred: + " T-UF"); required when identQualif=900; omit when blank (an empty string is 400)' }
 *                       email:        { type: string }
 *                       fone:         { type: string }
 *       responses:
 *         '201':
 *           description: ECF (Lucro Real) export job created
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:    { $ref: '#/components/schemas/DataExchangeJob' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 */
export {};
