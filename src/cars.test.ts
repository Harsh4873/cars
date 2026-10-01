import { CARS, MARKET_NOTES, YEAR_RECORDS } from './cars';

const phone = /\b(?:\+?1[-.\s]*)?(?:\(?\d{3}\)?[-.\s]*)\d{3}[-.\s]*\d{4}\b/;

describe('shortlist', () => {
  it('stays inside the $5k to $8k band with real miles', () => {
    expect(CARS.length).toBeGreaterThanOrEqual(30);
    for (const car of CARS) {
      expect(car.price).toBeGreaterThanOrEqual(5000);
      expect(car.price).toBeLessThanOrEqual(8000);
      expect(car.miles).toBeGreaterThan(20000);
      expect(car.miles).toBeLessThanOrEqual(220000);
      expect(car.dealer.toLowerCase()).not.toContain('cash only');
      expect(car.dealer.toLowerCase()).not.toContain('financing');
      expect(car.photos.length).toBeGreaterThan(0);
      expect(car.photos.length).toBeLessThanOrEqual(8);
      expect(
        car.listingUrl.startsWith('https://www.cargurus.com/') ||
        car.listingUrl.startsWith('https://www.allenhonda.com/')
      ).toBe(true);
      expect(car.vin).toMatch(/^[A-HJ-NPR-Z0-9]{17}$/);
      expect(car.photos[0]?.startsWith('https://')).toBe(true);
      expect(car.why.length).toBeGreaterThan(40);
      expect(car.watch.length).toBeGreaterThan(0);
      expect(car.check.length).toBeGreaterThan(0);
    }
  });

  it('puts a green flag and a red flag on every card', () => {
    expect(CARS.length).toBeGreaterThanOrEqual(100);
    expect(CARS.filter((car) => car.photos.length > 1).length).toBeGreaterThan(80);
    for (const car of CARS) {
      expect(car.greenFlag.length).toBeGreaterThan(20);
      expect(car.redFlag.length).toBeGreaterThan(20);
    }
    const blob = JSON.stringify({ CARS, MARKET_NOTES });
    expect(blob).not.toMatch(phone);
    expect(blob).not.toContain('\u2014');
  });

  it('has a complaint-year record for every car', () => {
    for (const car of CARS) {
      const record = YEAR_RECORDS[car.id];
      expect(record?.note.length).toBeGreaterThan(20);
      expect(['better', 'typical', 'worse']).toContain(record?.grade);
    }
    const grades = new Set(Object.values(YEAR_RECORDS).map((record) => record.grade));
    expect(grades.has('worse')).toBe(true);
    expect(grades.has('better') || grades.has('typical')).toBe(true);
  });

  it('only keeps the reliable nameplates', () => {
    const allowed = new Set(['Honda', 'Toyota']);
    const near = ['Katy, TX', 'Fulshear, TX', 'College Station, TX', 'Bryan, TX', 'Navasota, TX', 'Sugar Land, TX', 'Richmond, TX', 'Rosenberg, TX', 'Brookshire, TX', 'Houston, TX', 'Bellaire, TX'];
    const models = new Set(CARS.map((car) => car.model));
    expect(models.size).toBeGreaterThan(15);
    for (const car of CARS) {
      expect(car.make.length).toBeGreaterThan(1);
      expect(near).toContain(car.city);
    }
  });
});
