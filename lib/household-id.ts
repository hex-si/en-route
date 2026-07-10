import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generate the next Household Registration ID for a zone.
 * Uses the PostgreSQL function generate_household_registration_id().
 * Format: {prefix}{3-digit number}, e.g. P-E001, W-W012
 */
export async function generateHouseholdRegistrationId(zoneId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("generate_household_registration_id", {
    zone_uuid: zoneId,
  });
  if (error) throw new Error(`Failed to generate household ID: ${error.message}`);
  return data as string;
}

/**
 * Get all zones from the database.
 */
export async function getZones() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("zones")
    .select("id, name, prefix, next_number")
    .order("name");
  if (error) throw new Error(`Failed to fetch zones: ${error.message}`);
  return data;
}
