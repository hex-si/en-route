export function calculatePoints(fields: {
  fullName: string;
  phone: string;
  mapsLink: string;
  photos: string[];
  locationDesc: string;
  hasFamilyMember: boolean;
}): number {
  let points = 0;
  if (fields.fullName) points += 5;
  if (fields.phone) points += 5;
  if (fields.mapsLink) points += 10;
  if (fields.photos.length > 0) points += 4;
  if (fields.locationDesc) points += 3;
  if (fields.hasFamilyMember) points += 3;
  return points;
}

export function getPointsBreakdown(fields: {
  fullName: string;
  phone: string;
  mapsLink: string;
  photos: string[];
  locationDesc: string;
  hasFamilyMember: boolean;
}): { label: string; points: number; earned: boolean }[] {
  return [
    { label: "Full Name", points: 5, earned: !!fields.fullName },
    { label: "Phone Number", points: 5, earned: !!fields.phone },
    { label: "Google Maps Link", points: 10, earned: !!fields.mapsLink },
    { label: "House Photos", points: 4, earned: fields.photos.length > 0 },
    { label: "Location Description", points: 3, earned: !!fields.locationDesc },
    { label: "Family Member", points: 3, earned: fields.hasFamilyMember },
  ];
}
