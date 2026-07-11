"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { MapPin, ArrowLeft, Plus, X, Navigation } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { calculatePoints } from "@/lib/points";
import { generateReferralCode } from "@/lib/referrals";
import { phonesMatch } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";

interface Member {
  name: string;
  phone: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    mapsLink: "",
    locationDesc: "",
    houseType: "",
    zoneId: "",
    areaId: "",
  });

  const points = useMemo(() => calculatePoints({
    fullName: form.fullName,
    phone: form.phone,
    mapsLink: form.mapsLink,
    photos,
    locationDesc: form.locationDesc,
    hasFamilyMember: members.length > 0,
  }), [form, photos, members]);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const addMember = () => {
    setMembers((m) => [...m, { name: "", phone: "" }]);
  };

  const updateMember = (index: number, field: "name" | "phone", value: string) => {
    setMembers((m) => m.map((mem, i) => i === index ? { ...mem, [field]: value } : mem));
  };

  const removeMember = (index: number) => {
    setMembers((m) => m.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.mapsLink || !form.zoneId) {
      toast.error("Name, phone, Google Maps link, and Zone are required");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const referralCode = generateReferralCode();

      const params = new URLSearchParams(window.location.search);
      const refCode = params.get("ref");
      let referredBy = null;
      if (refCode) {
        const { data: referrer } = await supabase
          .from("users")
          .select("id")
          .eq("referral_code", refCode)
          .single();
        if (referrer) referredBy = referrer.id;
      }

      // Find or create zone by name
      const zoneNameVal = form.zoneId.trim();
      let { data: zone } = await supabase
        .from("zones")
        .select("id, prefix")
        .eq("name", zoneNameVal)
        .single();

      if (!zone) {
        const prefix = zoneNameVal
          .split(/\s+/)
          .map((w: string) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 3);
        const { data: newZone } = await supabase
          .from("zones")
          .insert({ name: zoneNameVal, prefix })
          .select("id, prefix")
          .single();
        zone = newZone;
      }

      if (!zone) {
        toast.error("Failed to create zone. Please try again.");
        setLoading(false);
        return;
      }

      // Find or create area by name (if provided)
      let areaId = null;
      const areaNameVal = form.areaId.trim();
      if (areaNameVal) {
        let { data: area } = await supabase
          .from("areas")
          .select("id")
          .eq("zone_id", zone.id)
          .ilike("name", areaNameVal)
          .single();

        if (!area) {
          const areaCode = areaNameVal.split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 3);
          const { data: newArea } = await supabase
            .from("areas")
            .insert({ name: areaNameVal, zone_id: zone.id, code: areaCode })
            .select("id")
            .single();
          area = newArea;
        }
        if (area) areaId = area.id;
      }

      // Generate household registration ID via RPC
      const { data: regId, error: regIdError } = await supabase.rpc(
        "generate_household_registration_id",
        { zone_uuid: zone.id, area_uuid: areaId }
      );
      if (regIdError) {
        toast.error("Failed to generate registration ID. Please try again.");
        setLoading(false);
        return;
      }

      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          full_name: form.fullName,
          phone: form.phone,
          maps_link: form.mapsLink,
          location_desc: form.locationDesc || null,
          house_type: form.houseType || null,
          photos,
          points,
          referral_code: referralCode,
          referred_by: referredBy,
          zone_id: zone.id,
          area_id: areaId,
          household_registration_id: regId,
        })
        .select("id")
        .single();

      if (userError) {
        if (userError.code === "23505") {
          toast.error("This phone number is already registered");
        } else {
          toast.error("Registration failed. Please try again.");
        }
        return;
      }

      // Insert household members
      const validMembers = members.filter((m) => m.name.trim() && m.phone.trim());
      if (validMembers.length > 0) {
        await supabase.from("household_members").insert(
          validMembers.map((m) => ({ user_id: user.id, name: m.name.trim(), phone: m.phone.trim() }))
        );
      }

      // If this registrant was previously listed as a household member of another
      // user, link the two accounts and mark the member row as promoted.
      const { data: memberMatches } = await supabase
        .from("household_members")
        .select("id, user_id, phone")
        .filter("promoted_user_id", "is", null);
      const linkedMember = (memberMatches || []).find((m) => phonesMatch(m.phone, form.phone));
      if (linkedMember) {
        await supabase.from("users").update({ head_user_id: linkedMember.user_id }).eq("id", user.id);
        await supabase.from("household_members").update({ promoted_user_id: user.id }).eq("id", linkedMember.id);
      }

      // Log points
      const pointEntries = [];
      if (form.fullName) pointEntries.push({ user_id: user.id, amount: 5, reason: "registration: full_name" });
      if (form.phone) pointEntries.push({ user_id: user.id, amount: 5, reason: "registration: phone" });
      if (form.mapsLink) pointEntries.push({ user_id: user.id, amount: 10, reason: "registration: maps_link" });
      if (photos.length > 0) pointEntries.push({ user_id: user.id, amount: 4, reason: "registration: photos" });
      if (form.locationDesc) pointEntries.push({ user_id: user.id, amount: 3, reason: "registration: location_desc" });
      if (validMembers.length > 0) pointEntries.push({ user_id: user.id, amount: 3, reason: "registration: household_member" });

      if (pointEntries.length > 0) {
        await supabase.from("points_log").insert(pointEntries);
      }

      // Handle referral
      if (referredBy) {
        await supabase.from("referrals").insert({ referrer_id: referredBy, referred_id: user.id });
        const { data: refData } = await supabase.from("users").select("points").eq("id", referredBy).single();
        if (refData) {
          await supabase.from("users").update({ points: refData.points + 10 }).eq("id", referredBy);
          await supabase.from("points_log").insert({ user_id: referredBy, amount: 10, reason: "referral" });
        }
      }

      localStorage.setItem("en-route-phone", form.phone);
      toast.success("Registration complete!");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-lg mx-auto px-5 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] mb-6">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center">
            <MapPin className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Register Household</h1>
            <p className="text-xs text-[var(--text-secondary)]">Fill in your details to join En-Route</p>
          </div>
        </div>

        <div className="mb-6">
          <ProgressBar current={points} max={30} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Full Name"
            placeholder="Your full name"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="+91XXXXXXXXXX"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            required
          />

          {/* Zone Selection */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--text)]">
              Zone <span className="text-[var(--error)]">*</span>
            </label>
            <Input
              placeholder="e.g. Phungreitang – East, Wino – West..."
              value={form.zoneId}
              onChange={(e) => update("zoneId", e.target.value)}
              required
            />
          </div>

          {/* Area/Subdivision (optional, manual entry) */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--text)]">
              Area / Subdivision <span className="text-[var(--text-secondary)] text-xs">(optional)</span>
            </label>
            <Input
              placeholder="e.g. Kazar, Dungri..."
              value={form.areaId}
              onChange={(e) => update("areaId", e.target.value)}
            />
            {form.zoneId.trim() && (
              <p className="text-[10px] text-[var(--text-secondary)]">
                Your Household ID will be: <span className="font-mono font-medium text-[var(--primary)]">
                  {form.zoneId.trim().split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 3)}{form.areaId.trim() ? `-${form.areaId.trim()[0].toUpperCase()}` : ""}-001
                </span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--text)]">
              Google Maps Location Link <span className="text-[var(--error)]">*</span>
            </label>
            <Input
              placeholder="https://maps.app.goo.gl/..."
              value={form.mapsLink}
              onChange={(e) => update("mapsLink", e.target.value)}
              required
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.open("https://maps.google.com", "_blank")}
                className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
              >
                <Navigation size={12} /> Open Google Maps
              </button>
              <span className="text-xs text-[var(--text-secondary)]">- Drop a pin, tap Share, copy link</span>
            </div>
          </div>

          {/* House Type */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--text)]">
              House Type
            </label>
            <select
              value={form.houseType}
              onChange={(e) => update("houseType", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] transition text-sm"
            >
              <option value="">Select...</option>
              <option value="owned">Owned</option>
              <option value="rent">Rent</option>
            </select>
          </div>

          <PhotoUpload photos={photos} onPhotosChange={setPhotos} maxPhotos={4} />

          <Textarea
            label="Location Description"
            placeholder="Blue gate beside the church, second house after the bridge..."
            value={form.locationDesc}
            onChange={(e) => update("locationDesc", e.target.value)}
            rows={3}
            hint="Optional but earns 3 points. Helps riders find you."
          />

          <div className="pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">Household Members</p>
                <p className="text-xs text-[var(--text-secondary)]">Everyone at your address with a phone. +3 pts if you add at least one.</p>
              </div>
            </div>

            <div className="space-y-3">
              {members.map((member, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Name"
                      value={member.name}
                      onChange={(e) => updateMember(i, "name", e.target.value)}
                    />
                    <Input
                      placeholder="Phone"
                      type="tel"
                      value={member.phone}
                      onChange={(e) => updateMember(i, "phone", e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(i)}
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-red-50 rounded-lg transition shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addMember}
                className="flex items-center gap-2 text-sm text-[var(--primary)] hover:text-[var(--primary-dark)] font-medium transition"
              >
                <Plus size={16} /> Add Member
              </button>
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            {loading ? "Registering..." : "Register Household"}
          </Button>
        </form>
      </div>
    </main>
  );
}
