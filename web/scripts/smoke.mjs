const appBaseUrl = String(process.env.APP_BASE_URL || 'https://pelayowellness.com').replace(/\/+$/, '');

const checks = [
  {
    name: 'Public app homepage',
    url: `${appBaseUrl}/`,
    validate: async (response) => {
      const text = await response.text();
      if (!text.includes('Pelayo Wellness')) {
        throw new Error('Homepage did not include expected brand text.');
      }
      if (appBaseUrl.includes('github.io')) {
        if (!text.includes('/gym-app/assets/')) {
          throw new Error('Homepage did not render GitHub Pages asset paths.');
        }
      } else if (!text.includes('/assets/')) {
        throw new Error('Homepage did not render root-relative asset paths.');
      }
    },
  },
  {
    name: 'Supabase auth settings',
    url: 'https://rgcnvghjmdkannkgocrj.supabase.co/auth/v1/settings',
    headers: {
      apikey: 'sb_publishable_5fJLcvBiWvnED48jZigkKw_ICrWrWww',
    },
    validate: async (response) => {
      const data = await response.json();
      if (data.external?.google !== true || data.external?.email !== true) {
        throw new Error('Expected Google and email auth to be enabled.');
      }
    },
  },
  {
    name: 'Supabase equipment read',
    url: 'https://rgcnvghjmdkannkgocrj.supabase.co/rest/v1/equipment?select=id,name,category&limit=3',
    headers: {
      apikey: 'sb_publishable_5fJLcvBiWvnED48jZigkKw_ICrWrWww',
      Authorization: 'Bearer sb_publishable_5fJLcvBiWvnED48jZigkKw_ICrWrWww',
      Accept: 'application/json',
    },
    validate: async (response) => {
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Equipment endpoint did not return an array.');
      }
    },
  },
  {
    name: 'Email OTP health',
    url: 'https://pelayo-email-otp-api-752128746083.us-central1.run.app/health',
    validate: async (response) => {
      const data = await response.json();
      if (data.ok !== true) {
        throw new Error('OTP backend health was not ok.');
      }
    },
  },
];

const failures = [];

for (const check of checks) {
  try {
    const response = await fetch(check.url, {
      headers: check.headers,
    });

    if (!response.ok) {
      throw new Error(`Unexpected HTTP ${response.status}`);
    }

    await check.validate(response);
    console.log(`PASS ${check.name}`);
  } catch (error) {
    failures.push(`${check.name}: ${error.message}`);
    console.error(`FAIL ${check.name}: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error('\nSmoke test failures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\nAll smoke checks passed.');
