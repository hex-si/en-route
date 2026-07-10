import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generate the next Household Registration ID for a zone and optional area.
 * Format: <Prefix>-<AreaCode>-<Number> or <Prefix>-<Number>
 * Examples: WE-001, WE-K-001, PW-001, PE-A-001
 */
export async function generateHouseholdRegistrationId(zoneId: string, areaId?: string | null): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("generate_household_registration_id", {
    zone_uuid: zoneId,
    area_uuid: areaId || null,
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
    .select("id, name, prefix")
    .order("name");
  if (error) throw new Error(`Failed to fetch zones: ${error.message}`);
  return data;
}

/**
 * Get all areas for a specific zone.
 */
export async function getAreasForZone(zoneId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("areas")
    .select("id, name, code")
    .eq("zone_id", zoneId)
    .order("name");
  if (error) throw new Error(`Failed to fetch areas: ${error.message}`);
  return data;
}
