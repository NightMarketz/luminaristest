"""Utilitário comum dos patches p04+: troca exata com contagem conferida."""
import sys


def aplica(path, repl, nome):
    s = open(path, encoding="utf8").read()
    for item in repl:
        old, new = item[0], item[1]
        exp = item[2] if len(item) > 2 else 1
        n = s.count(old)
        if n != exp:
            sys.exit(f"{nome}: trecho casou {n} vezes (esperado {exp}): {old[:100]!r}")
        s = s.replace(old, new)
    open(path, "w", encoding="utf8", newline="").write(s)
    print(nome, "aplicado")
