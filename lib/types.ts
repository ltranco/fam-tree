export type Gender = 'male' | 'female';

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: string; // ISO date string, may be empty
  deathDate: string; // ISO date string, may be empty
  photoUrl: string;
  notes: string;
  parentIds: string[]; // 0-2 entries in practice
  order: number; // birth order among siblings sharing the same parentIds
}

export type PartnershipStatus = 'together' | 'divorced';

export interface Partnership {
  id: string;
  partnerIds: [string, string];
  status: PartnershipStatus;
}

export interface FamilyTreeData {
  people: Record<string, Person>;
  partnerships: Partnership[];
}

export function fullName(person: Person): string {
  return `${person.firstName} ${person.lastName}`.trim();
}
