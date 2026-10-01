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
  });

  it('filters by place and make together', () => {
    const campus = filterBoard(CARS, { ...base, place: 'campus' });
    expect(campus.length).toBeGreaterThan(0);
    expect(campus.every((car) => placeOf(car) === 'campus')).toBe(true);
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
