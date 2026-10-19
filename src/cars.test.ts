import { CARS, MARKET_NOTES, YEAR_RECORDS } from './cars';
import { vinCheckDigitOk } from './vin';

const phone = /\b(?:\+?1[-.\s]*)?(?:\(?\d{3}\)?[-.\s]*)\d{3}[-.\s]*\d{4}\b/;

describe('shortlist', () => {
  it('stays in the newer price band with real listings', () => {
    expect(CARS.length).toBeGreaterThanOrEqual(12);
    for (const car of CARS) {
      expect(car.price).toBeGreaterThanOrEqual(18000);
      expect(car.price).toBeLessThanOrEqual(26000);
      expect(car.miles).toBeGreaterThan(0);
      expect(car.miles).toBeLessThanOrEqual(45000);
      expect(car.year).toBeGreaterThanOrEqual(2023);
      expect(car.dealer.toLowerCase()).not.toContain('cash only');
      expect(car.photos.length).toBeGreaterThan(0);
      expect(car.photos.length).toBeLessThanOrEqual(8);
      expect(car.listingUrl.startsWith('https://')).toBe(true);
      expect(car.vin).toMatch(/^[A-HJ-NPR-Z0-9]{17}$/);
      expect(vinCheckDigitOk(car.vin)).toBe(true);
      expect(car.photos[0]?.startsWith('https://')).toBe(true);
      expect(car.why.length).toBeGreaterThan(40);
      expect(car.watch.length).toBeGreaterThan(0);
      expect(car.check.length).toBeGreaterThan(0);
      expect(car.drive.toLowerCase()).toContain('seven lakes');
    }
  });

  it('puts a green flag and a red flag on every card', () => {
    expect(CARS.filter((car) => car.photos.length > 1).length).toBeGreaterThan(10);
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
    expect(grades.has('better')).toBe(true);
    expect(grades.has('typical')).toBe(true);
    expect(grades.has('worse')).toBe(true);
  });

  it('stays inside the Seven Lakes drive', () => {
    const near = ['Katy, TX', 'Houston, TX', 'Rosenberg, TX', 'Sugar Land, TX', 'Richmond, TX', 'Fulshear, TX'];
    const models = new Set(CARS.map((car) => car.model));
    expect(models.size).toBeGreaterThan(5);
    for (const car of CARS) {
      expect(near).toContain(car.city);
    }
  });
});
