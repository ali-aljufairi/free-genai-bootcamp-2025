package jellyfin

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"lang-portal/internal/repositories"
	"lang-portal/internal/services"
)

type fakeStore struct {
	words     []repositories.JellyfinDictionaryWord
	err       error
	findCalls int
	forms     []string
}

func (f *fakeStore) FindWords(forms []string) ([]repositories.JellyfinDictionaryWord, error) {
	f.findCalls++
	f.forms = append([]string(nil), forms...)
	return f.words, f.err
}

type fakeTokenizer struct {
	tokens []services.JapaneseToken
	err    error
}

func (f fakeTokenizer) Tokenize(string) ([]services.JapaneseToken, error) { return f.tokens, f.err }

func testApp(store *fakeStore, tokenizer fakeTokenizer) *fiber.App {
	app := fiber.New()
	app.Post("/api/internal/jellyfin/dictionary/analyze", NewHandler(store, tokenizer).Analyze)
	return app
}

func request(t *testing.T, app *fiber.App, body string) (int, map[string]any) {
	t.Helper()
	req := httptest.NewRequest("POST", "/api/internal/jellyfin/dictionary/analyze", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var got map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&got)
	return resp.StatusCode, got
}

func jsonBody(t *testing.T, value any) string {
	t.Helper()
	body, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return string(body)
}

func TestAnalyzeRequiresTextButNotUserID(t *testing.T) {
	store := &fakeStore{words: []repositories.JellyfinDictionaryWord{
		{ID: 7, Kanji: "挨拶", Kana: "あいさつ", English: "greeting", PartOfSpeech: "noun"},
	}}
	app := testApp(store, fakeTokenizer{tokens: []services.JapaneseToken{{Surface: "挨拶", Base: "挨拶"}}})
	if code, _ := request(t, app, `{}`); code != fiber.StatusBadRequest {
		t.Fatalf("missing text: got %d", code)
	}
	code, body := request(t, app, `{"text":"挨拶"}`)
	if code != fiber.StatusOK {
		t.Fatalf("got %d: %#v", code, body)
	}
	token := body["tokens"].([]any)[0].(map[string]any)
	if token["wordId"] != float64(7) || token["reading"] != "あいさつ" {
		t.Fatalf("unexpected token: %#v", token)
	}
	if _, exists := token["status"]; exists {
		t.Fatalf("learning state leaked: %#v", token)
	}
	if store.findCalls != 1 {
		t.Fatalf("expected one batch lookup, got %d", store.findCalls)
	}
}

func TestAnalyzeRanksExactReadingAndFallsBackToReadingLookup(t *testing.T) {
	store := &fakeStore{words: []repositories.JellyfinDictionaryWord{
		{ID: 10, Kanji: "形", Kana: "なり", English: "form", PartOfSpeech: "noun"},
		{ID: 11, Kanji: "形", Kana: "かたち", English: "shape", PartOfSpeech: "noun"},
		{ID: 12, Kanji: "みぬく", Kana: "みぬく", English: "see through", PartOfSpeech: "expression"},
	}}
	app := testApp(store, fakeTokenizer{tokens: []services.JapaneseToken{
		{Surface: "形", Base: "形", Reading: "かたち"},
		{Surface: "見抜く", Base: "見抜く", Reading: "みぬく"},
	}})
	code, body := request(t, app, `{"text":"形 見抜く"}`)
	if code != fiber.StatusOK {
		t.Fatalf("got %d: %#v", code, body)
	}
	tokens := body["tokens"].([]any)
	shape := tokens[0].(map[string]any)
	if shape["wordId"] != float64(11) || shape["english"] != "shape" {
		t.Fatalf("wrong reading candidate selected: %#v", shape)
	}
	seeThrough := tokens[1].(map[string]any)
	if seeThrough["wordId"] != float64(12) || seeThrough["dictionaryForm"] != "見抜く" {
		t.Fatalf("reading fallback failed: %#v", seeThrough)
	}
	if !contains(store.forms, "かたち") || !contains(store.forms, "みぬく") {
		t.Fatalf("token readings were omitted from batch forms: %#v", store.forms)
	}
}

func contains(values []string, wanted string) bool {
	for _, value := range values {
		if value == wanted {
			return true
		}
	}
	return false
}

func TestAnalyzeUnknownTokensSurviveWithStableShape(t *testing.T) {
	store := &fakeStore{words: []repositories.JellyfinDictionaryWord{}}
	app := testApp(store, fakeTokenizer{tokens: []services.JapaneseToken{{Surface: "未知", Base: "未知"}, {Surface: "。", Base: "。"}}})
	code, body := request(t, app, `{"text":"未知。"}`)
	if code != fiber.StatusOK {
		t.Fatal(code, body)
	}
	tokens := body["tokens"].([]any)
	if len(tokens) != 2 {
		t.Fatalf("unknown tokens lost: %#v", tokens)
	}
	for _, raw := range tokens {
		token := raw.(map[string]any)
		for _, key := range []string{"surface", "dictionaryForm", "reading", "wordId", "english", "partOfSpeech", "jlpt"} {
			if _, exists := token[key]; !exists {
				t.Fatalf("missing %s from %#v", key, token)
			}
		}
	}
}

func TestAnalyzeRejectsInvalidAndOversizedRequestsBeforeLookup(t *testing.T) {
	store := &fakeStore{}
	app := testApp(store, fakeTokenizer{})
	cases := []struct {
		name string
		body string
		want int
	}{
		{"malformed", `{`, fiber.StatusBadRequest},
		{"trailing JSON", `{"text":"猫"}{}`, fiber.StatusBadRequest},
		{"unknown field", `{"text":"猫","unexpected":"value"}`, fiber.StatusBadRequest},
		{"blank", `{"text":"  "}`, fiber.StatusBadRequest},
		{"invalid utf8", string(append([]byte(`{"text":"`), append([]byte{0xff}, []byte(`"}`)...)...)), fiber.StatusBadRequest},
		{"oversized text", jsonBody(t, AnalyzeRequest{Text: string(bytes.Repeat([]byte("a"), MaxAnalyzeTextBytes+1))}), fiber.StatusRequestEntityTooLarge},
		{"oversized body", `{"text":"猫","padding":"` + string(bytes.Repeat([]byte("x"), MaxAnalyzeBodyBytes)) + `"}`, fiber.StatusRequestEntityTooLarge},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if code, _ := request(t, app, tc.body); code != tc.want {
				t.Fatalf("got %d want %d", code, tc.want)
			}
		})
	}
	if store.findCalls != 0 {
		t.Fatalf("invalid requests reached store %d times", store.findCalls)
	}
}

func TestAnalyzeHandlesTokenizerAndStoreErrors(t *testing.T) {
	store := &fakeStore{}
	app := testApp(store, fakeTokenizer{err: errors.New("tokenizer")})
	if code, _ := request(t, app, `{"text":"猫"}`); code != fiber.StatusInternalServerError {
		t.Fatal(code)
	}
	store.err = errors.New("database")
	app = testApp(store, fakeTokenizer{tokens: []services.JapaneseToken{{Surface: "猫", Base: "猫"}}})
	if code, _ := request(t, app, `{"text":"猫"}`); code != fiber.StatusInternalServerError {
		t.Fatal(code)
	}
}
