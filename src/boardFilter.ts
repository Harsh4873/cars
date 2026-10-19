import { YEAR_RECORDS, type Car, type YearGrade } from './cars';

export type Place = 'all' | 'katy' | 'fort-bend' | 'houston';
export type BoardSort = 'deck' | 'price' | 'miles' | 'newest';

export type BoardQuery = {
  text: string;
  make: string;
  place: Place;
  grade: YearGrade | 'all';
  sort: BoardSort;
};

const TRUCKS = new Set([
  'F-150',
  'Silverado 1500',
  'Silverado 2500HD',
  'Frontier',
  'Titan',
  'Dakota',
  'Avalanche',
  'Ram 1500',
  'RAM 1500',
  '1500',
  'Tacoma',
  'Tundra',
  'Ranger',
  'Sequoia',
]);

export function placeOf(car: Car): Exclude<Place, 'all'> {
  if (car.city.startsWith('Houston')) return 'houston';
  if (
    car.city.startsWith('Rosenberg') ||
    car.city.startsWith('Sugar Land') ||
    car.city.startsWith('Richmond') ||
    car.city.startsWith('Fulshear')
  ) {
    return 'fort-bend';
  }
  return 'katy';
}

function haystack(car: Car): string {
  const truck = TRUCKS.has(car.model) ? ' truck' : '';
  return [
    car.year,
    car.make,
    car.model,
    car.trim,
    car.city,
    car.dealer,
    car.drive,
    car.verdict,
    car.drivetrain,
    car.vin,
    truck,
  ].join(' ').toLowerCase();
}

export function filterBoard(cars: Car[], query: BoardQuery): Car[] {
  const terms = query.text.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = cars.filter((car) => {
    if (query.make && car.make !== query.make) return false;
    if (query.place !== 'all' && placeOf(car) !== query.place) return false;
    if (query.grade !== 'all' && YEAR_RECORDS[car.id]?.grade !== query.grade) return false;
    if (terms.length > 0) {
      const hay = haystack(car);
      if (!terms.every((term) => hay.includes(term))) return false;
    }
    return true;
  });
  if (query.sort === 'deck') return filtered;
  const sorted = [...filtered];
  if (query.sort === 'price') sorted.sort((left, right) => left.price - right.price || left.miles - right.miles);
  if (query.sort === 'miles') sorted.sort((left, right) => left.miles - right.miles || left.price - right.price);
  if (query.sort === 'newest') sorted.sort((left, right) => right.year - left.year || left.miles - right.miles);
  return sorted;
}

export function makesIn(cars: Car[]): string[] {
  return [...new Set(cars.map((car) => car.make))].sort((left, right) => left.localeCompare(right));
}
