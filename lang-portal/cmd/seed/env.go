package main

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

var (
	DataDir      string
	DBDataDir    string
	KanjiSVGPath string
	JLPTDataDir  string
)

func init() {
	refreshSeedPaths()
}

func refreshSeedPaths() {
	dataDir := strings.TrimSpace(os.Getenv("DATA_DIR"))
	if dataDir == "" {
		dataDir = "data/cleaned_json"
	}
	DataDir = dataDir

	dbDir := strings.TrimSpace(os.Getenv("DB_DATA_DIR"))
	if dbDir == "" {
		dbDir = filepath.Join(DataDir, "db")
	}
	DBDataDir = dbDir

	svgPath := strings.TrimSpace(os.Getenv("KANJI_SVG_PATH"))
	if svgPath == "" {
		svgPath = filepath.Join(DataDir, "kanji_svg_strokes.json")
	}
	KanjiSVGPath = svgPath

	jlptDir := strings.TrimSpace(os.Getenv("JLPT_DATA_DIR"))
	if jlptDir == "" {
		jlptDir = filepath.Join(DataDir, "jlpt")
	}
	JLPTDataDir = jlptDir
}

// loadEnvFile loads environment variables from .env file
func loadEnvFile(filename string) error {
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Split on first = sign
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		// Only set if not already set by environment
		if os.Getenv(key) == "" {
			os.Setenv(key, value)
		}
	}

	if err := scanner.Err(); err != nil {
		return err
	}

	refreshSeedPaths()
	return nil
}
