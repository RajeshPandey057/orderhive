import type { Page } from 'puppeteer';
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

async function waitForRenderStability(page: Page) {
	// Avoid waiting on network idle because external CDNs can keep requests open.
	await page.waitForFunction(
		() => document.readyState === 'interactive' || document.readyState === 'complete',
		{
			timeout: 5000
		}
	);

	await page
		.evaluate(async () => {
			if ('fonts' in document) {
				try {
					await document.fonts.ready;
				} catch {
					// Fall through; missing fonts should not block PDF generation.
				}
			}
		})
		.catch(() => {
			// Non-fatal: some Chromium builds may not fully support document.fonts.
		});

	await new Promise((resolve) => setTimeout(resolve, 300));
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

		// Block remote font hosts to prevent hangs from slow/unreachable font CDNs.
		await page.setRequestInterception(true);
		page.on('request', (request) => {
			const url = request.url();
			if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
				request.abort();
				return;
			}
			request.continue();
		});

		// Wait for DOM availability instead of strict network idle.
		await page.setContent(htmlContent, {
			waitUntil: 'domcontentloaded',
			timeout: 15000
		});

		await waitForRenderStability(page);

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

			await page.setRequestInterception(true);
			page.on('request', (request) => {
				const url = request.url();
				if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
					request.abort();
					return;
				}
				request.continue();
			});

			await page.setContent(htmlContent, {
				waitUntil: 'domcontentloaded',
				timeout: 15000
			});

			await waitForRenderStability(page);

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
