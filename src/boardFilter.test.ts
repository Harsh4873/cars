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
  it('searches make and model', () => {
    const corollas = filterBoard(CARS, { ...base, text: 'corolla' });
    expect(corollas.length).toBeGreaterThan(0);
    expect(corollas.every((car) => car.model.toLowerCase().includes('corolla'))).toBe(true);
    const camrys = filterBoard(CARS, { ...base, text: 'camry' });
    expect(camrys.length).toBeGreaterThan(0);
    expect(camrys.every((car) => car.model !== 'Corolla')).toBe(true);
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
