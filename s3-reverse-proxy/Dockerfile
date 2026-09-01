FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 8000
CMD ["node", "s3-reverse-proxy/index.js"]
