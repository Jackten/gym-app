import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const APP_BASE_URL = String(process.env.APP_BASE_URL || 'https://pelayowellness.com').replace(/\/+$/, '');
const TEST_EMAIL = process.env.PELAYO_TEST_EMAIL || 'marcus.chen@agentmail.to';
const CHROME_PATH = process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome';
const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const MCPORTER_CONFIG = '/root/clawd/config/mcporter.json';

function loadAgentMailKey() {
  if (!fs.existsSync(MCPORTER_CONFIG)) {
    throw new Error(`Missing AgentMail config at ${MCPORTER_CONFIG}.`);
  }

  const mcporter = JSON.parse(fs.readFileSync(MCPORTER_CONFIG, 'utf8'));
  const apiKey = process.env.AGENTMAIL_API_KEY || mcporter?.mcpServers?.agentmail?.env?.AGENTMAIL_API_KEY;
  if (!apiKey) throw new Error('Missing AGENTMAIL_API_KEY.');
  return apiKey;
}

const AGENTMAIL_API_KEY = loadAgentMailKey();

function logStep(message) {
  console.log(`[auth-smoke] ${message}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function agentMail(pathname) {
  const response = await fetch(`https://api.agentmail.to/v0${pathname}`, {
    headers: { Authorization: `Bearer ${AGENTMAIL_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`AgentMail ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function latestInboxMessage() {
  const data = await agentMail(`/inboxes/${encodeURIComponent(TEST_EMAIL)}/messages?limit=1`);
  const message = data.messages?.[0] || null;
  return {
    id: message?.message_id || null,
    createdAt: message?.created_at || null,
  };
}

async function waitForFreshMagicLink(afterCreatedAt, timeoutMs = 120_000) {
  const thresholdMs = Date.parse(afterCreatedAt || 0);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const data = await agentMail(`/inboxes/${encodeURIComponent(TEST_EMAIL)}/messages?limit=10`);
    const freshMessage = (data.messages || []).find(
      (message) =>
        /magic link/i.test(message.subject || '')
        && Date.parse(message.created_at || 0) > thresholdMs,
    );

    if (freshMessage) {
      const details = await agentMail(
        `/inboxes/${encodeURIComponent(TEST_EMAIL)}/messages/${encodeURIComponent(freshMessage.message_id)}`,
      );
      const html = details.extracted_html || details.html || '';
      const href = html.match(/href=["']([^"']+)/i)?.[1]?.replace(/&amp;/g, '&') || null;

      return {
        id: freshMessage.message_id,
        createdAt: freshMessage.created_at,
        href,
      };
    }

    await sleep(3_000);
  }

  throw new Error('Timed out waiting for a fresh sign-in email.');
}

async function requestSigninEmail(page) {
  await page.goto(`${APP_BASE_URL}/signin`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByRole('button', { name: /Email/i }).click();
  await page.getByLabel('Email address').fill(TEST_EMAIL);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.getByRole('button', { name: /Send Email Code/i }).click();
    const notice = page.locator('.notice').first();
    await notice.waitFor({ timeout: 15_000 });
    const noticeText = ((await notice.textContent()) || '').replace(/\s+/g, ' ').trim();
    logStep(`UI notice: ${noticeText}`);

    const secondsMatch = noticeText.match(/wait (\d+)s/i) || noticeText.match(/after (\d+) seconds/i);
    if (secondsMatch) {
      await sleep((Number(secondsMatch[1]) + 1) * 1_000);
      continue;
    }

    if (/wait about a minute/i.test(noticeText)) {
      await sleep(65_000);
      continue;
    }

    if (/verification code sent/i.test(noticeText)) {
      return noticeText;
    }

    throw new Error(`Unexpected sign-in notice: ${noticeText}`);
  }

  throw new Error('Sign-in flow stayed in cooldown state.');
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const before = await latestInboxMessage();
    logStep(`Inbox baseline: ${before.id || 'none'} @ ${before.createdAt || 'none'}`);

    await requestSigninEmail(page);
    const mail = await waitForFreshMagicLink(before.createdAt);
    assert(mail.href, 'Fresh sign-in email arrived without a magic link.');
    logStep(`Fresh email: ${mail.id} @ ${mail.createdAt}`);

    await page.goto(mail.href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForURL((url) => url.pathname === '/home' || url.pathname === '/account', {
      timeout: 30_000,
    });
    await page.goto(`${APP_BASE_URL}/account`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByRole('heading', { name: 'Profile' }).waitFor({ timeout: 15_000 });
    await page.locator('.account-field .field-value').filter({ hasText: TEST_EMAIL }).first().waitFor({
      timeout: 15_000,
    });

    logStep(`FINAL_URL ${page.url()}`);
    logStep('AUTH_SMOKE_OK');
  } finally {
    await context.close();
    await browser.close();
  }
}

await run();
