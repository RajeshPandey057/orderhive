import puppeteer from 'puppeteer';

export interface PDFGenerationOptions {
	htmlContent: string;
	format?: 'A4' | 'Letter';
	printBackground?: boolean;
	margin?: {
		top?: string;
		right?: string;
		bottom?: string;
		left?: string;
	};
}

/**
 * Generate a PDF from HTML content using Puppeteer
 * This properly renders CSS including Tailwind styles before conversion
 */
export async function generatePDFFromHTML(options: PDFGenerationOptions): Promise<Buffer> {
	const {
		htmlContent,
		format = 'A4',
		printBackground = true,
		margin = { top: '0', right: '0', bottom: '0', left: '0' }
	} = options;

	let browser;
	try {
		// Launch headless browser — use system Chromium when available (set via PUPPETEER_EXECUTABLE_PATH)
		browser = await puppeteer.launch({
			headless: true,
			executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
			args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
		});

		const page = await browser.newPage();

		// Set content and wait for resources to load
		await page.setContent(htmlContent, {
			waitUntil: ['load', 'networkidle0']
		});

		// Give extra time for Tailwind CSS to load from CDN
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Generate PDF
		const pdfBuffer = await page.pdf({
			format,
			printBackground,
			margin,
			preferCSSPageSize: true
		});

		return Buffer.from(pdfBuffer);
	} catch (error) {
		console.error('Error generating PDF:', error);
		if (error instanceof Error) {
			throw new Error(`Failed to generate PDF: ${error.message}`);
		}
		throw new Error('Failed to generate PDF');
	} finally {
		if (browser) {
			await browser.close();
		}
	}
}

/**
 * Generate multiple PDFs from HTML contents
 * Reuses the same browser instance for better performance
 */
export async function generateMultiplePDFs(documents: PDFGenerationOptions[]): Promise<Buffer[]> {
	let browser;
	try {
		browser = await puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
		});

		const pdfs: Buffer[] = [];

		for (const doc of documents) {
			const {
				htmlContent,
				format = 'A4',
				printBackground = true,
				margin = { top: '0', right: '0', bottom: '0', left: '0' }
			} = doc;

			const page = await browser.newPage();

			await page.setContent(htmlContent, {
				waitUntil: ['load', 'networkidle0']
			});

			await new Promise((resolve) => setTimeout(resolve, 1000));

			const pdfBuffer = await page.pdf({
				format,
				printBackground,
				margin,
				preferCSSPageSize: true
			});

			pdfs.push(Buffer.from(pdfBuffer));

			await page.close();
		}

		return pdfs;
	} catch (error) {
		console.error('Error generating multiple PDFs:', error);
		if (error instanceof Error) {
			throw new Error(`Failed to generate PDFs: ${error.message}`);
		}
		throw new Error('Failed to generate PDFs');
	} finally {
		if (browser) {
			await browser.close();
		}
	}
}
