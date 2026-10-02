# Arbeitsregeln für dieses Repository

- Jede Änderung direkt auf `main` committen und pushen. Keine Feature-Branches, keine Pull Requests.
- `main` ist die Live-Version: Ein Push auf `main` deployt über Cloudflare Workers Builds sofort. Das ist ausdrücklich gewollt, die neueste Version darf immer direkt live gehen.
- Vor dem Push `git fetch origin main` und neuere Commits von `main` übernehmen, damit nichts überschrieben wird.
- Nach Änderungen an `src/`, `data/` oder der Vorlage `python3 src/build.py` ausführen und das erzeugte `public/index.html` mit committen.
