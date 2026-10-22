import { Sandbox } from '@e2b/code-interpreter';
import puppeteer from 'puppeteer';

export interface ExecLogEntry {
  id: number;
  context_id: string;
  persona: string;
  code: string;
  output: string;
  success: boolean;
  duration_ms: number;
  timestamp: string;
}

export interface ExecResult {
  output: string;
  success: boolean;
  duration_ms: number;
  visualGraph?: string;
}

// In-memory execution log & session rate limiting
export const exec_log: ExecLogEntry[] = [];
let logAutoId = 1;

// Session caps per context / device
const sessionExecCounts: Record<string, number> = {};
const MAX_EXECUTIONS_PER_SESSION = 20;

/**
 * Puppeteer Headless HTML -> Base64 PNG Renderer
 * Loads compiled output.html (Plotly/Matplotlib/HTML infographics) and captures high-res Retina snapshot.
 */
export async function renderHtmlToImage(htmlContent: string): Promise<string | null> {
  if (!htmlContent || typeof htmlContent !== 'string' || !htmlContent.trim()) return null;
  let browser: any = null;
  try {
    console.log('[Puppeteer Engine] Launching headless browser for chart snapshot extraction...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
      ],
    });

    const page = await browser.newPage();
    // Retina 2x scale for sharp chat visualization rendering
    await page.setViewport({ width: 1000, height: 750, deviceScaleFactor: 2 });

    await page.setContent(htmlContent, {
      waitUntil: 'load',
      timeout: 10000,
    }).catch((e: any) => {
      console.warn('[Puppeteer Engine] setContent load warning:', e?.message);
    });

    // Brief delay to allow Plotly.js / DOM canvas to complete rendering
    await new Promise((r) => setTimeout(r, 1200));

    const imageBuffer = await page.screenshot({ type: 'png', fullPage: true });
    await browser.close();
    browser = null;

    if (imageBuffer && imageBuffer.length > 100) {
      return `data:image/png;base64,${imageBuffer.toString('base64')}`;
    }
    return null;
  } catch (err: any) {
    console.warn('[Puppeteer Engine] Screenshot rendering error:', err?.message || err);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    return null;
  }
}

/**
 * Executes Python code in an isolated E2B Cloud Sandbox.
 * STRICT SECURITY: Requires a device-supplied E2B API Key. Never falls back to process.env.
 */
export async function run_code(
  contextId: string,
  persona: string,
  code: string,
  e2bApiKey?: string,
  timeoutSeconds: number = 25
): Promise<ExecResult> {
  const cleanKey = (e2bApiKey || '').trim();

  // Strict check: No key provided by user device
  if (!cleanKey) {
    const errorMsg = 'E2B API key not configured on this device. Please open the side menu (Keys tab) and enter your E2B API Key.';
    return { output: errorMsg, success: false, duration_ms: 0 };
  }

  // Check execution rate limit
  const currentCount = sessionExecCounts[contextId] || 0;
  if (currentCount >= MAX_EXECUTIONS_PER_SESSION) {
    const limitMsg = `Session execution cap reached (${MAX_EXECUTIONS_PER_SESSION} executions max).`;
    return { output: limitMsg, success: false, duration_ms: 0 };
  }

  const start = Date.now();
  let output = '';
  let success = false;
  let visualGraph: string | undefined;
  let sbx: Sandbox | null = null;

  try {
    // Instantiate E2B Sandbox with user-provided API key
    sbx = await Sandbox.create({
      apiKey: cleanKey,
    });

    // Write current Python code script to sandbox
    try {
      await sbx.files.write('generate_chart.py', code);
    } catch (wErr) {}

    const execution = await sbx.runCode(code, {
      timeoutMs: timeoutSeconds * 1000,
    });

    // 1. Check if execution produced direct PNG results (matplotlib / plotly in notebook)
    if (execution.results && execution.results.length > 0) {
      for (const res of execution.results) {
        if (res.png) {
          visualGraph = `data:image/png;base64,${res.png}`;
          break;
        } else if (res.jpeg) {
          visualGraph = `data:image/jpeg;base64,${res.jpeg}`;
          break;
        }
      }
    }

    // 2. Check for output.png / chart.png / fig.png saved directly in workspace
    if (!visualGraph) {
      const imgCandidates = ['output.png', 'chart.png', 'fig.png', 'plot.png', 'image.png'];
      for (const candidate of imgCandidates) {
        try {
          const rawData = await (sbx.files as any).read(candidate, { format: 'base64' });
          if (rawData && typeof rawData === 'string' && rawData.trim().length > 100) {
            visualGraph = `data:image/png;base64,${rawData.trim()}`;
            break;
          }
        } catch (e) {
          // Candidate file not created
        }
      }
    }

    // 3. Check if output.html was generated in sandbox workspace
    if (!visualGraph) {
      try {
        const htmlContent = await sbx.files.read('output.html');
        if (htmlContent && htmlContent.trim()) {
          console.log('[SandboxClient] Found output.html, triggering Puppeteer image conversion...');
          const renderedPng = await renderHtmlToImage(htmlContent);
          if (renderedPng) {
            visualGraph = renderedPng;
          }
        }
      } catch (readErr) {
        // output.html was not written or not generated
      }
    }

    if (execution.error) {
      output = `Error: ${execution.error.name}: ${execution.error.value}\n${execution.error.traceback || ''}`;
      success = false;
    } else {
      const stdout = execution.logs?.stdout?.join('\n') || '';
      const stderr = execution.logs?.stderr?.join('\n') || '';
      const textResult = execution.text || '';

      // Filter out non-fatal UserWarnings / Kaleido version warnings from stderr
      const filteredStderr = stderr
        .split('\n')
        .filter((line) => !line.includes('UserWarning') && !line.includes('Kaleido') && !line.includes('DeprecationWarning'))
        .join('\n')
        .trim();

      output = [stdout, filteredStderr, textResult].filter(Boolean).join('\n').trim();
      if (!output) {
        output = '(Code executed successfully)';
      }
      success = true;
    }
  } catch (err: any) {
    output = `Execution failed: ${err?.message || String(err)}`;
    success = false;
  } finally {
    // ALWAYS MANDATORY TEARDOWN
    if (sbx) {
      try {
        await sbx.kill();
      } catch (killErr) {
        console.warn('[SandboxClient] Error killing sandbox:', killErr);
      }
    }
  }

  const duration_ms = Date.now() - start;
  sessionExecCounts[contextId] = currentCount + 1;

  // Truncate output before returning to prompt
  const truncatedOutput = output.length > 1000 ? output.slice(0, 1000) + '\n... [output truncated]' : output;

  // Log execution
  exec_log.push({
    id: logAutoId++,
    context_id: contextId,
    persona,
    code,
    output: truncatedOutput,
    success,
    duration_ms,
    timestamp: new Date().toISOString(),
  });

  return {
    output: truncatedOutput,
    success,
    duration_ms,
    visualGraph,
  };
}
