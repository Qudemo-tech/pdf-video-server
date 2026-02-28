FROM node:20-slim

# Install system dependencies: ffmpeg, poppler-utils (for pdftopm), graphicsmagick (for pdf2pic)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    poppler-utils \
    graphicsmagick \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install all dependencies (including dev for tsc)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Remove dev dependencies after build
RUN npm prune --omit=dev

# Create directories for generated files
RUN mkdir -p public/temp-pages public/output

EXPOSE 4000

CMD ["node", "dist/index.js"]
