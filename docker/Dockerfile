FROM docker.n8n.io/n8nio/n8n

USER root

RUN mkdir -p /opt/n8n-custom-nodes && \
    cd /opt/n8n-custom-nodes && \
    npm install n8n-nodes-ai-agent-langfuse&& \
    chown -R node:node /opt/n8n-custom-nodes

# ENV N8N_CUSTOM_EXTENSIONS="/opt/n8n-custom-nodes"

USER node

ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
