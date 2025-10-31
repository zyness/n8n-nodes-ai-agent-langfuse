# --- START: Das finale, robuste Dockerfile (Custom-Methode) ---

FROM n8nio/n8n:latest

USER root

# Schritt 1: Erstelle ein sauberes Build-Verzeichnis.
WORKDIR /tmp/build

# Schritt 2: Kopiere ZUERST die package.json, um den Docker-Cache zu nutzen.
COPY package*.json ./

# Schritt 3: Installiere ALLE Abhängigkeiten, die wir zum Bauen und Betreiben brauchen.
RUN npm install --include=dev

# Schritt 4: Kopiere den Rest des Quellcodes.
COPY . .

# Schritt 5: Baue den Node.
RUN npm run build

# Schritt 6: (Optional, aber gut) Entferne die devDependencies.
RUN npm prune --omit=dev

# Schritt 7: Erstelle das ZIELVERZEICHNIS, das n8n für custom nodes verwendet.
RUN mkdir -p /home/node/.n8n/custom/

# Schritt 8: DER ENTSCHEIDENDE SCHRITT:
# Kopiere das GESAMTE, fertige Paket (Code, Abhängigkeiten, package.json)
# in das custom-Verzeichnis.
RUN cp -r . /home/node/.n8n/custom/n8n-nodes-ai-agent-langfuse

# Schritt 9: Setze die korrekten Berechtigungen.
RUN chown -R node:node /home/node/.n8n

# Schritt 10: Räume das Build-Verzeichnis auf.
RUN rm -rf /tmp/build

# Wechsle zum n8n-Benutzer.
USER node

# Wechsle in das Standard-Arbeitsverzeichnis von n8n.
WORKDIR /data

# --- ENDE: Dockerfile ---