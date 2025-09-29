package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strconv"
)

func main() {
	// Read CSV
	csvFile, err := os.Open("c.csv")
	if err != nil {
		fmt.Println("Error opening CSV:", err)
		return
	}
	defer csvFile.Close()

	reader := csv.NewReader(csvFile)
	// Skip header
	_, err = reader.Read()
	if err != nil {
		fmt.Println("Error reading header:", err)
		return
	}

	phoneticMap := make(map[int]string)
	jlptMap := make(map[int]int)
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			fmt.Println("Error reading record:", err)
			continue
		}
		id, err := strconv.Atoi(record[0])
		if err != nil {
			fmt.Println("Error parsing ID:", err)
			continue
		}
		kana := record[1]
		jlpt, err := strconv.Atoi(record[4])
		if err != nil {
			fmt.Println("Error parsing JLPT:", err)
			continue
		}
		phoneticMap[id] = kana
		jlptMap[id] = jlpt
	}

	// Read JSON
	jsonFile, err := os.Open("cleaned_json/javi_cleaned.json")
	if err != nil {
		fmt.Println("Error opening JSON:", err)
		return
	}
	defer jsonFile.Close()

	var words []map[string]interface{}
	decoder := json.NewDecoder(jsonFile)
	if err := decoder.Decode(&words); err != nil {
		fmt.Println("Error decoding JSON:", err)
		return
	}

	// Update phonetic and level
	updated := 0
	for i, word := range words {
		if idFloat, ok := word["id"].(float64); ok {
			id := int(idFloat)
			if kana, exists := phoneticMap[id]; exists {
				words[i]["phonetic"] = kana
				if jlpt, exists := jlptMap[id]; exists {
					words[i]["level"] = jlpt
				}
				updated++
			}
		}
	}

	// Write back JSON
	output, err := json.MarshalIndent(words, "", "  ")
	if err != nil {
		fmt.Println("Error marshaling JSON:", err)
		return
	}

	if err := os.WriteFile("cleaned_json/javi_cleaned.json", output, 0644); err != nil {
		fmt.Println("Error writing JSON:", err)
		return
	}

	fmt.Printf("Updated %d words with phonetic readings\n", updated)
}
