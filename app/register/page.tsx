"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, Plus, X, Navigation, Check, Home, Camera, Users, MapPin, FileCheck } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { calculatePoints } from "@/lib/points";
import { generateReferralCode } from "@/lib/referrals";
import { phonesMatch } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";
import { maskName } from "@/lib/privacy";

interface Member {
  name: string;
  phone: string;
}

interface MappingProject {
  id: string;
  name: string;
  mode: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeProjects, setActiveProjects] = useState<MappingProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<MappingProject | null>(null);
  const [form, setForm] = useState({
    phone: "",
    fullName: "",
    location: "",
    houseType: "",
    mapsLink: "",
    latitude: "",
    longitude: "",
    locationDesc: "",
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from("mapping_projects").select("id, name, mode").eq("is_active", true).order("name");
        if (data && data.length > 0) {
          setActiveProjects(data);
          if (data.length === 1) {
            setSelectedProject(data[0]);
          }
        }
      } catch {}
    };
    fetchProjects();
  }, []);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const points = useMemo(() => calculatePoints({
    fullName: form.fullName,
    phone: form.phone,
    mapsLink: form.mapsLink,
    latitude: form.latitude,
    longitude: form.longitude,
    photos,
    locationDesc: form.locationDesc,
    hasFamilyMember: members.length > 0,
  }), [form, photos, members]);

  const steps = useMemo(() => [
    { id: 1, label: "Phone", icon: "📱" },
    { id: 2, label: "Name", icon: "👤" },
    { id: 3, label: "Mapping", icon: "🗺️" },
    { id: 4, label: "Location", icon: "📍" },
    { id: 5, label: "House", icon: "🏠" },
    { id: 6, label: "Pin", icon: "📌" },
    { id: 7, label: "Photos", icon: "📷" },
    { id: 8, label: "Members", icon: "👥" },
    { id: 9, label: "Review", icon: "✅" },
  ], []);

  const progress = Math.round((currentStep / steps.length) * 100);

  const hasLocation = () => {
    const hasMaps = form.mapsLink.trim().length > 0;
    const hasCoords = form.latitude.trim().length > 0 && form.longitude.trim().length > 0;
    return hasMaps || hasCoords;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return form.phone.trim().length >= 10;
      case 2: return form.fullName.trim().length > 0;
      case 3: return selectedProject !== null;
      case 4: return form.location.trim().length > 0;
      case 5: return true;
      case 6: return hasLocation();
      case 7: return true;
      case 8: return true;
      case 9: return true;
      default: return true;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const addMember = () => setMembers((m) => [...m, { name: "", phone: "" }]);
  const updateMember = (i: number, field: "name" | "phone", value: string) => setMembers((m) => m.map((mem, idx) => idx === i ? { ...mem, [field]: value } : mem));
  const removeMember = (i: number) => setMembers((m) => m.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const referralCode = generateReferralCode();
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get("ref");
      let referredBy = null;
      if (refCode) {
        const { data: referrer } = await supabase.from("users").select("id").eq("referral_code", refCode).single();
        if (referrer) referredBy = referrer.id;
      }

      const insertData: Record<string, unknown> = {
        full_name: form.fullName,
        phone: form.phone,
        location_desc: form.location.trim(),
        house_type: form.houseType || null,
        photos,
        points,
        referral_code: referralCode,
        referred_by: referredBy,
      };
      if (form.mapsLink.trim()) insertData.maps_link = form.mapsLink.trim();
      if (form.latitude) insertData.latitude = parseFloat(form.latitude);
      if (form.longitude) insertData.longitude = parseFloat(form.longitude);
      if (selectedProject?.id) insertData.mapping_project_id = selectedProject.id;

      const { data: user, error: userError } = await supabase.from("users").insert(insertData).select("id").single();

      if (userError) {
        if (userError.code === "23505") { toast.error("This phone number is already registered"); }
        else { toast.error(`Registration failed: ${userError.message}`); }
        return;
      }

      const validMembers = members.filter((m) => m.name.trim() && m.phone.trim());
      if (validMembers.length > 0) {
        await supabase.from("household_members").insert(validMembers.map((m) => ({ user_id: user.id, name: m.name.trim(), phone: m.phone.trim() })));
      }

      const { data: memberMatches } = await supabase.from("household_members").select("id, user_id, phone").filter("promoted_user_id", "is", null);
      const linkedMember = (memberMatches || []).find((m) => phonesMatch(m.phone, form.phone));
      if (linkedMember) {
        await supabase.from("users").update({ head_user_id: linkedMember.user_id }).eq("id", user.id);
        await supabase.from("household_members").update({ promoted_user_id: user.id }).eq("id", linkedMember.id);
      }

      try {
        const { data: zones } = await supabase.from("zones").select("id, name");
        const loc = form.location.trim();
        if (loc) {
          let zoneToUse: { id: string } | null = null;
          if (zones && zones.length > 0) {
            const locLower = loc.toLowerCase();
            const matched = zones.find((z) => locLower.includes(z.name.toLowerCase()) || z.name.toLowerCase().includes(locLower));
            if (matched) zoneToUse = matched;
          }
          if (!zoneToUse) {
            const prefix = loc.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 3);
            const { data: newZone } = await supabase.from("zones").insert({ name: loc, prefix }).select("id").single();
            if (newZone) zoneToUse = newZone;
          }
          if (zoneToUse) {
            const { data: regId } = await supabase.rpc("generate_household_registration_id", { zone_uuid: zoneToUse.id, area_uuid: null });
            if (regId) {
              await supabase.from("users").update({ zone_id: zoneToUse.id, household_registration_id: regId, location: loc }).eq("id", user.id);
            }
          }
        }
      } catch {}

      const pointEntries = [];
      if (form.fullName) pointEntries.push({ user_id: user.id, amount: 5, reason: "registration: full_name" });
      if (form.phone) pointEntries.push({ user_id: user.id, amount: 5, reason: "registration: phone" });
      if (form.mapsLink || (form.latitude && form.longitude)) pointEntries.push({ user_id: user.id, amount: 10, reason: "registration: maps_link" });
      if (photos.length > 0) pointEntries.push({ user_id: user.id, amount: 4, reason: "registration: photos" });
      if (form.locationDesc) pointEntries.push({ user_id: user.id, amount: 3, reason: "registration: location_desc" });
      if (validMembers.length > 0) pointEntries.push({ user_id: user.id, amount: 3, reason: "registration: household_member" });
      if (pointEntries.length > 0) await supabase.from("points_log").insert(pointEntries);

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

  const renderStep = () => {
    switch (currentStep) {
      case 1: return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📱</span>
            </div>
            <h2 className="text-xl font-bold mb-1">What&apos;s your phone number?</h2>
            <p className="text-sm text-[var(--text-secondary)]">We&apos;ll use this to identify your account</p>
          </div>
          <Input type="tel" placeholder="+91XXXXXXXXXX" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
      );
      case 2: return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👤</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Your full name</h2>
            <p className="text-sm text-[var(--text-secondary)]">As it appears on your ID</p>
          </div>
          <Input placeholder="e.g. Jihal Shimray" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🗺️</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Mapping Area</h2>
            <p className="text-sm text-[var(--text-secondary)]">Select your mapping project</p>
          </div>
          {activeProjects.length === 1 ? (
            <div className="w-full px-4 py-4 rounded-xl border border-[var(--border)] bg-gray-50 text-sm flex items-center gap-3">
              <MapPin size={18} className="text-[var(--primary)]" />
              <div>
                <p className="font-medium">{activeProjects[0].name}</p>
                <p className="text-xs text-[var(--text-secondary)]">(locked — single mapping mode)</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {activeProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                  className={`w-full px-4 py-4 rounded-xl border-2 text-left transition flex items-center gap-3 ${
                    selectedProject?.id === p.id
                      ? "border-[var(--primary)] bg-[var(--primary)]/5"
                      : "border-[var(--border)] hover:border-[var(--primary)]/50"
                  }`}
                >
                  <MapPin size={18} className={selectedProject?.id === p.id ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"} />
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                  </div>
                  {selectedProject?.id === p.id && <Check size={16} className="ml-auto text-[var(--primary)]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      );
      case 4: return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📍</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Where do you live?</h2>
            <p className="text-sm text-[var(--text-secondary)]">Enter your complete location</p>
          </div>
          <Input label="Location" placeholder="e.g. Phungreitang East, Wino East, Kazar, Viewland" value={form.location} onChange={(e) => update("location", e.target.value)} />
          <p className="text-[10px] text-[var(--text-secondary)]">Include the direction whenever applicable (e.g. &quot;Phungreitang East&quot; instead of just &quot;Phungreitang&quot;)</p>
        </div>
      );
      case 5: return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏠</span>
            </div>
            <h2 className="text-xl font-bold mb-1">House type</h2>
            <p className="text-sm text-[var(--text-secondary)]">Do you own or rent?</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => update("houseType", "owned")} className={`p-6 rounded-2xl border-2 text-center transition ${form.houseType === "owned" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] hover:border-[var(--primary)]/50"}`}>
              <Home size={32} className={`mx-auto mb-2 ${form.houseType === "owned" ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"}`} />
              <p className={`font-medium ${form.houseType === "owned" ? "text-[var(--primary)]" : ""}`}>Owned</p>
            </button>
            <button onClick={() => update("houseType", "rent")} className={`p-6 rounded-2xl border-2 text-center transition ${form.houseType === "rent" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] hover:border-[var(--primary)]/50"}`}>
              <Home size={32} className={`mx-auto mb-2 ${form.houseType === "rent" ? "text-[var(--text-secondary)]" : ""}`} />
              <p className={`font-medium ${form.houseType === "rent" ? "text-[var(--primary)]" : ""}`}>Rented</p>
            </button>
          </div>
        </div>
      );
      case 6: return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📌</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Pin your location</h2>
            <p className="text-sm text-[var(--text-secondary)]">Provide a Google Maps link <strong>or</strong> coordinates</p>
          </div>
          <Input label="Google Maps Link" placeholder="https://maps.app.goo.gl/..." value={form.mapsLink} onChange={(e) => update("mapsLink", e.target.value)} />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.open("https://maps.google.com", "_blank")} className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline">
              <Navigation size={12} /> Open Google Maps
            </button>
            <span className="text-xs text-[var(--text-secondary)]">— Drop pin, Share, copy link</span>
          </div>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border)]" /></div>
            <div className="relative flex justify-center"><span className="bg-[var(--bg)] px-3 text-xs text-[var(--text-secondary)]">OR</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude" placeholder="25.1234" value={form.latitude} onChange={(e) => update("latitude", e.target.value)} />
            <Input label="Longitude" placeholder="94.5678" value={form.longitude} onChange={(e) => update("longitude", e.target.value)} />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)]">Enter both latitude and longitude, or use Google Maps link above</p>
          <Textarea label="Location description (optional)" placeholder="Blue gate beside the church..." value={form.locationDesc} onChange={(e) => update("locationDesc", e.target.value)} rows={2} hint="Earns 3 points. Helps riders find you." />
        </div>
      );
      case 7: return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Camera size={32} className="text-[var(--primary)]" />
            </div>
            <h2 className="text-xl font-bold mb-1">House photos</h2>
            <p className="text-sm text-[var(--text-secondary)]">Upload up to 4 photos of your house</p>
          </div>
          <PhotoUpload photos={photos} onPhotosChange={setPhotos} maxPhotos={4} />
        </div>
      );
      case 8: return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-[var(--primary)]" />
            </div>
            <h2 className="text-xl font-bold mb-1">Household members</h2>
            <p className="text-sm text-[var(--text-secondary)]">Everyone at your address with a phone</p>
          </div>
          <div className="space-y-3">
            {members.map((member, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input placeholder="Name" value={member.name} onChange={(e) => updateMember(i, "name", e.target.value)} />
                  <Input placeholder="Phone" type="tel" value={member.phone} onChange={(e) => updateMember(i, "phone", e.target.value)} />
                </div>
                <button onClick={() => removeMember(i)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--error)] hover:bg-red-50 rounded-lg transition">
                  <X size={16} />
                </button>
              </div>
            ))}
            <button onClick={addMember} className="w-full flex items-center justify-center gap-2 text-sm text-[var(--primary)] font-medium py-3 border-2 border-dashed border-[var(--primary)]/30 rounded-xl hover:bg-[var(--primary)]/5 transition">
              <Plus size={16} /> Add Member
            </button>
          </div>
        </div>
      );
      case 9: return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileCheck size={32} className="text-[var(--primary)]" />
            </div>
            <h2 className="text-xl font-bold mb-1">Review & Submit</h2>
            <p className="text-sm text-[var(--text-secondary)]">Check your information before submitting</p>
          </div>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Phone</span><span className="font-medium">{form.phone || "—"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Name</span><span className="font-medium">{form.fullName || "—"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Mapping</span><span className="font-medium">{selectedProject?.name || "—"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Location</span><span className="font-medium">{form.location || "—"}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">House Type</span><span className="font-medium capitalize">{form.houseType || "—"}</span></div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Pin Location</span>
                <span className="font-medium">{hasLocation() ? "✓ Provided" : "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Photos</span>
                <span className="font-medium">{photos.length} uploaded</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Members</span>
                <span className="font-medium">{members.filter((m) => m.name.trim()).length} added</span>
              </div>
            </div>
            <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-xl p-4">
              <p className="text-sm text-[var(--primary)] font-medium">Points: {points}/30</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">+10 bonus per referral when they register</p>
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-lg mx-auto px-5 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] mb-6">
          <ArrowLeft size={16} /> Back
        </Link>

        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--text)]">Step {currentStep} of {steps.length}</span>
            <span className="text-sm font-medium text-[var(--primary)]">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--primary)] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-3">
            {steps.map((s) => (
              <div key={s.id} className={`flex flex-col items-center gap-1 ${currentStep >= s.id ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${currentStep > s.id ? "bg-[var(--primary)] text-white" : currentStep === s.id ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-gray-100 text-[var(--text-secondary)]"}`}>
                  {currentStep > s.id ? <Check size={14} /> : s.id}
                </div>
                <span className="text-[10px] hidden sm:block">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {currentStep > 1 && (
            <Button variant="secondary" onClick={prevStep} className="flex-1">
              <ArrowLeft size={16} className="mr-2" /> Previous
            </Button>
          )}
          {currentStep < steps.length ? (
            <Button onClick={nextStep} disabled={!canProceed()} className="flex-1">
              Next <ArrowRight size={16} className="ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={loading} className="flex-1">
              {loading ? "Registering..." : "Register Household"}
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-[var(--text-secondary)] pt-6">
          A Hashtag Dropee Initiative — eX Holdings
        </p>
      </div>
    </main>
  );
}
