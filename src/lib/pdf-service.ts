import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { renderMarkdown } from './markdown-renderer';

interface PDFGenerationRequest {
	html: string;
	title: string;
	metadata?: {
		folder?: string;
		author?: string;
		subject?: string;
	};
}

interface PDFGenerationResponse {
	success: boolean;
	pdfBase64?: string;
	error?: string;
}

export async function generateNotePDF(title: string, markdownContent: string): Promise<Uint8Array> {
	try {
		const html = renderMarkdown(markdownContent);
		
		const generatePDF = httpsCallable<PDFGenerationRequest, PDFGenerationResponse>(
			functions, 
			'generatePDF'
		);
		
		const result = await generatePDF({
			html,
			title,
			metadata: {
				author: 'Filo',
				subject: 'Note Export'
			}
		});

		if (!result.data.success || !result.data.pdfBase64) {
			throw new Error(result.data.error || 'PDF generation failed');
		}

		const binaryString = atob(result.data.pdfBase64);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		return bytes;

	} catch (error) {
		console.error('PDF generation error:', error);
		throw new Error(
			error instanceof Error 
				? `PDF generation failed: ${error.message}` 
				: 'PDF generation failed with unknown error'
		);
	}
}

export async function generateFolderPDFs(
	notes: Array<{ title: string; content: string }>,
	onProgress?: (completed: number, total: number, currentTitle: string) => void
): Promise<Array<{ title: string; pdfData: Uint8Array }>> {
	const results: Array<{ title: string; pdfData: Uint8Array }> = [];
	
	for (let i = 0; i < notes.length; i++) {
		const note = notes[i];
		try {
			if (onProgress) {
				onProgress(i, notes.length, note.title);
			}
			
			const pdfData = await generateNotePDF(note.title, note.content);
			results.push({ title: note.title, pdfData });
			
			if (onProgress) {
				onProgress(i + 1, notes.length, note.title);
			}
		} catch (error) {
			console.error(`Failed to generate PDF for note "${note.title}":`, error);
			throw error;
		}
	}
	
	return results;
}