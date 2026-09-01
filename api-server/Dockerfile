FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 9000
CMD ["node", "api-server/index.js"]
