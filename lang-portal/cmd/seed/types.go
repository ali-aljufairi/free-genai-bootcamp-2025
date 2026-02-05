package main

// Config holds database configuration
type Config struct {
	DatabaseURL string // Full connection string (takes precedence)
	Host        string
	Port        string
	Database    string
	User        string
	Password    string
}

// JLPTQuestion represents a JLPT exam question
type JLPTQuestion struct {
	ID               int                      `json:"id"`
	Title            string                   `json:"title"`
	TitleTrans       string                   `json:"title_trans"`
	Level            int                      `json:"level"`
	LevelOfDifficult int                      `json:"level_of_difficult"`
	Kind             string                   `json:"kind"`
	Tag              string                   `json:"tag"`
	Score            int                      `json:"score"`
	CorrectAnswers   []int                    `json:"correct_answers"`
	CheckExplain     int                      `json:"check_explain"`
	CreatedAt        string                   `json:"created_at"`
	UpdatedAt        string                   `json:"updated_at"`
	Time             *int                     `json:"Time"`
	General          map[string]interface{}   `json:"general"`
	Content          []map[string]interface{} `json:"content"`
}

// JLPTFile represents a JSON file containing JLPT questions
type JLPTFile struct {
	Questions []JLPTQuestion `json:"Questions"`
}
