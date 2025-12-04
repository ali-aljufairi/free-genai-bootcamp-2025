FROM golang:1.24-alpine AS build
RUN apk add --no-cache alpine-sdk

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Run go mod tidy to ensure dependencies are in sync, then build
RUN go mod tidy && CGO_ENABLED=1 GOOS=linux go build -o main cmd/api/main.go

FROM alpine:3.20.1 AS prod
WORKDIR /app
ARG BLUEPRINT_DB_URL=./words.db
ENV BLUEPRINT_DB_URL=${BLUEPRINT_DB_URL}
COPY --from=build /app/main /app/main
COPY --from=build /app/words.db /app/words.db
EXPOSE ${PORT}
CMD ["./main"]

FROM node:20 AS frontend_builder
WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install
COPY frontend/. .
RUN npm run build

FROM node:23-slim AS frontend
RUN npm install -g serve
COPY --from=frontend_builder /frontend/dist /app/dist
EXPOSE 5173
CMD ["serve", "-s", "/app/dist", "-l", "5173"]
