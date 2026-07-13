export function calculatePoints(fields: {
  fullName: string;
  phone: string;
  mapsLink: string;
  latitude?: string;
  longitude?: string;
  photos: string[];
  locationDesc: string;
  location?: string;
  hasFamilyMember: boolean;
}): number {
  let points = 0;
  if (fields.fullName) points += 5;
  if (fields.phone) points += 5;
  if (fields.location) points += 5;
  if (fields.mapsLink || (fields.latitude && fields.longitude)) points += 10;
  if (fields.photos.length > 0) points += 4;
  if (fields.locationDesc) points += 3;
  if (fields.hasFamilyMember) points += 3;
  return points;
}

export function getPointsBreakdown(fields: {
  fullName: string;
  phone: string;
  mapsLink: string;
  latitude?: string;
  longitude?: string;
  photos: string[];
  locationDesc: string;
  location?: string;
  hasFamilyMember: boolean;
}): { label: string; points: number; earned: boolean }[] {
  return [
    { label: "Full Name", points: 5, earned: !!fields.fullName },
    { label: "Phone Number", points: 5, earned: !!fields.phone },
    { label: "Location", points: 5, earned: !!fields.location },
    { label: "Location Pin", points: 10, earned: !!(fields.mapsLink || (fields.latitude && fields.longitude)) },
    { label: "House Photos", points: 4, earned: fields.photos.length > 0 },
    { label: "Location Description", points: 3, earned: !!fields.locationDesc },
    { label: "Family Member", points: 3, earned: fields.hasFamilyMember },
  ];
}
