import { faker } from '@faker-js/faker';
import { Center } from '@/modules/centers/entities/center.entity';

export class CenterFactory {
  static create(overrides: Partial<Center> = {}): Partial<Center> {
    const centerType = faker.helpers.arrayElement([
      'Academy',
      'Institute',
      'Center',
      'School',
      'College',
      'University',
    ]);
    const name = faker.company.name() + ' ' + centerType;

    return {
      name,
      description: faker.lorem.paragraph(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      website: faker.internet.url(),
      isActive: faker.datatype.boolean({ probability: 0.9 }), // 90% active
      ...overrides,
    };
  }

  static createMany(
    count: number,
    overrides: Partial<Center> = {},
  ): Partial<Center>[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createLanguageCenter(
    overrides: Partial<Center> = {},
  ): Partial<Center> {
    const languages = [
      'English',
      'Spanish',
      'French',
      'German',
      'Italian',
      'Portuguese',
      'Arabic',
      'Chinese',
      'Japanese',
      'Korean',
    ];
    const language = faker.helpers.arrayElement(languages);
    const centerType = faker.helpers.arrayElement([
      'Language Center',
      'Language Institute',
      'Language Academy',
    ]);

    return this.create({
      name: `${language} ${centerType}`,
      description: `Specialized ${language} language learning center offering comprehensive language programs.`,
      ...overrides,
    });
  }

  static createAcademicCenter(
    overrides: Partial<Center> = {},
  ): Partial<Center> {
    const subjects = [
      'Mathematics',
      'Science',
      'Technology',
      'Engineering',
      'Arts',
      'Business',
      'Medicine',
      'Law',
    ];
    const subject = faker.helpers.arrayElement(subjects);
    const centerType = faker.helpers.arrayElement([
      'Academy',
      'Institute',
      'College',
      'University',
    ]);

    return this.create({
      name: `${subject} ${centerType}`,
      description: `Academic center specializing in ${subject.toLowerCase()} education and research.`,
      ...overrides,
    });
  }

  static createVocationalCenter(
    overrides: Partial<Center> = {},
  ): Partial<Center> {
    const trades = [
      'Culinary',
      'Automotive',
      'Construction',
      'Healthcare',
      'Cosmetology',
      'Welding',
      'Plumbing',
      'Electrical',
    ];
    const trade = faker.helpers.arrayElement(trades);
    const centerType = faker.helpers.arrayElement([
      'Training Center',
      'Vocational School',
      'Trade School',
    ]);

    return this.create({
      name: `${trade} ${centerType}`,
      description: `Vocational training center offering hands-on ${trade.toLowerCase()} education and certification.`,
      ...overrides,
    });
  }

  static createMixedCenters(count: number): Partial<Center>[] {
    const centers: Partial<Center>[] = [];
    const usedNames = new Set<string>();

    // Create a mix of different center types
    const languageCount = Math.floor(count * 0.3);
    const academicCount = Math.floor(count * 0.4);
    const vocationalCount = Math.floor(count * 0.2);
    const regularCount =
      count - languageCount - academicCount - vocationalCount;

    // Add language centers
    for (let i = 0; i < languageCount; i++) {
      let center = this.createLanguageCenter();
      let counter = 1;
      while (center.name && usedNames.has(center.name)) {
        center = this.createLanguageCenter({
          name: `${center.name} ${counter}`,
        });
        counter++;
      }
      if (center.name) {
        usedNames.add(center.name);
      }
      centers.push(center);
    }

    // Add academic centers
    for (let i = 0; i < academicCount; i++) {
      let center = this.createAcademicCenter();
      let counter = 1;
      while (center.name && usedNames.has(center.name)) {
        center = this.createAcademicCenter({
          name: `${center.name} ${counter}`,
        });
        counter++;
      }
      if (center.name) {
        usedNames.add(center.name);
      }
      centers.push(center);
    }

    // Add vocational centers
    for (let i = 0; i < vocationalCount; i++) {
      let center = this.createVocationalCenter();
      let counter = 1;
      while (center.name && usedNames.has(center.name)) {
        center = this.createVocationalCenter({
          name: `${center.name} ${counter}`,
        });
        counter++;
      }
      if (center.name) {
        usedNames.add(center.name);
      }
      centers.push(center);
    }

    // Add regular centers
    for (let i = 0; i < regularCount; i++) {
      let center = this.create();
      let counter = 1;
      while (center.name && usedNames.has(center.name)) {
        center = this.create({
          name: `${center.name} ${counter}`,
        });
        counter++;
      }
      if (center.name) {
        usedNames.add(center.name);
      }
      centers.push(center);
    }

    return centers;
  }
}
