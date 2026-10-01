import { CARS, MARKET_NOTES, YEAR_RECORDS } from './cars';

const phone = /\b(?:\+?1[-.\s]*)?(?:\(?\d{3}\)?[-.\s]*)\d{3}[-.\s]*\d{4}\b/;

describe('shortlist', () => {
  it('stays inside the $5k to $8k band with real miles', () => {
    expect(CARS.length).toBeGreaterThanOrEqual(30);
    for (const car of CARS) {
      expect(car.price).toBeGreaterThanOrEqual(5000);
      expect(car.price).toBeLessThanOrEqual(8000);
      expect(car.miles).toBeGreaterThan(60000);
      expect(car.miles).toBeLessThanOrEqual(200000);
      expect(car.dealer.toLowerCase()).not.toContain('cash only');
      expect(car.dealer.toLowerCase()).not.toContain('financing');
      expect(car.photos.length).toBeGreaterThan(0);
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

  it('leads with the campus Civic and does not paste phone numbers', () => {
    expect(CARS[0]?.city).toBe('College Station, TX');
    expect(CARS[0]?.dealer).toBe('Allen Honda');
    expect(CARS[0]?.price).toBe(6500);
    expect(CARS[1]?.model).toBe('Camry');
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
    expect(YEAR_RECORDS['camry-2009-houston']?.grade).toBe('worse');
    expect(YEAR_RECORDS['accord-2008-houston']?.grade).toBe('better');
  });

  it('only keeps the reliable nameplates', () => {
    const allowed = new Set(['Honda', 'Toyota']);
    const models = new Set(['Accord', 'Civic', 'Fit', 'CR-V', 'Camry', 'Corolla', 'RAV4', 'Prius', 'Highlander']);
    const near = ['Katy, TX', 'College Station, TX', 'Sugar Land, TX', 'Richmond, TX', 'Rosenberg, TX', 'Brookshire, TX', 'Houston, TX'];
    for (const car of CARS) {
      expect(allowed.has(car.make)).toBe(true);
      expect(models.has(car.model)).toBe(true);
      expect(near).toContain(car.city);
    }
  });
});
