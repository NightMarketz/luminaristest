"""Patch 12: emissor da NFS-e fora do Simples (lacuna L-20261121-163315-fe42, R05 da revisão de conteúdo de 21/11/2026).

O p11 condicionou a linha do calendário ao regime, mas deixou "o emissor que a Prefeitura de SP exigir". O dossiê
pesquisas-legais/nfse-paulistana-adaptador lê a regra: a IN SF/SUREM 10/2011 art. 1º manda todo prestador de SP emitir
NFS-e; o art. 1º-A (red. IN SF/SUREM 13/2026) põe o optante do Simples só no Emissor Nacional, e o § 2º veda o sistema
próprio do município a ele "inclusive na hipótese de ... virem a ser posteriormente desenquadradas do Simples Nacional"
[nfse-paulistana-adaptador D09]. Sobra a PJ em regime normal que nunca foi do Simples, que emite pela NFS-e Paulistana
(inferido forte no dossiê: nenhum ato lido a manda ao Emissor Nacional).
Base: v48 + p11. Só texto. Uso: python p12_nfse_regime_normal.py <html>
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _pt import aplica

R = [(
    "[\"A cada serviço\",\"NFS-e no emissor que a Prefeitura de SP exigir\",\"o Emissor Nacional é obrigatório só para o optante do Simples (Res. CGSN 140 art. 59 § 1º); confirme com o contador o emissor do regime normal\"]",
    "[\"A cada serviço\",\"NFS-e: Emissor Nacional ou Paulistana\",\"o salão que já foi do Simples continua no Emissor Nacional; o que nunca foi emite a NFS-e Paulistana (IN SF/SUREM 10/2011 arts. 1º e 1º-A § 2º, red. IN SF/SUREM 13/2026)\"]",
)]

if __name__ == "__main__":
    aplica(sys.argv[1], R, "p12_nfse_regime_normal")
