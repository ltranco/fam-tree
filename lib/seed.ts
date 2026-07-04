import { FamilyTreeData, Partnership, Person } from './types';

function p(partial: Partial<Person> & Pick<Person, 'id' | 'firstName' | 'lastName'>): Person {
  return {
    photoUrl: '',
    parentIds: [],
    order: 0,
    ...partial,
  };
}

const seedPeople: Person[] = [
  // Generation 1
  p({ id: 'robert-sr', firstName: 'Robert', lastName: 'Hayes' }),
  p({ id: 'margaret', firstName: 'Margaret', lastName: 'Hayes' }),
  p({ id: 'william', firstName: 'William', lastName: 'Cole' }),
  p({ id: 'dorothy', firstName: 'Dorothy', lastName: 'Cole' }),

  // Generation 2
  p({ id: 'john', firstName: 'John', lastName: 'Hayes', parentIds: ['robert-sr', 'margaret'], order: 0 }),
  p({ id: 'patricia', firstName: 'Patricia', lastName: 'Hayes', parentIds: ['william', 'dorothy'] }),
  p({ id: 'susan', firstName: 'Susan', lastName: 'Reed', parentIds: ['robert-sr', 'margaret'], order: 1 }),
  p({ id: 'thomas', firstName: 'Thomas', lastName: 'Reed' }),

  // Generation 3
  p({ id: 'michael', firstName: 'Michael', lastName: 'Hayes', parentIds: ['john', 'patricia'], order: 0 }),
  p({ id: 'emily', firstName: 'Emily', lastName: 'Hayes', parentIds: ['john', 'patricia'], order: 1 }),
  p({ id: 'karen', firstName: 'Karen', lastName: 'Reed', parentIds: ['susan', 'thomas'] }),
  p({ id: 'jessica', firstName: 'Jessica', lastName: 'Hayes' }),

  // Generation 4
  p({ id: 'tyler', firstName: 'Tyler', lastName: 'Hayes', parentIds: ['michael', 'jessica'] }),
];

const seedPartnerships: Partnership[] = [
  { id: 'partner-robert-margaret', partnerIds: ['robert-sr', 'margaret'], status: 'divorced' },
  { id: 'partner-john-patricia', partnerIds: ['john', 'patricia'], status: 'together' },
  { id: 'partner-susan-thomas', partnerIds: ['susan', 'thomas'], status: 'together' },
  { id: 'partner-michael-jessica', partnerIds: ['michael', 'jessica'], status: 'together' },
];

export function getSeedData(): FamilyTreeData {
  const people: Record<string, Person> = {};
  for (const person of seedPeople) {
    people[person.id] = person;
  }
  return { people, partnerships: seedPartnerships };
}
