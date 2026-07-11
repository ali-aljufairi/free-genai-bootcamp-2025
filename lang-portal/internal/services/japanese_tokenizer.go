package services

import (
	"fmt"
	"regexp"

	"github.com/ikawaha/kagome-dict/ipa"
	"github.com/ikawaha/kagome/v2/tokenizer"
)

const (
	ipaBaseFormFeature = 6
	ipaReadingFeature  = 7
)

var inlineFurigana = regexp.MustCompile(`([一-龯々〆ヵヶ]+)[(（][ぁ-ゖー]+[)）]`)

// JapaneseToken is a morphological token. Reading is normalized to hiragana
// when the IPA dictionary provides one.
type JapaneseToken struct {
	Surface string
	Base    string
	Reading string
}

// JapaneseTokenizer abstracts morphological analysis for handlers and tests.
type JapaneseTokenizer interface {
	Tokenize(text string) ([]JapaneseToken, error)
}

// KagomeJapaneseTokenizer uses Kagome's embedded MeCab IPA dictionary. The
// analyzer is safe for concurrent Tokenize calls after construction.
type KagomeJapaneseTokenizer struct {
	tokenizer *tokenizer.Tokenizer
}

func NewJapaneseTokenizer() JapaneseTokenizer {
	t, err := tokenizer.New(ipa.Dict(), tokenizer.OmitBosEos())
	if err != nil {
		// The dictionary is compiled into the binary, so an initialization failure
		// means the service cannot provide its advertised analysis correctly.
		panic(fmt.Errorf("initialize Kagome IPA tokenizer: %w", err))
	}
	return &KagomeJapaneseTokenizer{tokenizer: t}
}

func (t *KagomeJapaneseTokenizer) Tokenize(text string) ([]JapaneseToken, error) {
	if text == "" {
		return []JapaneseToken{}, nil
	}

	// Japanese subtitle releases often encode furigana as 漢字(かんじ).
	// Analyze the headword once and let the web overlay preserve the omitted
	// reading as plain display text between returned token surfaces.
	analysisText := inlineFurigana.ReplaceAllString(text, "$1")
	kagomeTokens := t.tokenizer.Tokenize(analysisText)
	out := make([]JapaneseToken, 0, len(kagomeTokens))
	for _, token := range kagomeTokens {
		features := token.Features()
		base := featureOr(features, ipaBaseFormFeature, token.Surface)
		reading := featureOr(features, ipaReadingFeature, "")
		out = append(out, JapaneseToken{
			Surface: token.Surface,
			Base:    base,
			Reading: katakanaToHiragana(reading),
		})
	}
	return out, nil
}

func featureOr(features []string, index int, fallback string) string {
	if index >= len(features) || features[index] == "" || features[index] == "*" {
		return fallback
	}
	return features[index]
}

func katakanaToHiragana(value string) string {
	runes := []rune(value)
	for i, r := range runes {
		if r >= 0x30a1 && r <= 0x30f6 {
			runes[i] = r - 0x60
		}
	}
	return string(runes)
}
