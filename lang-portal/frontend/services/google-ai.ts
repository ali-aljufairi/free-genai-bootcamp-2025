export async function generateImageFromText(text: string): Promise<string> {
    try {
        const response = await fetch('/api/generate-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate image');
        }

        const data = await response.json();
        return data.imageUrl;
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}
