import { CARS } from './cars';
import { filterBoard, makesIn, placeOf } from './boardFilter';

const base = {
  text: '',
  make: '',
  place: 'all' as const,
  grade: 'all' as const,
  sort: 'deck' as const,
};

describe('board filters', () => {
  it('searches make, model, and truck', () => {
    const civics = filterBoard(CARS, { ...base, text: 'civic' });
    expect(civics.length).toBeGreaterThan(0);
    expect(civics.every((car) => car.model.toLowerCase().includes('civic'))).toBe(true);
    const trucks = filterBoard(CARS, { ...base, text: 'truck' });
    expect(trucks.length).toBeGreaterThan(0);
    expect(trucks.every((car) => car.model !== 'Civic')).toBe(true);
    expect(trucks.some((car) => car.model === 'Tacoma')).toBe(true);
  });

  it('finds a car by VIN', () => {
    const car = CARS[0];
    expect(car).toBeTruthy();
    const found = filterBoard(CARS, { ...base, text: car!.vin.toLowerCase() });
    expect(found.map((item) => item.id)).toContain(car!.id);
  });

  it('filters by place and make together', () => {
    const katy = filterBoard(CARS, { ...base, place: 'katy' });
    expect(katy.length).toBeGreaterThan(0);
    expect(katy.every((car) => placeOf(car) === 'katy')).toBe(true);
    const make = makesIn(CARS)[0];
    const narrowed = filterBoard(CARS, { ...base, place: 'houston', make });
    expect(narrowed.every((car) => car.make === make && placeOf(car) === 'houston')).toBe(true);
  });

  it('sorts by price without dropping cars', () => {
    const sorted = filterBoard(CARS, { ...base, sort: 'price' });
    expect(sorted).toHaveLength(CARS.length);
    expect(sorted[0]?.price).toBeLessThanOrEqual(sorted[1]?.price ?? sorted[0]?.price);
  });
});
