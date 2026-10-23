FROM debian:bookworm-slim@sha256:7ff6ba31527b9e336162fa061746c366c4b2032f4d2cff2078bea43f78efe3f8 AS engine-build
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl build-essential cmake zlib1g-dev && rm -rf /var/lib/apt/lists/*
COPY analysis-engine/build-engine.sh analysis-engine/fetch-model.sh /build/
RUN sh /build/build-engine.sh /opt/katago && sh /build/fetch-model.sh /opt/katago/model.bin.gz

FROM node:22.23.3-bookworm-slim@sha256:3ed98443660ff48413b5af19ecefce3b9d50845a901a43420d47cc63a9fddbe9 AS api-build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack pnpm install --frozen-lockfile --prod=false
COPY src ./src
COPY schemas ./schemas
COPY server/analysis ./server/analysis
COPY vite.analysis.config.ts ./
RUN corepack pnpm exec vite build --config vite.analysis.config.ts

FROM node:22.23.3-bookworm-slim@sha256:3ed98443660ff48413b5af19ecefce3b9d50845a901a43420d47cc63a9fddbe9
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 zlib1g && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=engine-build /opt/katago /opt/katago
COPY --from=api-build /app/dist-analysis ./dist-analysis
COPY analysis-engine/analysis.cfg analysis-engine/engine-manifest.json ./analysis-engine/
COPY analysis-engine/licenses ./analysis-engine/licenses
ENV NODE_ENV=production PORT=10000 APP_ROOT=/app
USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=3s --start-period=180s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/readyz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist-analysis/analysis.mjs"]
