package main

import (
	"database/sql"
	"flag"
	"log"
	"os"

	"github.com/pressly/goose/v3"
	_ "github.com/lib/pq"
)

var (
	flags   = flag.NewFlagSet("migrate", flag.ExitOnError)
	dir     = flags.String("dir", "internal/database/migrations", "directory with migration files")
	verbose = flags.Bool("v", false, "enable verbose mode")
)

func main() {
	flags.Parse(os.Args[1:])
	args := flags.Args()

	if len(args) < 1 {
		flags.Usage()
		log.Fatal("Usage: migrate [command] [args...]")
		return
	}

	command := args[0]

	dbString := os.Getenv("DATABASE_URL")
	if dbString == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	db, err := sql.Open("postgres", dbString)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	if *verbose {
		goose.SetVerbose(true)
	}

	if err := goose.Run(command, db, *dir, args[1:]...); err != nil {
		log.Fatalf("migrate %v: %v", command, err)
	}
}

