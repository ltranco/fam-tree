import { FamilyTreeData, Person } from './types';

function p(partial: Partial<Person> & Pick<Person, 'id' | 'firstName' | 'lastName'>): Person {
  return {
    gender: 'female',
    birthDate: '',
    deathDate: '',
    photoUrl: '',
    notes: '',
    parentIds: [],
    ...partial,
  };
}

const seedPeople: Person[] = [
  // Generation 1
  p({ id: 'robert-sr', firstName: 'Robert', lastName: 'Hayes', gender: 'male', birthDate: '1940-03-12' }),
  p({ id: 'margaret', firstName: 'Margaret', lastName: 'Hayes', gender: 'female', birthDate: '1942-07-04' }),
  p({ id: 'william', firstName: 'William', lastName: 'Cole', gender: 'male', birthDate: '1938-11-02', deathDate: '2015-05-20' }),
  p({ id: 'dorothy', firstName: 'Dorothy', lastName: 'Cole', gender: 'female', birthDate: '1941-01-30' }),

  // Generation 2
  p({ id: 'john', firstName: 'John', lastName: 'Hayes', gender: 'male', birthDate: '1965-06-18', parentIds: ['robert-sr', 'margaret'] }),
  p({ id: 'patricia', firstName: 'Patricia', lastName: 'Hayes', gender: 'female', birthDate: '1967-09-09', parentIds: ['william', 'dorothy'] }),
  p({ id: 'susan', firstName: 'Susan', lastName: 'Reed', gender: 'female', birthDate: '1969-02-14', parentIds: ['robert-sr', 'margaret'] }),
  p({ id: 'thomas', firstName: 'Thomas', lastName: 'Reed', gender: 'male', birthDate: '1968-12-25' }),

  // Generation 3
  p({ id: 'michael', firstName: 'Michael', lastName: 'Hayes', gender: 'male', birthDate: '1990-04-22', parentIds: ['john', 'patricia'], notes: 'Software engineer, lives in Denver.' }),
  p({ id: 'emily', firstName: 'Emily', lastName: 'Hayes', gender: 'female', birthDate: '1993-08-11', parentIds: ['john', 'patricia'] }),
  p({ id: 'karen', firstName: 'Karen', lastName: 'Reed', gender: 'female', birthDate: '1994-10-05', parentIds: ['susan', 'thomas'] }),
  p({ id: 'jessica', firstName: 'Jessica', lastName: 'Hayes', gender: 'female', birthDate: '1991-03-17' }),

  // Generation 4
  p({ id: 'tyler', firstName: 'Tyler', lastName: 'Hayes', gender: 'male', birthDate: '2018-12-01', parentIds: ['michael', 'jessica'] }),
];

export function getSeedData(): FamilyTreeData {
  const people: Record<string, Person> = {};
  for (const person of seedPeople) {
    people[person.id] = person;
  }
  return { people };
}
