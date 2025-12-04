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
COPY --from=build /app/main /app/main
EXPOSE ${PORT}
CMD ["./main"]

