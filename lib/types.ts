export type Gender = 'male' | 'female' | 'other' | '';

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
}

export interface FamilyTreeData {
  people: Record<string, Person>;
}

export function fullName(person: Person): string {
  return `${person.firstName} ${person.lastName}`.trim();
}
