import { deriveNameFromEmail, toTitleCase } from './helpers';
import { EQUIPMENT_FLOW_CATEGORIES } from '../features/calendar-scheduler/config';

function toIsoFromDateTime(slotDate, slotTime) {
  if (!slotDate || !slotTime) return null;
  const normalized = String(slotTime).slice(0, 5);
  const date = new Date(`${slotDate}T${normalized}:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function mapSupabaseBooking(row) {
  const startISO = toIsoFromDateTime(row.slot_date, row.start_time);
  const endISO = toIsoFromDateTime(row.slot_date, row.end_time);

  return {
    id: row.id,
    userId: row.user_id,
    startISO,
    endISO,
    durationMinutes: row.duration_minutes,
    status: row.status,
    equipment: row.equipment_items || [],
    equipmentCategories: row.equipment_categories || [],
    bookingNote: row.notes || '',
    recurringGroupId: row.recurring_group_id || null,
    recurrence: row.recurring_groups
      ? {
          seriesId: row.recurring_group_id,
          frequency: row.recurring_groups.frequency || 'weekly',
          weekdays: row.recurring_groups.weekdays || [],
          endDate: row.recurring_groups.end_date || null,
          skipDates: row.recurring_groups.skip_dates || [],
        }
      : null,
    pricing: {
      baseCredits: 0,
      demandMultiplier: 1,
      demandTier: 'Deferred',
      demandCount: 0,
      occupancyMultiplier: 1,
      occupancyAtQuote: 1,
      finalCredits: 0,
    },
    createdAt: row.created_at,
    source: 'supabase',
  };
}

export function buildProfileFromAuth(authUser, profileRow) {
  if (!authUser) return null;

  const metadata = authUser.user_metadata || {};
  const providers = Array.isArray(authUser.app_metadata?.providers)
    ? authUser.app_metadata.providers
    : [];

  const email = authUser.email || profileRow?.email || '';

  const profileRole = profileRow?.role || profileRow?.staff_role || '';
  const metadataRole = metadata.role || authUser.app_metadata?.role || '';

  return {
    id: authUser.id,
    name: profileRow?.full_name || metadata.full_name || metadata.name || deriveNameFromEmail(email),
    email,
    phone: profileRow?.phone || authUser.phone || '',
    walletAddress: profileRow?.wallet_address || '',
    authProviders: providers,
    memberSince: profileRow?.created_at || authUser.created_at,
    lastSignInAt: authUser.last_sign_in_at,
    role: profileRole || metadataRole || undefined,
    isAdmin: Boolean(
      profileRow?.is_admin === true
      || String(profileRole).toLowerCase() === 'admin'
      || String(metadataRole).toLowerCase() === 'admin'
      || authUser.app_metadata?.is_admin === true,
    ),
  };
}

const CATEGORY_ICON_BY_ID = EQUIPMENT_FLOW_CATEGORIES.reduce((acc, category) => {
  acc[category.id] = category.icon;
  return acc;
}, {});

function toCategoryLabel(categoryId) {
  const preset = EQUIPMENT_FLOW_CATEGORIES.find((c) => c.id === categoryId);
  if (preset) return preset.label;
  return toTitleCase(categoryId);
}

export function buildEquipmentCategories(equipmentRows) {
  if (!Array.isArray(equipmentRows) || equipmentRows.length === 0) {
    return EQUIPMENT_FLOW_CATEGORIES;
  }

  const grouped = new Map();

  equipmentRows.forEach((row) => {
    const category = row.category || 'other';
    if (!grouped.has(category)) {
      grouped.set(category, {
        id: category,
        label: toCategoryLabel(category),
        icon: CATEGORY_ICON_BY_ID[category] || '🏋️',
        items: [],
      });
    }

    grouped.get(category).items.push({
      id: row.id,
      label: row.name,
      isAvailable: row.is_available !== false,
    });
  });

  const categories = [...grouped.values()].map((category) => ({
    ...category,
    items: category.items.sort((a, b) => a.label.localeCompare(b.label)),
  }));

  const withFallback = [
    {
      id: 'dont-know',
      label: "Don't know",
      icon: '🤷',
      items: [],
    },
    ...categories,
  ];

  return withFallback;
}
