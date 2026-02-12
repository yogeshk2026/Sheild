// Vehicle Data for Courial Shield
// Cars and trucks commonly used in the gig driver industry (no older than 15 years)

export interface VehicleModel {
  model: string;
  make: string;
  years: number[];
}

// Current year for calculating vehicle year range
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - 15;

// Generate year range from MIN_YEAR to CURRENT_YEAR + 1 (for next year models)
const YEAR_RANGE = Array.from(
  { length: CURRENT_YEAR - MIN_YEAR + 2 },
  (_, i) => MIN_YEAR + i
);

// Vehicle database: Model -> Make mapping
// Organized by model for easy lookup when user selects a model
export const VEHICLE_DATABASE: VehicleModel[] = [
  // Toyota
  { model: 'Camry', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Corolla', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Prius', make: 'Toyota', years: YEAR_RANGE },
  { model: 'RAV4', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Highlander', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Sienna', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Tacoma', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Tundra', make: 'Toyota', years: YEAR_RANGE },
  { model: '4Runner', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Avalon', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Venza', make: 'Toyota', years: YEAR_RANGE },
  { model: 'C-HR', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Yaris', make: 'Toyota', years: YEAR_RANGE },
  { model: 'GR86', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Supra', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Crown', make: 'Toyota', years: YEAR_RANGE },
  { model: 'bZ4X', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Grand Highlander', make: 'Toyota', years: YEAR_RANGE },
  { model: 'Sequoia', make: 'Toyota', years: YEAR_RANGE },

  // Honda
  { model: 'Accord', make: 'Honda', years: YEAR_RANGE },
  { model: 'Civic', make: 'Honda', years: YEAR_RANGE },
  { model: 'CR-V', make: 'Honda', years: YEAR_RANGE },
  { model: 'Pilot', make: 'Honda', years: YEAR_RANGE },
  { model: 'Odyssey', make: 'Honda', years: YEAR_RANGE },
  { model: 'HR-V', make: 'Honda', years: YEAR_RANGE },
  { model: 'Passport', make: 'Honda', years: YEAR_RANGE },
  { model: 'Ridgeline', make: 'Honda', years: YEAR_RANGE },
  { model: 'Fit', make: 'Honda', years: YEAR_RANGE },
  { model: 'Insight', make: 'Honda', years: YEAR_RANGE },
  { model: 'Prologue', make: 'Honda', years: YEAR_RANGE },

  // Hyundai
  { model: 'Elantra', make: 'Hyundai', years: YEAR_RANGE },
  { model: 'Sonata', make: 'Hyundai', years: YEAR_RANGE },
  { model: 'Tucson', make: 'Hyundai', years: YEAR_RANGE },
  { model: 'Santa Fe', make: 'Hyundai', years: YEAR_RANGE },
  { model: 'Kona', make: 'Hyundai', years: YEAR_RANGE },
  { model: 'Palisade', make: 'Hyundai', years: YEAR_RANGE },
  { model: 'Venue', make: 'Hyundai', years: YEAR_RANGE },
  { model: 'Accent', make: 'Hyundai', years: YEAR_RANGE },
  { model: 'Ioniq', make: 'Hyundai', years: YEAR_RANGE },
  { model: 'Ioniq 5', make: 'Hyundai', years: YEAR_RANGE },
  { model: 'Ioniq 6', make: 'Hyundai', years: YEAR_RANGE },
  { model: 'Santa Cruz', make: 'Hyundai', years: YEAR_RANGE },

  // Kia
  { model: 'Forte', make: 'Kia', years: YEAR_RANGE },
  { model: 'K5', make: 'Kia', years: YEAR_RANGE },
  { model: 'Optima', make: 'Kia', years: YEAR_RANGE },
  { model: 'Sportage', make: 'Kia', years: YEAR_RANGE },
  { model: 'Sorento', make: 'Kia', years: YEAR_RANGE },
  { model: 'Telluride', make: 'Kia', years: YEAR_RANGE },
  { model: 'Seltos', make: 'Kia', years: YEAR_RANGE },
  { model: 'Soul', make: 'Kia', years: YEAR_RANGE },
  { model: 'Carnival', make: 'Kia', years: YEAR_RANGE },
  { model: 'Niro', make: 'Kia', years: YEAR_RANGE },
  { model: 'EV6', make: 'Kia', years: YEAR_RANGE },
  { model: 'EV9', make: 'Kia', years: YEAR_RANGE },
  { model: 'Rio', make: 'Kia', years: YEAR_RANGE },

  // Nissan
  { model: 'Altima', make: 'Nissan', years: YEAR_RANGE },
  { model: 'Sentra', make: 'Nissan', years: YEAR_RANGE },
  { model: 'Rogue', make: 'Nissan', years: YEAR_RANGE },
  { model: 'Murano', make: 'Nissan', years: YEAR_RANGE },
  { model: 'Pathfinder', make: 'Nissan', years: YEAR_RANGE },
  { model: 'Maxima', make: 'Nissan', years: YEAR_RANGE },
  { model: 'Kicks', make: 'Nissan', years: YEAR_RANGE },
  { model: 'Versa', make: 'Nissan', years: YEAR_RANGE },
  { model: 'Frontier', make: 'Nissan', years: YEAR_RANGE },
  { model: 'Titan', make: 'Nissan', years: YEAR_RANGE },
  { model: 'Armada', make: 'Nissan', years: YEAR_RANGE },
  { model: 'LEAF', make: 'Nissan', years: YEAR_RANGE },
  { model: 'Ariya', make: 'Nissan', years: YEAR_RANGE },
  { model: 'Z', make: 'Nissan', years: YEAR_RANGE },

  // Ford
  { model: 'F-150', make: 'Ford', years: YEAR_RANGE },
  { model: 'F-250', make: 'Ford', years: YEAR_RANGE },
  { model: 'F-350', make: 'Ford', years: YEAR_RANGE },
  { model: 'Fusion', make: 'Ford', years: YEAR_RANGE },
  { model: 'Escape', make: 'Ford', years: YEAR_RANGE },
  { model: 'Explorer', make: 'Ford', years: YEAR_RANGE },
  { model: 'Edge', make: 'Ford', years: YEAR_RANGE },
  { model: 'Expedition', make: 'Ford', years: YEAR_RANGE },
  { model: 'Ranger', make: 'Ford', years: YEAR_RANGE },
  { model: 'Maverick', make: 'Ford', years: YEAR_RANGE },
  { model: 'Bronco', make: 'Ford', years: YEAR_RANGE },
  { model: 'Bronco Sport', make: 'Ford', years: YEAR_RANGE },
  { model: 'Mustang', make: 'Ford', years: YEAR_RANGE },
  { model: 'Mustang Mach-E', make: 'Ford', years: YEAR_RANGE },
  { model: 'Transit', make: 'Ford', years: YEAR_RANGE },
  { model: 'Transit Connect', make: 'Ford', years: YEAR_RANGE },
  { model: 'E-Transit', make: 'Ford', years: YEAR_RANGE },
  { model: 'F-150 Lightning', make: 'Ford', years: YEAR_RANGE },

  // Chevrolet
  { model: 'Silverado', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Silverado 1500', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Silverado 2500', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Malibu', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Equinox', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Traverse', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Tahoe', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Suburban', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Colorado', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Trax', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Trailblazer', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Blazer', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Camaro', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Corvette', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Bolt EV', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Bolt EUV', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Express', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Spark', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Impala', make: 'Chevrolet', years: YEAR_RANGE },
  { model: 'Cruze', make: 'Chevrolet', years: YEAR_RANGE },

  // GMC
  { model: 'Sierra', make: 'GMC', years: YEAR_RANGE },
  { model: 'Sierra 1500', make: 'GMC', years: YEAR_RANGE },
  { model: 'Sierra 2500', make: 'GMC', years: YEAR_RANGE },
  { model: 'Terrain', make: 'GMC', years: YEAR_RANGE },
  { model: 'Acadia', make: 'GMC', years: YEAR_RANGE },
  { model: 'Yukon', make: 'GMC', years: YEAR_RANGE },
  { model: 'Canyon', make: 'GMC', years: YEAR_RANGE },
  { model: 'Hummer EV', make: 'GMC', years: YEAR_RANGE },

  // Ram
  { model: '1500', make: 'Ram', years: YEAR_RANGE },
  { model: '2500', make: 'Ram', years: YEAR_RANGE },
  { model: '3500', make: 'Ram', years: YEAR_RANGE },
  { model: 'ProMaster', make: 'Ram', years: YEAR_RANGE },
  { model: 'ProMaster City', make: 'Ram', years: YEAR_RANGE },

  // Jeep
  { model: 'Wrangler', make: 'Jeep', years: YEAR_RANGE },
  { model: 'Grand Cherokee', make: 'Jeep', years: YEAR_RANGE },
  { model: 'Cherokee', make: 'Jeep', years: YEAR_RANGE },
  { model: 'Compass', make: 'Jeep', years: YEAR_RANGE },
  { model: 'Renegade', make: 'Jeep', years: YEAR_RANGE },
  { model: 'Gladiator', make: 'Jeep', years: YEAR_RANGE },
  { model: 'Wagoneer', make: 'Jeep', years: YEAR_RANGE },
  { model: 'Grand Wagoneer', make: 'Jeep', years: YEAR_RANGE },

  // Dodge
  { model: 'Charger', make: 'Dodge', years: YEAR_RANGE },
  { model: 'Challenger', make: 'Dodge', years: YEAR_RANGE },
  { model: 'Durango', make: 'Dodge', years: YEAR_RANGE },
  { model: 'Hornet', make: 'Dodge', years: YEAR_RANGE },

  // Subaru
  { model: 'Outback', make: 'Subaru', years: YEAR_RANGE },
  { model: 'Forester', make: 'Subaru', years: YEAR_RANGE },
  { model: 'Crosstrek', make: 'Subaru', years: YEAR_RANGE },
  { model: 'Impreza', make: 'Subaru', years: YEAR_RANGE },
  { model: 'Legacy', make: 'Subaru', years: YEAR_RANGE },
  { model: 'Ascent', make: 'Subaru', years: YEAR_RANGE },
  { model: 'WRX', make: 'Subaru', years: YEAR_RANGE },
  { model: 'BRZ', make: 'Subaru', years: YEAR_RANGE },
  { model: 'Solterra', make: 'Subaru', years: YEAR_RANGE },

  // Mazda
  { model: 'Mazda3', make: 'Mazda', years: YEAR_RANGE },
  { model: 'Mazda6', make: 'Mazda', years: YEAR_RANGE },
  { model: 'CX-5', make: 'Mazda', years: YEAR_RANGE },
  { model: 'CX-9', make: 'Mazda', years: YEAR_RANGE },
  { model: 'CX-30', make: 'Mazda', years: YEAR_RANGE },
  { model: 'CX-50', make: 'Mazda', years: YEAR_RANGE },
  { model: 'CX-70', make: 'Mazda', years: YEAR_RANGE },
  { model: 'CX-90', make: 'Mazda', years: YEAR_RANGE },
  { model: 'MX-5 Miata', make: 'Mazda', years: YEAR_RANGE },

  // Volkswagen
  { model: 'Jetta', make: 'Volkswagen', years: YEAR_RANGE },
  { model: 'Passat', make: 'Volkswagen', years: YEAR_RANGE },
  { model: 'Tiguan', make: 'Volkswagen', years: YEAR_RANGE },
  { model: 'Atlas', make: 'Volkswagen', years: YEAR_RANGE },
  { model: 'Atlas Cross Sport', make: 'Volkswagen', years: YEAR_RANGE },
  { model: 'Taos', make: 'Volkswagen', years: YEAR_RANGE },
  { model: 'Golf', make: 'Volkswagen', years: YEAR_RANGE },
  { model: 'Golf GTI', make: 'Volkswagen', years: YEAR_RANGE },
  { model: 'ID.4', make: 'Volkswagen', years: YEAR_RANGE },
  { model: 'ID.Buzz', make: 'Volkswagen', years: YEAR_RANGE },
  { model: 'Arteon', make: 'Volkswagen', years: YEAR_RANGE },

  // BMW
  { model: '3 Series', make: 'BMW', years: YEAR_RANGE },
  { model: '5 Series', make: 'BMW', years: YEAR_RANGE },
  { model: 'X3', make: 'BMW', years: YEAR_RANGE },
  { model: 'X5', make: 'BMW', years: YEAR_RANGE },
  { model: 'X1', make: 'BMW', years: YEAR_RANGE },
  { model: 'X7', make: 'BMW', years: YEAR_RANGE },
  { model: '2 Series', make: 'BMW', years: YEAR_RANGE },
  { model: '4 Series', make: 'BMW', years: YEAR_RANGE },
  { model: '7 Series', make: 'BMW', years: YEAR_RANGE },
  { model: 'i4', make: 'BMW', years: YEAR_RANGE },
  { model: 'iX', make: 'BMW', years: YEAR_RANGE },

  // Mercedes-Benz
  { model: 'C-Class', make: 'Mercedes-Benz', years: YEAR_RANGE },
  { model: 'E-Class', make: 'Mercedes-Benz', years: YEAR_RANGE },
  { model: 'GLC', make: 'Mercedes-Benz', years: YEAR_RANGE },
  { model: 'GLE', make: 'Mercedes-Benz', years: YEAR_RANGE },
  { model: 'A-Class', make: 'Mercedes-Benz', years: YEAR_RANGE },
  { model: 'CLA', make: 'Mercedes-Benz', years: YEAR_RANGE },
  { model: 'GLA', make: 'Mercedes-Benz', years: YEAR_RANGE },
  { model: 'GLB', make: 'Mercedes-Benz', years: YEAR_RANGE },
  { model: 'S-Class', make: 'Mercedes-Benz', years: YEAR_RANGE },
  { model: 'EQS', make: 'Mercedes-Benz', years: YEAR_RANGE },
  { model: 'EQE', make: 'Mercedes-Benz', years: YEAR_RANGE },
  { model: 'Sprinter', make: 'Mercedes-Benz', years: YEAR_RANGE },
  { model: 'Metris', make: 'Mercedes-Benz', years: YEAR_RANGE },

  // Audi
  { model: 'A4', make: 'Audi', years: YEAR_RANGE },
  { model: 'A6', make: 'Audi', years: YEAR_RANGE },
  { model: 'Q5', make: 'Audi', years: YEAR_RANGE },
  { model: 'Q7', make: 'Audi', years: YEAR_RANGE },
  { model: 'A3', make: 'Audi', years: YEAR_RANGE },
  { model: 'Q3', make: 'Audi', years: YEAR_RANGE },
  { model: 'Q8', make: 'Audi', years: YEAR_RANGE },
  { model: 'A5', make: 'Audi', years: YEAR_RANGE },
  { model: 'e-tron', make: 'Audi', years: YEAR_RANGE },
  { model: 'e-tron GT', make: 'Audi', years: YEAR_RANGE },
  { model: 'Q4 e-tron', make: 'Audi', years: YEAR_RANGE },

  // Lexus
  { model: 'ES', make: 'Lexus', years: YEAR_RANGE },
  { model: 'RX', make: 'Lexus', years: YEAR_RANGE },
  { model: 'NX', make: 'Lexus', years: YEAR_RANGE },
  { model: 'IS', make: 'Lexus', years: YEAR_RANGE },
  { model: 'GX', make: 'Lexus', years: YEAR_RANGE },
  { model: 'UX', make: 'Lexus', years: YEAR_RANGE },
  { model: 'TX', make: 'Lexus', years: YEAR_RANGE },
  { model: 'LS', make: 'Lexus', years: YEAR_RANGE },
  { model: 'LC', make: 'Lexus', years: YEAR_RANGE },
  { model: 'LX', make: 'Lexus', years: YEAR_RANGE },
  { model: 'RZ', make: 'Lexus', years: YEAR_RANGE },

  // Acura
  { model: 'TLX', make: 'Acura', years: YEAR_RANGE },
  { model: 'MDX', make: 'Acura', years: YEAR_RANGE },
  { model: 'RDX', make: 'Acura', years: YEAR_RANGE },
  { model: 'Integra', make: 'Acura', years: YEAR_RANGE },
  { model: 'ILX', make: 'Acura', years: YEAR_RANGE },
  { model: 'ZDX', make: 'Acura', years: YEAR_RANGE },

  // Infiniti
  { model: 'Q50', make: 'Infiniti', years: YEAR_RANGE },
  { model: 'QX60', make: 'Infiniti', years: YEAR_RANGE },
  { model: 'QX80', make: 'Infiniti', years: YEAR_RANGE },
  { model: 'QX50', make: 'Infiniti', years: YEAR_RANGE },
  { model: 'QX55', make: 'Infiniti', years: YEAR_RANGE },

  // Tesla
  { model: 'Model 3', make: 'Tesla', years: YEAR_RANGE },
  { model: 'Model Y', make: 'Tesla', years: YEAR_RANGE },
  { model: 'Model S', make: 'Tesla', years: YEAR_RANGE },
  { model: 'Model X', make: 'Tesla', years: YEAR_RANGE },
  { model: 'Cybertruck', make: 'Tesla', years: YEAR_RANGE },

  // Rivian
  { model: 'R1T', make: 'Rivian', years: YEAR_RANGE },
  { model: 'R1S', make: 'Rivian', years: YEAR_RANGE },

  // Lucid
  { model: 'Air', make: 'Lucid', years: YEAR_RANGE },

  // Polestar
  { model: 'Polestar 2', make: 'Polestar', years: YEAR_RANGE },
  { model: 'Polestar 3', make: 'Polestar', years: YEAR_RANGE },

  // Volvo
  { model: 'XC90', make: 'Volvo', years: YEAR_RANGE },
  { model: 'XC60', make: 'Volvo', years: YEAR_RANGE },
  { model: 'XC40', make: 'Volvo', years: YEAR_RANGE },
  { model: 'S60', make: 'Volvo', years: YEAR_RANGE },
  { model: 'S90', make: 'Volvo', years: YEAR_RANGE },
  { model: 'V60', make: 'Volvo', years: YEAR_RANGE },
  { model: 'V90', make: 'Volvo', years: YEAR_RANGE },
  { model: 'C40 Recharge', make: 'Volvo', years: YEAR_RANGE },
  { model: 'EX90', make: 'Volvo', years: YEAR_RANGE },

  // Genesis
  { model: 'G70', make: 'Genesis', years: YEAR_RANGE },
  { model: 'G80', make: 'Genesis', years: YEAR_RANGE },
  { model: 'G90', make: 'Genesis', years: YEAR_RANGE },
  { model: 'GV70', make: 'Genesis', years: YEAR_RANGE },
  { model: 'GV80', make: 'Genesis', years: YEAR_RANGE },
  { model: 'GV60', make: 'Genesis', years: YEAR_RANGE },

  // Buick
  { model: 'Enclave', make: 'Buick', years: YEAR_RANGE },
  { model: 'Encore', make: 'Buick', years: YEAR_RANGE },
  { model: 'Encore GX', make: 'Buick', years: YEAR_RANGE },
  { model: 'Envision', make: 'Buick', years: YEAR_RANGE },

  // Cadillac
  { model: 'Escalade', make: 'Cadillac', years: YEAR_RANGE },
  { model: 'XT5', make: 'Cadillac', years: YEAR_RANGE },
  { model: 'XT4', make: 'Cadillac', years: YEAR_RANGE },
  { model: 'XT6', make: 'Cadillac', years: YEAR_RANGE },
  { model: 'CT4', make: 'Cadillac', years: YEAR_RANGE },
  { model: 'CT5', make: 'Cadillac', years: YEAR_RANGE },
  { model: 'Lyriq', make: 'Cadillac', years: YEAR_RANGE },

  // Lincoln
  { model: 'Navigator', make: 'Lincoln', years: YEAR_RANGE },
  { model: 'Aviator', make: 'Lincoln', years: YEAR_RANGE },
  { model: 'Nautilus', make: 'Lincoln', years: YEAR_RANGE },
  { model: 'Corsair', make: 'Lincoln', years: YEAR_RANGE },

  // Chrysler
  { model: 'Pacifica', make: 'Chrysler', years: YEAR_RANGE },
  { model: '300', make: 'Chrysler', years: YEAR_RANGE },

  // Mitsubishi
  { model: 'Outlander', make: 'Mitsubishi', years: YEAR_RANGE },
  { model: 'Outlander Sport', make: 'Mitsubishi', years: YEAR_RANGE },
  { model: 'Eclipse Cross', make: 'Mitsubishi', years: YEAR_RANGE },
  { model: 'Mirage', make: 'Mitsubishi', years: YEAR_RANGE },

  // Mini
  { model: 'Cooper', make: 'Mini', years: YEAR_RANGE },
  { model: 'Countryman', make: 'Mini', years: YEAR_RANGE },
  { model: 'Clubman', make: 'Mini', years: YEAR_RANGE },
];

// Get all unique makes
export const VEHICLE_MAKES = [...new Set(VEHICLE_DATABASE.map((v) => v.make))].sort();

// Get all models sorted alphabetically
export const ALL_MODELS = VEHICLE_DATABASE.map((v) => v.model).sort();

// Get all unique model names for dropdown
export const UNIQUE_MODELS = [...new Set(VEHICLE_DATABASE.map((v) => v.model))].sort();

/**
 * Get the make for a given model
 */
export function getMakeFromModel(model: string): string | null {
  const vehicle = VEHICLE_DATABASE.find(
    (v) => v.model.toLowerCase() === model.toLowerCase()
  );
  return vehicle?.make || null;
}

/**
 * Get all models for a given make
 */
export function getModelsForMake(make: string): string[] {
  return VEHICLE_DATABASE
    .filter((v) => v.make.toLowerCase() === make.toLowerCase())
    .map((v) => v.model)
    .sort();
}

/**
 * Get valid years for a model
 */
export function getYearsForModel(model: string): number[] {
  const vehicle = VEHICLE_DATABASE.find(
    (v) => v.model.toLowerCase() === model.toLowerCase()
  );
  return vehicle?.years || YEAR_RANGE;
}

/**
 * Check if a model exists in the database
 */
export function isValidModel(model: string): boolean {
  return VEHICLE_DATABASE.some(
    (v) => v.model.toLowerCase() === model.toLowerCase()
  );
}

/**
 * Search models by query string
 */
export function searchModels(query: string): VehicleModel[] {
  const lowerQuery = query.toLowerCase();
  return VEHICLE_DATABASE.filter(
    (v) =>
      v.model.toLowerCase().includes(lowerQuery) ||
      v.make.toLowerCase().includes(lowerQuery)
  ).slice(0, 20); // Limit results
}
