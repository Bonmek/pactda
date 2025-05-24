# Build stage
FROM node:18-alpine AS build

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Serve with static server
FROM node:18-alpine

WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist /app/dist

CMD ["serve", "-s", "dist", "-l", "4173"]
