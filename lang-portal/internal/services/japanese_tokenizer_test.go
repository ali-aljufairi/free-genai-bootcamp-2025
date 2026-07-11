package services

import (
	"sync"
	"testing"
)

func TestKagomeJapaneseTokenizerDictionaryFormsAndReadings(t *testing.T) {
	tokenizer := NewJapaneseTokenizer()
	tokens, err := tokenizer.Tokenize("挨拶をしました")
	if err != nil {
		t.Fatal(err)
	}

	assertToken(t, tokens, "挨拶", "挨拶", "あいさつ")
	assertToken(t, tokens, "し", "する", "し")
	assertToken(t, tokens, "まし", "ます", "まし")
}

func TestKagomeJapaneseTokenizerRealSubtitleFixture(t *testing.T) {
	tokenizer := NewJapaneseTokenizer()
	tokens, err := tokenizer.Tokenize("（江戸川(えどがわ)コナン）流れる水には形がない\nたった ひとつの真実 見抜く")
	if err != nil {
		t.Fatal(err)
	}

	assertToken(t, tokens, "江戸川", "江戸川", "えどがわ")
	assertToken(t, tokens, "流れる", "流れる", "ながれる")
	assertToken(t, tokens, "水", "水", "みず")
	assertToken(t, tokens, "形", "形", "かたち")
	assertToken(t, tokens, "見抜く", "見抜く", "みぬく")

	for _, token := range tokens {
		if token.Surface == "えど" || token.Surface == "が" && token.Base == "えどる" {
			t.Fatalf("inline furigana was analyzed as a word: %#v", token)
		}
	}
}

func TestKagomeJapaneseTokenizerPreservesPunctuationAndRepeatedWords(t *testing.T) {
	tokenizer := NewJapaneseTokenizer()
	tokens, err := tokenizer.Tokenize("猫、猫。")
	if err != nil {
		t.Fatal(err)
	}
	wantSurfaces := []string{"猫", "、", "猫", "。"}
	if len(tokens) != len(wantSurfaces) {
		t.Fatalf("got %#v, want surfaces %#v", tokens, wantSurfaces)
	}
	for i, want := range wantSurfaces {
		if tokens[i].Surface != want {
			t.Errorf("token %d surface=%q, want %q", i, tokens[i].Surface, want)
		}
	}
}

func TestKagomeJapaneseTokenizerEmptyInput(t *testing.T) {
	tokens, err := NewJapaneseTokenizer().Tokenize("")
	if err != nil {
		t.Fatal(err)
	}
	if len(tokens) != 0 {
		t.Fatalf("got %#v, want no tokens", tokens)
	}
}

func TestKagomeJapaneseTokenizerConcurrentUse(t *testing.T) {
	tokenizer := NewJapaneseTokenizer()
	const workers = 16
	var wg sync.WaitGroup
	errs := make(chan error, workers)
	for range workers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := tokenizer.Tokenize("流れる水には形がない")
			errs <- err
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
}

func assertToken(t *testing.T, tokens []JapaneseToken, surface, base, reading string) {
	t.Helper()
	for _, token := range tokens {
		if token.Surface == surface {
			if token.Base != base || token.Reading != reading {
				t.Fatalf("token %q=%#v, want base=%q reading=%q", surface, token, base, reading)
			}
			return
		}
	}
	t.Fatalf("token %q not found in %#v", surface, tokens)
}
