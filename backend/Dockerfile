FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN DATABASE_URL="postgresql://postgres:postgres@postgres:5432/reachinbox?schema=public" npx prisma generate

RUN npm run build

EXPOSE 5000

CMD ["npm", "run", "start"]