package jellyfin

type AnalyzeRequest struct {
	Text string `json:"text"`
}

type TokenResponse struct {
	Surface        string `json:"surface"`
	DictionaryForm string `json:"dictionaryForm"`
	Reading        string `json:"reading"`
	WordID         *int64 `json:"wordId"`
	English        string `json:"english"`
	PartOfSpeech   string `json:"partOfSpeech"`
	JLPT           *int   `json:"jlpt"`
}

type AnalyzeResponse struct {
	Tokens []TokenResponse `json:"tokens"`
}
