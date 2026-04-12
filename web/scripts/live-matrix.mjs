import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright-core';

const APP_BASE_URL = String(process.env.APP_BASE_URL || 'https://gym-app-navy-nine.vercel.app').replace(/\/+$/, '');
const TEST_EMAIL = process.env.PELAYO_TEST_EMAIL || 'marcus.chen@agentmail.to';
const TEST_NAME = process.env.PELAYO_TEST_NAME || 'Marcus Chen';
const CHROME_PATH = process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome';
const SUPABASE_PROJECT_REF = 'rgcnvghjmdkannkgocrj';
const SUPABASE_AUTH_STORAGE_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
const BUSINESS_TIMEZONE = 'America/New_York';
const ROOT_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const MCPORTER_CONFIG = '/root/clawd/config/mcporter.json';
const SUPABASE_ENV_FILE = path.join(ROOT_DIR, '.env.local.d', 'supabase.env');
const supabaseEnv = loadDotEnv(SUPABASE_ENV_FILE);

function loadDotEnv(filePath) {
  const values = {};
  if (!fs.existsSync(filePath)) return values;

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...rest] = line.split('=');
    values[key] = rest.join('=').trim();
  }

  return values;
}

function loadSecrets() {
  const mcporter = fs.existsSync(MCPORTER_CONFIG)
    ? JSON.parse(fs.readFileSync(MCPORTER_CONFIG, 'utf8'))
    : null;

  const supabaseManagementToken = process.env.SUPABASE_MANAGEMENT_TOKEN
    || supabaseEnv.SUPABASE_MANAGEMENT_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL || supabaseEnv.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || supabaseEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5fJLcvBiWvnED48jZigkKw_ICrWrWww';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseManagementToken) throw new Error('Missing SUPABASE_MANAGEMENT_TOKEN.');
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL.');
  if (!supabaseAnonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY.');
  if (!supabaseServiceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');

  return {
    supabaseManagementToken,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
  };
}

const secrets = loadSecrets();

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function timeToMinutes(value) {
  const [hours = '0', minutes = '0'] = String(value || '').split(':');
  return Number(hours) * 60 + Number(minutes);
}

function getBusinessNowParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return {
    dateInput: `${parts.year}-${parts.month}-${parts.day}`,
    timeInput: `${parts.hour}:${parts.minute}`,
  };
}

function supabaseQuery(query) {
  const payload = JSON.stringify({ query });
  const response = execFileSync(
    'curl',
    [
      '-sS',
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
      '-H',
      `Authorization: Bearer ${secrets.supabaseManagementToken}`,
      '-H',
      'Content-Type: application/json',
      '-H',
      'User-Agent: Mozilla/5.0',
      '--data-binary',
      '@-',
    ],
    { encoding: 'utf8', input: payload },
  );
  const parsed = JSON.parse(response);
  if (Array.isArray(parsed)) return parsed;
  throw new Error(`Supabase SQL query failed: ${JSON.stringify(parsed)}`);
}

function createAdminMagicLink() {
  const payload = JSON.stringify({
    type: 'magiclink',
    email: TEST_EMAIL,
    options: {
      redirectTo: `${APP_BASE_URL}/auth/callback`,
    },
  });

  const response = execFileSync(
    'curl',
    [
      '-sS',
      `${secrets.supabaseUrl}/auth/v1/admin/generate_link`,
      '-H',
      `apikey: ${secrets.supabaseServiceRoleKey}`,
      '-H',
      `Authorization: Bearer ${secrets.supabaseServiceRoleKey}`,
      '-H',
      'Content-Type: application/json',
      '--data-binary',
      '@-',
    ],
    { encoding: 'utf8', input: payload },
  );

  return JSON.parse(response);
}

function extractLinks(html = '') {
  return [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map((match) => match[1].replace(/&amp;/g, '&'))
    .filter((value) => /^https?:\/\//i.test(value));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function logStep(message) {
  console.log(`[matrix] ${message}`);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function cleanupUserState() {
  logStep('Cleaning up existing test bookings');
  supabaseQuery(`
    with target_user as (
      select id from auth.users where email = ${sqlLiteral(TEST_EMAIL)}
    )
    delete from public.bookings
    where user_id in (select id from target_user);

    with target_user as (
      select id from auth.users where email = ${sqlLiteral(TEST_EMAIL)}
    )
    delete from public.recurring_groups
    where user_id in (select id from target_user);
  `);
}

function fetchUserBookings() {
  return supabaseQuery(`
    with target_user as (
      select id from auth.users where email = ${sqlLiteral(TEST_EMAIL)}
    )
    select
      id::text,
      slot_date::text,
      start_time::text,
      end_time::text,
      duration_minutes,
      status,
      coalesce(recurring_group_id::text, '') as recurring_group_id
    from public.bookings
    where user_id in (select id from target_user)
    order by slot_date asc, start_time asc;
  `);
}

async function waitForUserBookings(predicate, { timeoutMs = 8_000, intervalMs = 250, description = 'expected booking state' } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const rows = fetchUserBookings();
    if (predicate(rows)) {
      return rows;
    }
    await sleep(intervalMs);
  }

  const rows = fetchUserBookings();
  throw new Error(`Timed out waiting for ${description}. Last rows: ${JSON.stringify(rows)}`);
}

async function buildAuthenticatedContext(browser) {
  logStep('Generating admin auth code for the test user');
  const authLinkData = createAdminMagicLink();
  assert(authLinkData.email_otp, 'Admin magic link generation returned no email_otp.');

  const supabase = createClient(secrets.supabaseUrl, secrets.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.verifyOtp({
    email: TEST_EMAIL,
    token: authLinkData.email_otp,
    type: 'email',
  });

  if (error) {
    throw new Error(`Unable to verify test OTP: ${error.message}`);
  }

  assert(data?.session, 'Verified test OTP did not return a session.');

  const context = await browser.newContext();
  const sessionJson = JSON.stringify(data.session);
  await context.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: SUPABASE_AUTH_STORAGE_KEY, value: sessionJson },
  );

  return context;
}

async function ensureAuthenticated(page) {
  await page.goto(`${APP_BASE_URL}/account`, { waitUntil: 'domcontentloaded' });
  await page.getByText(TEST_EMAIL, { exact: true }).waitFor({ timeout: 12_000 });
  assert(!page.url().includes('/signin'), 'Preloaded Supabase session did not establish a browser login.');
  logStep('Authenticated successfully');
}

async function expectSlotSelection(page, label) {
  await page.locator('.selected-slot-cart').waitFor({ timeout: 5_000 });
  const summary = (await page.locator('.selected-slot-cart').textContent()) || '';
  assert(summary.includes(label), `Selected slot cart did not include ${label}.`);
}

async function pickOpenSlot(page, { startDayIndex = 0, excludeLabels = [] } = {}) {
  const dayButtons = page.locator('.calendar-day-chip');
  const dayCount = await dayButtons.count();
  logStep(`Searching for an open slot from day index ${startDayIndex} across ${dayCount} visible days`);

  for (let dayIndex = startDayIndex; dayIndex < dayCount; dayIndex += 1) {
    await dayButtons.nth(dayIndex).click();
    await page.locator('.slot-row, .muted').first().waitFor({ timeout: 5_000 });
    const openSlots = page.locator('.slot-row:not([disabled])');
    const slotCount = await openSlots.count();
    logStep(`Day index ${dayIndex} has ${slotCount} open slot buttons`);

    for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
      const slot = openSlots.nth(slotIndex);
      const label = (await slot.locator('.slot-row-time').textContent())?.trim();
      if (!label || excludeLabels.includes(label)) continue;
      await slot.click();
      await expectSlotSelection(page, label);
      return {
        dayIndex,
        dayDateInput: formatDateInput(addDays(new Date(), dayIndex)),
        weekday: addDays(new Date(), dayIndex).getDay(),
        label,
      };
    }
  }

  throw new Error('No open slot found in the visible two-week range.');
}

async function pickSpecificSlot(page, { dayIndex, label }) {
  const dayButtons = page.locator('.calendar-day-chip');
  await dayButtons.nth(dayIndex).click();
  await page.locator('.slot-row, .muted').first().waitFor({ timeout: 5_000 });

  const slotButton = page.locator('.slot-row:not([disabled])').filter({ hasText: label }).first();
  await slotButton.click();
  await expectSlotSelection(page, label);
}

async function goToReviewStep(page) {
  logStep('Advancing from slot selection to recurrence review');
  await page.getByRole('button', { name: /^Continue$/i }).click();
  await page.getByRole('button', { name: /Set repeat pattern/i }).click();
}

async function confirmBooking(page) {
  logStep('Generating review and confirming booking');
  await page.getByRole('button', { name: /Review generated sessions/i }).click();
  await page.getByRole('heading', { name: /Review and confirm/i }).waitFor({ timeout: 10_000 });
  await page.getByRole('button', { name: /Confirm booking/i }).click();
  try {
    await page.waitForURL((url) => url.pathname === '/bookings', { timeout: 20_000 });
    await page.waitForTimeout(2000);
  } catch (error) {
    const notice = await page.locator('.notice').first().textContent().catch(() => '');
    const body = (await page.textContent('body')).replace(/\s+/g, ' ');
    throw new Error(
      `Booking confirmation did not redirect. Current URL: ${page.url()}. Notice: ${String(notice || '').trim() || 'none'}. Body: ${body.slice(0, 500)}`,
    );
  }
}

async function expectBookingFailure(page, expectedPattern) {
  logStep('Confirming booking and expecting a validation failure');
  await page.getByRole('button', { name: /Review generated sessions/i }).click();
  await page.getByRole('heading', { name: /Review and confirm/i }).waitFor({ timeout: 10_000 });
  await page.getByRole('button', { name: /Confirm booking/i }).click();
  const notice = page.locator('.notice').first();
  await notice.waitFor({ timeout: 10_000 });
  const noticeText = (await notice.textContent()) || '';
  assert(expectedPattern.test(noticeText), `Expected booking failure notice to match ${expectedPattern}, got: ${noticeText}`);
}

async function createSingleBooking(page) {
  logStep('Scenario: single booking create/edit/cancel');
  await cleanupUserState();
  logStep('Opening session page for single booking');
  await page.goto(`${APP_BASE_URL}/session`, { waitUntil: 'domcontentloaded' });
  const firstSlot = await pickOpenSlot(page);
  await goToReviewStep(page);
  await confirmBooking(page);

  let bookings = await waitForUserBookings(
    (rows) => rows.length === 1 && rows[0].status === 'confirmed',
    { description: 'single booking creation' },
  );
  assert(bookings.length === 1, `Expected 1 booking after single create, found ${bookings.length}.`);
  const bookingId = bookings[0].id;
  const bookingDate = bookings[0].slot_date;
  const originalTime = bookings[0].start_time.slice(0, 5);
  logStep(`Single booking created for ${firstSlot.dayDateInput} ${originalTime}`);

  await page.goto(`${APP_BASE_URL}/bookings`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Edit time$/i }).first().click();
  const select = page.locator('select').first();
  const optionValues = await select.locator('option').evaluateAll((nodes) => nodes.map((node) => node.value));
  const newTime = pickFutureOptionValue(optionValues, {
    dateInput: bookingDate,
    excludeValues: [originalTime],
  });
  assert(newTime, 'Could not find an alternate time for single-booking edit.');
  await select.selectOption(newTime);
  await page.getByRole('button', { name: /^Save$/i }).click();
  bookings = await waitForUserBookings(
    (rows) => rows.some((row) => row.id === bookingId && row.start_time.slice(0, 5) === newTime),
    { description: 'single booking edit' },
  );
  const edited = bookings.find((row) => row.id === bookingId);
  assert(edited?.start_time.slice(0, 5) === newTime, 'Single-booking edit did not persist the new time.');
  logStep(`Single booking edited from ${originalTime} to ${newTime}`);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /^Cancel$/i }).first().click();
  bookings = await waitForUserBookings(
    (rows) => rows.some((row) => row.id === bookingId && row.status === 'cancelled'),
    { description: 'single booking cancellation' },
  );
  const cancelled = bookings.find((row) => row.id === bookingId);
  assert(cancelled?.status === 'cancelled', 'Single-booking cancel did not persist cancelled status.');
  logStep('Single booking cancelled successfully');
}

async function createBatchBooking(page) {
  logStep('Scenario: multi-day multi-session batch booking');
  await cleanupUserState();
  logStep('Opening session page for batch booking');
  await page.goto(`${APP_BASE_URL}/session`, { waitUntil: 'domcontentloaded' });

  const first = await pickOpenSlot(page, { startDayIndex: 0 });
  const second = await pickOpenSlot(page, { startDayIndex: first.dayIndex + 1 });
  logStep(`Selected batch slots ${first.dayDateInput} ${first.label} and ${second.dayDateInput} ${second.label}`);

  await goToReviewStep(page);
  await confirmBooking(page);

  const bookings = await waitForUserBookings(
    (rows) => rows.filter((row) => row.status === 'confirmed').length === 2,
    { description: 'batch booking creation' },
  );
  const confirmed = bookings.filter((row) => row.status === 'confirmed');
  assert(confirmed.length === 2, `Expected 2 confirmed batch bookings, found ${confirmed.length}.`);
  assert(confirmed.every((row) => row.recurring_group_id === ''), 'Expected non-recurring batch bookings.');
  logStep('Multi-day batch booking created successfully');
}

async function rejectPastEditForToday(page) {
  logStep('Scenario: same-day past edit rejection');
  await cleanupUserState();
  await page.goto(`${APP_BASE_URL}/session`, { waitUntil: 'domcontentloaded' });

  const firstSlot = await pickOpenSlot(page);
  if (firstSlot.dayIndex !== 0) {
    logStep('Skipping same-day past edit rejection because no same-day future slots remain.');
    return;
  }

  await goToReviewStep(page);
  await confirmBooking(page);

  let bookings = await waitForUserBookings(
    (rows) => rows.length === 1 && rows[0].status === 'confirmed',
    { description: 'same-day booking creation before past edit rejection' },
  );
  const bookingId = bookings[0].id;
  const originalTime = bookings[0].start_time.slice(0, 5);

  await page.goto(`${APP_BASE_URL}/bookings`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Edit time$/i }).first().click();
  await page.locator('select').first().selectOption('00:00');
  await page.getByRole('button', { name: /^Save$/i }).click();
  const notice = page.locator('.notice').first();
  await notice.waitFor({ timeout: 10_000 });
  const noticeText = (await notice.textContent()) || '';
  assert(/future/i.test(noticeText), `Expected past-edit rejection notice, got: ${noticeText}`);

  bookings = fetchUserBookings();
  const unchanged = bookings.find((row) => row.id === bookingId);
  assert(unchanged?.start_time.slice(0, 5) === originalTime, 'Past edit rejection still changed the booking time.');
  logStep('Same-day past edit was rejected as expected');
}

async function rejectOverlappingBooking(page) {
  logStep('Scenario: same-user overlapping booking rejection');
  await cleanupUserState();
  await page.goto(`${APP_BASE_URL}/session`, { waitUntil: 'domcontentloaded' });

  const firstSlot = await pickOpenSlot(page);
  await goToReviewStep(page);
  await confirmBooking(page);

  const initialRows = await waitForUserBookings(
    (rows) => rows.filter((row) => row.status === 'confirmed').length === 1,
    { description: 'initial booking before overlap attempt' },
  );
  const initialCount = initialRows.filter((row) => row.status === 'confirmed').length;

  await page.goto(`${APP_BASE_URL}/session`, { waitUntil: 'domcontentloaded' });
  await pickSpecificSlot(page, { dayIndex: firstSlot.dayIndex, label: firstSlot.label });
  await goToReviewStep(page);
  await expectBookingFailure(page, /overlaps this time/i);

  const afterRows = fetchUserBookings();
  const afterCount = afterRows.filter((row) => row.status === 'confirmed').length;
  assert(afterCount === initialCount, `Expected overlap rejection to leave ${initialCount} confirmed booking, found ${afterCount}.`);
  logStep('Overlapping booking attempt was rejected as expected');
}

async function configureRecurringPattern(page, weekday, endDateInput, skipDateInput) {
  await page.getByLabel('Repeat frequency').selectOption('weekly');
  await page.locator('.recurrence-panel input[type="date"]').nth(0).fill(endDateInput);

  const weekdayButtons = page.locator('.weekday-chip');
  const weekdayCount = await weekdayButtons.count();
  for (let index = 0; index < weekdayCount; index += 1) {
    const isOn = await weekdayButtons.nth(index).evaluate((node) => node.classList.contains('on'));
    const shouldBeOn = index === weekday;
    if (isOn !== shouldBeOn) {
      await weekdayButtons.nth(index).click();
      await page.waitForTimeout(100);
    }
  }

  const skipInput = page.locator('.recurrence-panel input[type="date"]').nth(1);
  await skipInput.fill(skipDateInput);
  await page.getByRole('button', { name: /Add skip date/i }).click();
}

async function createAndMutateRecurringSeries(page) {
  logStep('Scenario: recurring series create/edit/cancel');
  await cleanupUserState();
  logStep('Opening session page for recurring booking');
  await page.goto(`${APP_BASE_URL}/session`, { waitUntil: 'domcontentloaded' });

  const slot = await pickOpenSlot(page, { startDayIndex: 0 });
  const endDate = formatDateInput(addDays(new Date(`${slot.dayDateInput}T00:00:00`), 21));
  const skipDate = formatDateInput(addDays(new Date(`${slot.dayDateInput}T00:00:00`), 14));
  logStep(`Selected recurring slot ${slot.dayDateInput} ${slot.label}; end=${endDate}, skip=${skipDate}`);

  await goToReviewStep(page);
  await configureRecurringPattern(page, slot.weekday, endDate, skipDate);
  await confirmBooking(page);

  let bookings = await waitForUserBookings(
    (rows) => rows.filter((row) => row.status === 'confirmed').length === 3,
    { description: 'recurring booking creation' },
  );
  let confirmed = bookings.filter((row) => row.status === 'confirmed');
  assert(confirmed.length === 3, `Expected 3 confirmed recurring bookings, found ${confirmed.length}.`);
  const recurringGroupId = confirmed[0].recurring_group_id;
  assert(recurringGroupId && confirmed.every((row) => row.recurring_group_id === recurringGroupId), 'Recurring bookings did not share a recurring_group_id.');

  const { dateInput: businessToday } = getBusinessNowParts();
  const seriesIncludesToday = confirmed.some((row) => row.slot_date === businessToday);
  const targetRecurringBooking = confirmed[confirmed.length - 1];
  const originalRecurringTime = targetRecurringBooking.start_time.slice(0, 5);
  await page.goto(`${APP_BASE_URL}/bookings`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Edit one \/ all/i }).first().click();

  const select = page.locator('select').first();
  const optionValues = await select.locator('option').evaluateAll((nodes) => nodes.map((node) => node.value));
  const oneTimeEdit = pickFutureOptionValue(optionValues, {
    dateInput: targetRecurringBooking.slot_date,
    excludeValues: [originalRecurringTime],
  });
  assert(oneTimeEdit, 'Could not find alternate time for recurring single edit.');
  await select.selectOption(oneTimeEdit);
  await page.getByLabel(/This session only/i).check();
  await page.getByRole('button', { name: /^Save$/i }).click();
  bookings = await waitForUserBookings(
    (rows) => rows.filter((row) => row.status === 'confirmed' && row.start_time.slice(0, 5) === oneTimeEdit).length === 1,
    { description: 'recurring single edit' },
  );
  confirmed = bookings.filter((row) => row.status === 'confirmed');
  const changedRows = confirmed.filter((row) => row.start_time.slice(0, 5) === oneTimeEdit);
  assert(changedRows.length === 1, `Expected exactly 1 recurring row to move to ${oneTimeEdit}, found ${changedRows.length}.`);
  logStep(`Recurring single edit updated one occurrence to ${oneTimeEdit}`);

  await page.goto(`${APP_BASE_URL}/bookings`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Edit one \/ all/i }).first().click();

  const secondSelect = page.locator('select').first();
  const secondValues = await secondSelect.locator('option').evaluateAll((nodes) => nodes.map((node) => node.value));
  const allEditTime = pickFutureOptionValue(secondValues, {
    dateInput: seriesIncludesToday ? businessToday : targetRecurringBooking.slot_date,
    excludeValues: [oneTimeEdit],
  });
  assert(allEditTime, 'Could not find alternate time for recurring series edit.');
  await secondSelect.selectOption(allEditTime);
  await page.getByLabel(/Entire series/i).check();
  await page.getByRole('button', { name: /^Save$/i }).click();
  bookings = await waitForUserBookings(
    (rows) => {
      const activeRows = rows.filter((row) => row.status === 'confirmed');
      return activeRows.length === 3 && activeRows.every((row) => row.start_time.slice(0, 5) === allEditTime);
    },
    { description: 'recurring series edit' },
  );
  confirmed = bookings.filter((row) => row.status === 'confirmed');
  assert(
    confirmed.every((row) => row.start_time.slice(0, 5) === allEditTime),
    `Expected all recurring rows to move to ${allEditTime}.`,
  );
  logStep(`Recurring series edit updated all occurrences to ${allEditTime}`);

  await page.goto(`${APP_BASE_URL}/bookings`, { waitUntil: 'domcontentloaded' });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /^Cancel$/i }).first().click();
  bookings = await waitForUserBookings(
    (rows) => rows.filter((row) => row.status === 'cancelled').length === 1,
    { description: 'recurring cancellation' },
  );
  const cancelledRows = bookings.filter((row) => row.status === 'cancelled');
  assert(cancelledRows.length === 1, `Expected 1 cancelled recurring booking, found ${cancelledRows.length}.`);
  logStep('Recurring cancellation updated one occurrence as expected');
}

function pickFutureOptionValue(optionValues, { dateInput, excludeValues = [] } = {}) {
  const excluded = new Set(excludeValues);
  const { dateInput: todayInput, timeInput } = getBusinessNowParts();
  const currentMinutes = timeToMinutes(timeInput);

  return optionValues.find((value) => {
    if (excluded.has(value)) return false;
    if (dateInput !== todayInput) return true;
    return timeToMinutes(value) > currentMinutes;
  });
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await buildAuthenticatedContext(browser);
  const page = await context.newPage();
  const failures = [];

  page.on('console', (message) => {
    const text = message.text();
    if (/Unable to|booking|Supabase|error/i.test(text)) {
      console.log(`[browser:${message.type()}] ${text}`);
    }
  });
  page.on('pageerror', (error) => {
    console.log(`[browser:pageerror] ${error.message}`);
  });
  page.on('response', async (response) => {
    if (!response.url().includes('/rest/v1/rpc/create_booking_series')) return;
    let body = '';
    try {
      body = await response.text();
    } catch (error) {
      body = `<<unable to read body: ${error.message}>>`;
    }
    console.log(`[browser:rpc] ${response.status()} ${body.slice(0, 400)}`);
  });
  page.on('request', (request) => {
    if (!request.url().includes('/rest/v1/rpc/create_booking_series')) return;
    const payload = request.postData() || '';
    console.log(`[browser:rpc:request] ${payload.slice(0, 400)}`);
  });

  try {
    await cleanupUserState();
    await ensureAuthenticated(page);

    const scenarios = [
      ['single-booking', createSingleBooking],
      ['batch-booking', createBatchBooking],
      ['same-day-past-edit', rejectPastEditForToday],
      ['same-user-overlap', rejectOverlappingBooking],
      ['recurring-series', createAndMutateRecurringSeries],
    ];

    for (const [name, fn] of scenarios) {
      try {
        await fn(page);
        console.log(`PASS ${name}`);
      } catch (error) {
        failures.push(`${name}: ${error.message}`);
        console.error(`FAIL ${name}: ${error.message}`);
      } finally {
        await cleanupUserState();
      }
    }
  } finally {
    await context.close();
    await browser.close();
    await cleanupUserState();
  }

  if (failures.length > 0) {
    console.error('\nLive matrix failures:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('\nLive scheduling matrix passed.');
}

await run();
