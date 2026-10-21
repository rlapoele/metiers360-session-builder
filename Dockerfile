FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
EXPOSE 4000
CMD ["node", "server/server.mjs"]
