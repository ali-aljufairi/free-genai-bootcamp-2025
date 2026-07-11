package jellyfin

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"
	"unicode/utf8"

	"lang-portal/internal/repositories"
	"lang-portal/internal/services"

	"github.com/gofiber/fiber/v2"
)

const (
	MaxAnalyzeTextBytes = 4096
	MaxAnalyzeBodyBytes = MaxAnalyzeTextBytes + 256
)

type Handler struct {
	store     repositories.JellyfinDictionaryStore
	tokenizer services.JapaneseTokenizer
}

func NewHandler(store repositories.JellyfinDictionaryStore, tokenizer services.JapaneseTokenizer) *Handler {
	return &Handler{store: store, tokenizer: tokenizer}
}

func (h *Handler) Analyze(c *fiber.Ctx) error {
	if len(c.Body()) > MaxAnalyzeBodyBytes {
		return errorJSON(c, fiber.StatusRequestEntityTooLarge, "request body is too large")
	}
	if !utf8.Valid(c.Body()) {
		return errorJSON(c, fiber.StatusBadRequest, "text is required and must be valid UTF-8")
	}
	var req AnalyzeRequest
	decoder := json.NewDecoder(bytes.NewReader(c.Body()))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		return errorJSON(c, fiber.StatusBadRequest, "invalid JSON body")
	}
	if err := ensureJSONEnd(decoder); err != nil {
		return errorJSON(c, fiber.StatusBadRequest, "invalid JSON body")
	}
	if strings.TrimSpace(req.Text) == "" || !utf8.ValidString(req.Text) {
		return errorJSON(c, fiber.StatusBadRequest, "text is required and must be valid UTF-8")
	}
	if len(req.Text) > MaxAnalyzeTextBytes {
		return errorJSON(c, fiber.StatusRequestEntityTooLarge, "text exceeds 4096 bytes")
	}

	tokens, err := h.tokenizer.Tokenize(req.Text)
	if err != nil {
		return errorJSON(c, fiber.StatusInternalServerError, "failed to analyze text")
	}
	forms := make([]string, 0, len(tokens)*3)
	for _, token := range tokens {
		forms = append(forms, token.Surface)
		if token.Base != token.Surface {
			forms = append(forms, token.Base)
		}
		if token.Reading != "" && token.Reading != token.Surface && token.Reading != token.Base {
			forms = append(forms, token.Reading)
		}
	}
	words, err := h.store.FindWords(uniqueNonEmpty(forms))
	if err != nil {
		return errorJSON(c, fiber.StatusInternalServerError, "failed to analyze text")
	}

	response := AnalyzeResponse{Tokens: make([]TokenResponse, 0, len(tokens))}
	for _, token := range tokens {
		item := TokenResponse{Surface: token.Surface, DictionaryForm: token.Base, Reading: token.Reading}
		if word, ok := bestDictionaryWord(token, words); ok {
			item.WordID = &word.ID
			item.English = word.English
			item.PartOfSpeech = word.PartOfSpeech
			item.JLPT = word.JLPT
			if word.Kana != "" {
				item.Reading = word.Kana
			}
		}
		response.Tokens = append(response.Tokens, item)
	}
	return c.JSON(response)
}

func bestDictionaryWord(token services.JapaneseToken, words []repositories.JellyfinDictionaryWord) (repositories.JellyfinDictionaryWord, bool) {
	bestScore := 0
	var best repositories.JellyfinDictionaryWord
	for _, word := range words {
		score := dictionaryMatchScore(token, word)
		if score > bestScore || score == bestScore && score > 0 && word.ID < best.ID {
			bestScore = score
			best = word
		}
	}
	return best, bestScore > 0
}

func dictionaryMatchScore(token services.JapaneseToken, word repositories.JellyfinDictionaryWord) int {
	headwordMatch := word.Kanji == token.Base || word.Kanji == token.Surface
	readingMatch := token.Reading != "" && word.Kana == token.Reading
	switch {
	case headwordMatch && readingMatch:
		return 400
	case headwordMatch:
		return 300
	case word.Kana == token.Base || word.Kana == token.Surface:
		return 250
	case readingMatch || token.Reading != "" && word.Kanji == token.Reading:
		return 200
	default:
		return 0
	}
}

func uniqueNonEmpty(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func ensureJSONEnd(decoder *json.Decoder) error {
	var extra any
	err := decoder.Decode(&extra)
	if err == io.EOF {
		return nil
	}
	if err == nil {
		return fiber.ErrBadRequest
	}
	return err
}

func errorJSON(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(fiber.Map{"error": message})
}
