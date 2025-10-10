-- Hiragana to Romaji Conversion Function for PostgreSQL
-- This function converts Japanese hiragana characters to romaji (Latin alphabet)
-- Supports all standard hiragana characters including combinations

CREATE OR REPLACE FUNCTION hiragana_to_romaji(hiragana_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    char_length INTEGER;
    current_char TEXT;
    next_char TEXT;
    i INTEGER := 1;
BEGIN
    -- Return NULL or empty string as-is
    IF hiragana_text IS NULL OR hiragana_text = '' THEN
        RETURN hiragana_text;
    END IF;
    
    char_length := char_length(hiragana_text);
    
    WHILE i <= char_length LOOP
        current_char := substring(hiragana_text FROM i FOR 1);
        next_char := CASE WHEN i < char_length THEN substring(hiragana_text FROM i+1 FOR 1) ELSE '' END;
        
        -- Handle small tsu (っ) - double consonant
        IF current_char = 'っ' THEN
            -- Get the first consonant of the next character
            CASE next_char
                WHEN 'か', 'き', 'く', 'け', 'こ', 'が', 'ぎ', 'ぐ', 'げ', 'ご' THEN result := result || 'k';
                WHEN 'さ', 'し', 'す', 'せ', 'そ', 'ざ', 'じ', 'ず', 'ぜ', 'ぞ' THEN result := result || 's';
                WHEN 'た', 'ち', 'つ', 'て', 'と', 'だ', 'ぢ', 'づ', 'で', 'ど' THEN result := result || 't';
                WHEN 'は', 'ひ', 'ふ', 'へ', 'ほ', 'ば', 'び', 'ぶ', 'べ', 'ぼ', 'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ' THEN result := result || 'p';
                WHEN 'ま', 'み', 'む', 'め', 'も' THEN result := result || 'm';
                WHEN 'や', 'ゆ', 'よ' THEN result := result || 'y';
                WHEN 'ら', 'り', 'る', 'れ', 'ろ' THEN result := result || 'r';
                WHEN 'わ', 'ゐ', 'ゑ', 'を', 'ん' THEN result := result || 'w';
                ELSE result := result || 't'; -- Default to 't' for unknown
            END CASE;
            i := i + 1;
            CONTINUE;
        END IF;
        
        -- Handle combinations first (き + ゃ/ゅ/ょ, etc.)
        IF i < char_length THEN
            CASE current_char || next_char
                -- きゃ, きゅ, きょ series
                WHEN 'きゃ' THEN result := result || 'kya'; i := i + 2; CONTINUE;
                WHEN 'きゅ' THEN result := result || 'kyu'; i := i + 2; CONTINUE;
                WHEN 'きょ' THEN result := result || 'kyo'; i := i + 2; CONTINUE;
                -- しゃ, しゅ, しょ series
                WHEN 'しゃ' THEN result := result || 'sha'; i := i + 2; CONTINUE;
                WHEN 'しゅ' THEN result := result || 'shu'; i := i + 2; CONTINUE;
                WHEN 'しょ' THEN result := result || 'sho'; i := i + 2; CONTINUE;
                -- ちゃ, ちゅ, ちょ series
                WHEN 'ちゃ' THEN result := result || 'cha'; i := i + 2; CONTINUE;
                WHEN 'ちゅ' THEN result := result || 'chu'; i := i + 2; CONTINUE;
                WHEN 'ちょ' THEN result := result || 'cho'; i := i + 2; CONTINUE;
                -- にゃ, にゅ, にょ series
                WHEN 'にゃ' THEN result := result || 'nya'; i := i + 2; CONTINUE;
                WHEN 'にゅ' THEN result := result || 'nyu'; i := i + 2; CONTINUE;
                WHEN 'にょ' THEN result := result || 'nyo'; i := i + 2; CONTINUE;
                -- ひゃ, ひゅ, ひょ series
                WHEN 'ひゃ' THEN result := result || 'hya'; i := i + 2; CONTINUE;
                WHEN 'ひゅ' THEN result := result || 'hyu'; i := i + 2; CONTINUE;
                WHEN 'ひょ' THEN result := result || 'hyo'; i := i + 2; CONTINUE;
                -- みゃ, みゅ, みょ series
                WHEN 'みゃ' THEN result := result || 'mya'; i := i + 2; CONTINUE;
                WHEN 'みゅ' THEN result := result || 'myu'; i := i + 2; CONTINUE;
                WHEN 'みょ' THEN result := result || 'myo'; i := i + 2; CONTINUE;
                -- りゃ, りゅ, りょ series
                WHEN 'りゃ' THEN result := result || 'rya'; i := i + 2; CONTINUE;
                WHEN 'りゅ' THEN result := result || 'ryu'; i := i + 2; CONTINUE;
                WHEN 'りょ' THEN result := result || 'ryo'; i := i + 2; CONTINUE;
                -- ぎゃ, ぎゅ, ぎょ series
                WHEN 'ぎゃ' THEN result := result || 'gya'; i := i + 2; CONTINUE;
                WHEN 'ぎゅ' THEN result := result || 'gyu'; i := i + 2; CONTINUE;
                WHEN 'ぎょ' THEN result := result || 'gyo'; i := i + 2; CONTINUE;
                -- じゃ, じゅ, じょ series
                WHEN 'じゃ' THEN result := result || 'ja'; i := i + 2; CONTINUE;
                WHEN 'じゅ' THEN result := result || 'ju'; i := i + 2; CONTINUE;
                WHEN 'じょ' THEN result := result || 'jo'; i := i + 2; CONTINUE;
                -- びゃ, びゅ, びょ series
                WHEN 'びゃ' THEN result := result || 'bya'; i := i + 2; CONTINUE;
                WHEN 'びゅ' THEN result := result || 'byu'; i := i + 2; CONTINUE;
                WHEN 'びょ' THEN result := result || 'byo'; i := i + 2; CONTINUE;
                -- ぴゃ, ぴゅ, ぴょ series
                WHEN 'ぴゃ' THEN result := result || 'pya'; i := i + 2; CONTINUE;
                WHEN 'ぴゅ' THEN result := result || 'pyu'; i := i + 2; CONTINUE;
                WHEN 'ぴょ' THEN result := result || 'pyo'; i := i + 2; CONTINUE;
                ELSE -- Continue to single character processing
            END CASE;
        END IF;
        
        -- Handle single characters
        CASE current_char
            -- Vowels
            WHEN 'あ' THEN result := result || 'a';
            WHEN 'い' THEN result := result || 'i';
            WHEN 'う' THEN result := result || 'u';
            WHEN 'え' THEN result := result || 'e';
            WHEN 'お' THEN result := result || 'o';
            
            -- K series
            WHEN 'か' THEN result := result || 'ka';
            WHEN 'き' THEN result := result || 'ki';
            WHEN 'く' THEN result := result || 'ku';
            WHEN 'け' THEN result := result || 'ke';
            WHEN 'こ' THEN result := result || 'ko';
            
            -- G series
            WHEN 'が' THEN result := result || 'ga';
            WHEN 'ぎ' THEN result := result || 'gi';
            WHEN 'ぐ' THEN result := result || 'gu';
            WHEN 'げ' THEN result := result || 'ge';
            WHEN 'ご' THEN result := result || 'go';
            
            -- S series
            WHEN 'さ' THEN result := result || 'sa';
            WHEN 'し' THEN result := result || 'shi';
            WHEN 'す' THEN result := result || 'su';
            WHEN 'せ' THEN result := result || 'se';
            WHEN 'そ' THEN result := result || 'so';
            
            -- Z series
            WHEN 'ざ' THEN result := result || 'za';
            WHEN 'じ' THEN result := result || 'ji';
            WHEN 'ず' THEN result := result || 'zu';
            WHEN 'ぜ' THEN result := result || 'ze';
            WHEN 'ぞ' THEN result := result || 'zo';
            
            -- T series
            WHEN 'た' THEN result := result || 'ta';
            WHEN 'ち' THEN result := result || 'chi';
            WHEN 'つ' THEN result := result || 'tsu';
            WHEN 'て' THEN result := result || 'te';
            WHEN 'と' THEN result := result || 'to';
            
            -- D series
            WHEN 'だ' THEN result := result || 'da';
            WHEN 'ぢ' THEN result := result || 'ji';
            WHEN 'づ' THEN result := result || 'zu';
            WHEN 'で' THEN result := result || 'de';
            WHEN 'ど' THEN result := result || 'do';
            
            -- N series
            WHEN 'な' THEN result := result || 'na';
            WHEN 'に' THEN result := result || 'ni';
            WHEN 'ぬ' THEN result := result || 'nu';
            WHEN 'ね' THEN result := result || 'ne';
            WHEN 'の' THEN result := result || 'no';
            
            -- H series
            WHEN 'は' THEN result := result || 'ha';
            WHEN 'ひ' THEN result := result || 'hi';
            WHEN 'ふ' THEN result := result || 'fu';
            WHEN 'へ' THEN result := result || 'he';
            WHEN 'ほ' THEN result := result || 'ho';
            
            -- B series
            WHEN 'ば' THEN result := result || 'ba';
            WHEN 'び' THEN result := result || 'bi';
            WHEN 'ぶ' THEN result := result || 'bu';
            WHEN 'べ' THEN result := result || 'be';
            WHEN 'ぼ' THEN result := result || 'bo';
            
            -- P series
            WHEN 'ぱ' THEN result := result || 'pa';
            WHEN 'ぴ' THEN result := result || 'pi';
            WHEN 'ぷ' THEN result := result || 'pu';
            WHEN 'ぺ' THEN result := result || 'pe';
            WHEN 'ぽ' THEN result := result || 'po';
            
            -- M series
            WHEN 'ま' THEN result := result || 'ma';
            WHEN 'み' THEN result := result || 'mi';
            WHEN 'む' THEN result := result || 'mu';
            WHEN 'め' THEN result := result || 'me';
            WHEN 'も' THEN result := result || 'mo';
            
            -- Y series
            WHEN 'や' THEN result := result || 'ya';
            WHEN 'ゆ' THEN result := result || 'yu';
            WHEN 'よ' THEN result := result || 'yo';
            
            -- R series
            WHEN 'ら' THEN result := result || 'ra';
            WHEN 'り' THEN result := result || 'ri';
            WHEN 'る' THEN result := result || 'ru';
            WHEN 'れ' THEN result := result || 're';
            WHEN 'ろ' THEN result := result || 'ro';
            
            -- W series
            WHEN 'わ' THEN result := result || 'wa';
            WHEN 'ゐ' THEN result := result || 'wi';
            WHEN 'ゑ' THEN result := result || 'we';
            WHEN 'を' THEN result := result || 'wo';
            
            -- N
            WHEN 'ん' THEN result := result || 'n';
            
            -- Long vowel mark
            WHEN 'ー' THEN 
                -- Don't add anything, just extend the previous vowel
                NULL;
            
            -- Unknown character - keep as is
            ELSE result := result || current_char;
        END CASE;
        
        i := i + 1;
    END LOOP;
    
    return result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to batch update romaji field in words table
CREATE OR REPLACE FUNCTION update_words_romaji()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update all words where kana is not null but romaji is null or same as kana
    UPDATE words 
    SET romaji = hiragana_to_romaji(kana)
    WHERE kana IS NOT NULL 
    AND (romaji IS NULL OR romaji = kana OR romaji = 'No pronunciation available');
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log the result
    RAISE NOTICE 'Updated romaji for % words', updated_count;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Test function with examples
CREATE OR REPLACE FUNCTION test_hiragana_conversion()
RETURNS TABLE(hiragana TEXT, romaji TEXT) AS $$
BEGIN
    RETURN QUERY VALUES
        ('あい', hiragana_to_romaji('あい')),
        ('あいさつ', hiragana_to_romaji('あいさつ')),
        ('あいじょう', hiragana_to_romaji('あいじょう')),
        ('きょう', hiragana_to_romaji('きょう')),
        ('しゃしん', hiragana_to_romaji('しゃしん')),
        ('がっこう', hiragana_to_romaji('がっこう')),
        ('じっぷん', hiragana_to_romaji('じっぷん')),
        ('りょこう', hiragana_to_romaji('りょこう'));
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION hiragana_to_romaji (TEXT) IS 'Convert hiragana text to romaji with support for all standard characters and combinations';

COMMENT ON FUNCTION update_words_romaji () IS 'Batch update romaji field in words table by converting hiragana kana values';

COMMENT ON FUNCTION test_hiragana_conversion () IS 'Test the hiragana to romaji conversion with sample words';